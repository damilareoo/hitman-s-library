# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every request cheap enough for the free Workers plan, make every route error-free, and set the security baseline Pro will be built on.

**Architecture:** The edge cache in `cloudflare-worker.ts` already answers repeat reads (shipped in `bef95fb`). This plan cuts the cost of what's left:
- **Uncached reads:** the two hottest read APIs move onto a "fast path" in the Worker entry. It talks to Neon directly, without loading Next.js.
- **Page weight:** the heavy pages shed what they don't need to render.
- **Security headers:** added once in the Worker entry, so cached and uncached responses carry the same set.

Everything is measured before and after with one repeatable script.

**Tech Stack:** Next.js 16 on Cloudflare Workers (OpenNext), `@neondatabase/serverless`, bun (runtime + `bun test`), Playwright (devDependency, audit only).

**Spec:** `docs/superpowers/specs/2026-11-12-pro-program-design.md` (sections 5.1, 6.1–6.3, 9)

## Global Constraints

- $0 fixed cost. Free Workers plan. No new runtime dependencies (devDependencies allowed).
- Free-plan ceilings to stay inside: 10 ms CPU per request (aim for warm uncached reads ≤ 15 ms, and cold starts on cached routes ≤ 10 ms); 100k Worker requests/day; 3 MB compressed Worker.
- Performance targets from spec §5.1: LCP < 2.0 s on mid-tier 4G mobile for `/`, CLS < 0.05, INP < 200 ms.
- Error-free from spec §6.2: zero console errors or warnings on every route, in light and dark, at desktop and 390 px; no unhandled rejections; API errors are JSON, never stack traces.
- Never change live URLs. Every API response shape stays byte-compatible for existing clients.
- Every shipped change gets a `data/changelog.ts` entry (prepend). Copy is short and plain. No confidential details in it.
- README updated on deploy. No emojis in README.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Deploy with `bun run deploy` from this worktree. `.env.local` must contain `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, or analytics silently turn off.

## Review Focus

1. **A deploy while visitors have the page open:** cached HTML for the old version must never reference missing chunks. The cache key already includes the version id; the fast path must keep that.
2. **Fast-path vs Next response drift:** for the same id and query, `/api/design/:id` and `/api/design/filter-advanced` must return identical JSON whichever path served them. Test 3.4 pins this against production data.
3. **Bad input on public read APIs:** `/api/design/12abc`, a negative or 10,000 `limit`, a huge `offset`, unknown sort values. Expected: 400 JSON or clamped values, never 500 and never a stack trace. Tests in Task 3.
4. **CSP breaking a live feature:** the live preview iframe (preview host), PostHog, Google Fonts, Blob images and motion clips must all keep working. The audit in Task 6 runs with CSP in report-only mode first, and fails on any violation before CSP is enforced.
5. **Write endpoints without a guard:** any non-GET handler without admin auth, the cron secret or a rate limit. The static check in Task 5 fails the build on one.

---

### Task 1: Check harness and baseline measurement

**Files:**
- Modify: `package.json` (scripts, devDependencies)
- Create: `scripts/measure-cpu.mjs`
- Create: `docs/perf/2026-11-12-baseline.md`

**Interfaces:**
- Produces: `bun run check` (runs `tsc --noEmit` then `bun test`); `node scripts/measure-cpu.mjs [--base URL] [--out file.md]` prints a markdown table of route, cache state, cpu ms and wall ms.

- [ ] **Step 1:** Add scripts `"test": "bun test"` and `"check": "tsc --noEmit && bun test"`. Replace `"lint": "next lint"`, which no longer exists in Next 16, with `"lint": "tsc --noEmit"`. Add devDependency `playwright@1.56.x`.
- [ ] **Step 2:** Write `scripts/measure-cpu.mjs`. It starts `wrangler tail hitmans-library --format json` as a child process, waits 8 s, then requests each route twice: once with a cache-busting `?__m=<timestamp>` (uncached) and once plain (cached). It waits 6 s, stops the tail, parses the events (concatenated JSON objects, decoded with a streaming `JSON.parse` over balanced braces) and prints the table.
  - Routes: `/`, `/about`, `/changelog`, `/submit`, `/robots.txt`, `/sitemap.xml`, `/api/design/798`, `/api/design/filter-advanced?limit=48&offset=0&sort=newest`, `/api/design/browse-index`, `/api/design/categories`, `/api/changelog`.
- [ ] **Step 3:** Run `node scripts/measure-cpu.mjs --out docs/perf/2026-11-12-baseline.md`. Expected: a table with 22 rows. Commit it with the scripts.

### Task 2: Fast-path routing in the Worker entry

**Files:**
- Create: `lib/edge/fast-path.ts`
- Create: `lib/edge/fast-path.test.ts`
- Modify: `cloudflare-worker.ts`

**Interfaces:**
- Produces: `matchFastPath(method: string, url: URL): FastRoute | null` where `type FastRoute = { kind: 'site', id: number } | { kind: 'list', query: ListQuery }`. Produces `parseListQuery(params: URLSearchParams): ListQuery | { error: string }`, with `ListQuery` matching the existing `filter-advanced` parameters.

- [ ] **Step 1: Write the failing tests** in `lib/edge/fast-path.test.ts`:
  - `matchFastPath('GET', new URL('https://x/api/design/798'))` → `{ kind: 'site', id: 798 }`
  - `matchFastPath('GET', new URL('https://x/api/design/12abc'))` → `null`. Next answers it with 400, unchanged.
  - `matchFastPath('PATCH', …/api/design/798)` → `null`
  - `matchFastPath('GET', …/api/design/798/history)` → `null`
  - `matchFastPath('GET', …/api/design/filter-advanced?limit=48&offset=0&sort=newest)` → `kind: 'list'`, `limit` 48, `offset` 0
  - `parseListQuery` clamps `limit` to 1–100, treats a negative `offset` as 0, rejects `offset` > 100000 with `{ error }`, and maps an unknown sort to the route's existing default.
- [ ] **Step 2:** Run `bun test lib/edge/fast-path.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement both functions. Read `app/api/design/filter-advanced/route.ts` for the exact parameter names and defaults, and copy those rules rather than inventing new ones.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3: Fast-path handlers sharing one query module with the Next routes

**Files:**
- Create: `lib/read/site-detail.ts`, `lib/read/site-list.ts`
- Create: `lib/read/site-detail.test.ts`
- Modify: `app/api/design/[id]/route.ts` (GET calls `getSiteDetail`), `app/api/design/filter-advanced/route.ts` (calls `listSites`), `cloudflare-worker.ts`
- Create: `scripts/compare-fast-path.mjs`

**Interfaces:**
- Consumes: `matchFastPath`, `parseListQuery` (Task 2).
- Produces:
  - `getSiteDetail(sql: NeonQueryFunction<false,false>, id: number): Promise<SiteDetail | null>`, the exact JSON body the GET route returns today
  - `listSites(sql, q: ListQuery): Promise<ListResponse>`, the exact body `filter-advanced` returns today

- [ ] **Step 1: Write the failing test** `site-detail.test.ts` with a fake `sql` tagged function that returns fixtures:
  - When the current-extraction snapshot has an empty palette, the legacy colours are kept.
  - When it has colours, they win.
  - `screenshot_url` is upgraded to https.
  - A missing source returns `null`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Move the body of today's GET handler into `getSiteDetail`, with no behaviour change. The route becomes 400/404/500 handling around it. Do the same for `listSites`. Anything that uses `unstable_cache` or `next/cache` stays in the Next route only, because the fast path has the edge cache instead.
- [ ] **Step 4:** In `cloudflare-worker.ts`, when `matchFastPath` returns a route and the request is cacheable, answer it with `neon(env.DATABASE_URL)` and the shared functions, without calling `openNext.fetch`:
  - The response sets the same `cache-control` the Next route sets.
  - Errors return `{ error: 'Internal error' }` with status 500.
  - A `{ error }` from `parseListQuery` returns status 400.
  - Fast-path responses go through the same edge-cache store and serve logic.
- [ ] **Step 5:** Run `bun test`. Expected: PASS.
- [ ] **Step 6:** Write `scripts/compare-fast-path.mjs`. For 20 ids taken from the newest list and 6 list queries (different sort, offset and category), it fetches local `wrangler dev`, with the fast path on and with `?__nofast=1` (a bypass honoured only when `env.DEV_BYPASS === '1'`), and deep-compares the JSON. Expected output: `26/26 identical`.
- [ ] **Step 7:** Commit.

### Task 4: Lighter page renders

**Files:**
- Modify: `app/changelog/page.tsx` and the client components it passes release data into; `app/page.tsx` / `components/gallery.tsx` only if Step 1 finds index data in the HTML
- Create: `scripts/page-weight.mjs`

**Interfaces:**
- Produces: `node scripts/page-weight.mjs [base]` prints the HTML bytes and inline-script bytes for `/`, `/about`, `/changelog` and `/submit`.

- [ ] **Step 1:** Write `scripts/page-weight.mjs` and record the baseline. Today in production: `/changelog` is 975,723 bytes (509,844 of them inline script), and `/` is 385,593 bytes (117,102 inline script).
- [ ] **Step 2: `/changelog`.** Find each client component that receives whole releases or the site history as props. That data is serialised twice, once as HTML and again as the RSC payload. Render the release list as server components, and pass client components only what they need, such as the month navigation's `{id, label, year, releases: {index,date,title}[]}` from `groupByMonth`. Target: under 250 KB total, with inline script under 60 KB. The visible page must not change.
- [ ] **Step 3: `/`.** Find what makes up the roughly 268 KB of markup beyond the scripts: per-card markup, inline SVG, or repeated class strings. Remove anything not visible above the fold or not needed for first paint, leaving it to load on interaction. Target: under 200 KB. The visible page must not change.
- [ ] **Step 4:** Re-run `page-weight.mjs` against local `wrangler dev`. Expected: both targets met. Also run the Task 6 audit on these routes: zero errors.
- [ ] **Step 5:** Commit.

### Task 5: Write-endpoint guards and input hardening

**Files:**
- Create: `scripts/check-route-guards.ts`, `scripts/check-route-guards.test.ts`
- Modify: `app/api/taste/subscribe/route.ts`, `app/api/taste/unsubscribe/route.ts` (add the existing `lib/rate-limit.ts` limiter), and any route the check flags
- Modify: `package.json` (`check` also runs the guard check)

**Interfaces:**
- Produces: `findUnguardedHandlers(files: {path: string, source: string}[]): {path: string, method: string}[]`. A non-GET exported handler counts as guarded when its source references `requireAdmin(`, `CRON_SECRET`, or the rate limiter's exported function.

- [ ] **Step 1: Write the failing test:**
  - A POST without a guard is reported.
  - A POST with `requireAdmin(` is not reported.
  - GET handlers are never reported.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement it, plus a CLI that walks `app/api/**/route.ts`, prints any unguarded handlers and exits 1 if there are any.
- [ ] **Step 4:** Run the CLI. Expected today: it reports at least `api/taste/subscribe` POST. Add the rate limiter to every flagged route, with the same window and limit as `api/request`. Re-run. Expected: `0 unguarded handlers`.
- [ ] **Step 5:** Numeric ids: every `parseInt(rawId, 10)` in `app/api/**` must reject partial parses (`'12abc'`). Use `/^\d+$/.test(rawId)` before parsing, and return 400 JSON. Add a test for a small `parseId(raw: string): number | null` helper in `lib/parse-id.ts`, and use it everywhere.
- [ ] **Step 6:** Extend `findUnguardedHandlers` with a second report: any `sql.unsafe(` call, or `sql(` called with a string built by concatenation or a template literal, in `app/` or `lib/`. None exist today, so the check keeps it that way. Test it with one positive fixture and one negative fixture.
- [ ] **Step 7:** Commit.

### Task 6: Security headers and the zero-error audit

**Files:**
- Create: `lib/edge/security-headers.ts`, `lib/edge/security-headers.test.ts`
- Modify: `cloudflare-worker.ts` (apply headers to every response, cached or not)
- Create: `scripts/audit-errors.mjs`

**Interfaces:**
- Produces: `securityHeaders(opts: { enforceCsp: boolean, previewOrigin: string }): Record<string,string>` and `withSecurityHeaders(res: Response, headers): Response`. `node scripts/audit-errors.mjs [base]` exits 1 on any console error or warning, page error, failed same-origin request, or CSP violation.

- [ ] **Step 1: Write the failing test.** `securityHeaders` returns:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `X-Frame-Options: DENY`

  CSP sits under `Content-Security-Policy-Report-Only` when `enforceCsp` is false, and under `Content-Security-Policy` when it's true. The CSP includes `frame-ancestors 'none'`, `frame-src` for the preview origin, `connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com`, and `img-src 'self' data: blob: https:`.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement it. Run it. Expected: PASS.
- [ ] **Step 3:** Requests on the preview host (`preview.` prefix) skip `X-Frame-Options` and `frame-ancestors`, because the main site frames them. Add a test for that, then implement it.
- [ ] **Step 4:** Write `audit-errors.mjs` with Playwright (`channel: 'chrome'`). It runs at 1440×900 and 390×844, in light and dark (`colorScheme`), on `/`, `/about`, `/changelog`, `/submit`, `/?site=798` (opens the panel and visits each tab), `/?color=%232f4fd8` and `/?q=studio`. It also clicks the first card and closes it.
- [ ] **Step 4b:** On `/` at 390×844, with CDP network throttling (Fast 4G: 150 ms RTT, 1.6 Mbps down) and 4× CPU throttling, record LCP and CLS through a `PerformanceObserver`. Print both. Report a finding when LCP is ≥ 2000 ms or CLS is ≥ 0.05, matching the targets in spec §5.1.
- [ ] **Step 5:** Run the audit against local `wrangler dev` with `enforceCsp: false`. Fix every finding, including CSP report-only violations, by adjusting the policy (never by switching it off). Expected: `0 findings` in all 28 combinations (7 routes × 2 sizes × 2 themes).
- [ ] **Step 6:** Set `enforceCsp: true`. Re-run. Expected: `0 findings`. Commit.

### Task 7: Bundle hygiene

**Files:**
- Modify: `next.config.mjs`
- Create: `scripts/check-bundle.mjs`

- [ ] **Step 1:** Move `initOpenNextCloudflareForDev()` under `process.env.NODE_ENV === 'development'`, as commit `bc1591c` did. It stops a Miniflare instance starting during `next build`.
- [ ] **Step 2:** Write `scripts/check-bundle.mjs`. After `wrangler deploy --dry-run --outdir <tmp>`, it fails if:
  - the compressed size is over 2,000 KiB
  - `worker.js` contains `posthog-js`, `onnxruntime`, `@xenova/transformers`, `@sparticuz/chromium`, or a `puppeteer` launch path
  - Baseline after `bef95fb`: 1,785 KiB.
- [ ] **Step 3:** Delete `vercel.json`. Its crons no longer run anywhere. The digest moved to `cron/wrangler.toml`, and the backfill was left out on purpose, as `cron/worker.ts` explains. Note this in the README.
- [ ] **Step 4:** Run the check. Expected: PASS. Commit.

### Task 8: Ship and measure

**Files:**
- Modify: `data/changelog.ts`, `README.md`, `docs/perf/2026-11-12-after.md` (create)

- [ ] **Step 1:** Run `bun run check`, `node scripts/check-route-guards.ts`, `node scripts/check-bundle.mjs`, and `node scripts/audit-errors.mjs http://localhost:8799`. Expected: all pass.
- [ ] **Step 2:** Prepend one changelog release with plain lines: faster loads, lighter changelog page, safer forms. Update README with the fast path, security headers and new scripts.
- [ ] **Step 3:** Commit, push to `main`, and run `bun run deploy`.
- [ ] **Step 4:** Run `node scripts/audit-errors.mjs https://hitmanslibrary.xyz`. Expected: `0 findings`. Run `node scripts/measure-cpu.mjs --out docs/perf/2026-11-12-after.md`. Expected:
  - cached routes ≤ 10 ms CPU
  - the fast-path routes ≤ 15 ms warm when uncached
- [ ] **Step 5:** Read 3 days of Worker analytics (the GraphQL `workersInvocationsAdaptive` query used in the baseline). Expected: `exceededResources` near zero. Commit the after-numbers.
