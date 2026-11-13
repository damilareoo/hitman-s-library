# Pro Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The style kit (3 a month free with an account, unlimited for Pro), deeper search for Pro, and review priority for Pro submissions, all gated on the server.

**Architecture:** Pages stay anonymous and edge-cached. Entitlement and the meter live in Neon and travel only on uncached, session-checked endpoints (`/api/me`, `/api/kit/:id`, `/api/search/pro`). The kit's text files are built from database rows by pure template functions. The browser zips them with the public captures, because building a zip in the Worker would break the 10 ms CPU budget.

**Tech Stack:** Next.js 16 on Cloudflare Workers (OpenNext, free plan), Neon (`@neondatabase/serverless`), bun test, canvas 2D in the browser.

**Spec:** `docs/superpowers/specs/2026-11-12-pro-program-design.md` (§5.3, §6, §9)

## Global Constraints

- $0 fixed cost. No new paid services, no LLM, no heavy Worker dependencies.
- All gating server-side; the client only reflects it. Never trust a client flag.
- Nothing free today becomes paid: CSS, Tailwind and tokens.json copies in the panel stay free and anonymous.
- A kit counts once per site per calendar month (UTC). Re-downloading the same site that month is free. Meter is per account only; anonymous visitors are asked to sign in.
- Pro and meter state never render into cached HTML; `/api/kit` and `/api/search` join `NEVER` in `lib/edge/edge-cache.ts`.
- Writes go through `sameOriginWrite`; every handler passes `scripts/check-route-guards.ts`.
- No emails or user ids in PostHog events.
- Worker gzip stays under 2000 KiB (`scripts/check-bundle.mjs`).
- Changelog line (8–16 words) for every shipped change; copy short and plain.
- Visual changes (Tasks 7 and 8 UI) wait for the owner's answers to the design questions; mockups first.

## Review Focus

1. Two kit downloads fired at once by a user on 2 of 3: exactly one succeeds. Covered in Task 2 (row lock).
2. A month rollover between the meter read and the claim: the claim uses the database's month, never the client's.
3. A Pro subscription that lapsed (`status` past_due, canceled, or `current_period_end` in the past) loses Pro immediately. Covered in Task 2.
4. A site with no colours or no fonts still produces a valid kit, with the empty sections omitted rather than broken. Covered in Task 3.
5. A capture URL that 404s or is blocked by CORS still produces a zip with the text files and a note. Covered in Task 6.

---

### Task 1: Migration 027 (additive)

**Files:**
- Create: `scripts/027-pro.sql`

**Interfaces:**
- Produces tables:
  - `subscriptions(user_id int PRIMARY KEY REFERENCES users ON DELETE CASCADE, status text NOT NULL, plan text NOT NULL, interval text NOT NULL, current_period_end timestamptz, provider text NOT NULL, provider_customer_id text, updated_at timestamptz NOT NULL DEFAULT now())`
  - `kit_downloads(user_id int REFERENCES users ON DELETE CASCADE, source_id int NOT NULL, month date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, source_id, month))`
  - `design_requests.user_id int NULL REFERENCES users ON DELETE SET NULL`

- [ ] **Step 1:** Write the SQL with `IF NOT EXISTS` everywhere. No DROP, no data change.
- [ ] **Step 2:** Apply with `node scripts/apply-sql.mjs scripts/027-pro.sql`. Expected: three statements OK. Re-run. Expected: still OK (idempotent).
- [ ] **Step 3:** Add `/api/me` export and delete coverage: `DELETE /api/me` already cascades through `users`; export adds `subscriptions` and `kit_downloads`. Extend the existing export test with both keys.
- [ ] **Step 4:** Commit.

### Task 2: Entitlement and the meter

**Files:**
- Create: `lib/pro/entitlement.ts`, `lib/pro/entitlement.test.ts`

**Interfaces:**
- Produces:
  - `KIT_LIMIT = 3`
  - `isPro(sub: { status: string; current_period_end: Date | null } | null, now: Date): boolean`. True only for `active`/`trialing` with a period end in the future, or null period end on `active`.
  - `getEntitlement(userId: number, deps?): Promise<{ pro: boolean; kitsUsed: number; kitsLimit: number }>`
  - `claimKit(userId: number, sourceId: number, deps?): Promise<{ ok: true; counted: boolean; kitsUsed: number } | { ok: false; reason: 'limit'; kitsUsed: number }>`
- `deps` follows the `SiteDetailDeps` pattern: an injectable `sql` so tests use a fake.

- [ ] **Step 1: Failing tests:**
  - `isPro` false for `canceled`, `past_due`, and `active` with a past period end; true for `active` with a future end.
  - `claimKit` on 0 used → `{ok:true, counted:true, kitsUsed:1}`.
  - Same site again the same month → `{ok:true, counted:false, kitsUsed:1}`.
  - At 3 used, a new site → `{ok:false, reason:'limit', kitsUsed:3}`.
  - At 3 used, an already-claimed site → `{ok:true, counted:false}`.
  - Pro at 40 used → `{ok:true}`.
- [ ] **Step 2:** Run `bun test lib/pro`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement `claimKit` as one statement.**
  - A CTE first locks the user row (`SELECT id FROM users WHERE id = $1 FOR UPDATE`), so parallel claims serialize.
  - It reads the month as `date_trunc('month', now() AT TIME ZONE 'utc')::date`.
  - It inserts `ON CONFLICT DO NOTHING` only when the site is already claimed, the count is under `KIT_LIMIT`, or the user is Pro.
  - It returns whether a row was inserted, whether one existed, and the count.
  - The Pro check in SQL mirrors `isPro`.
- [ ] **Step 4:** Run `bun test lib/pro`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3: Kit builders (pure)

**Files:**
- Create: `lib/kit/design-md.ts`, `lib/kit/figma-variables.ts`, `lib/kit/kit.test.ts`

**Interfaces:**
- Consumes: `SiteDetail` from `lib/read/site-detail.ts`; `tokenColors`, `tokenFonts` and `buildCssVars`/`buildTailwindTheme`/`buildTokensJson` from `lib/theme-tokens.ts`. The kit reuses the free formats verbatim.
- Produces: `buildKitFiles(site: SiteDetail): Array<{ name: string; content: string }>`. The files are:
  - `DESIGN.md`
  - `figma-variables.json`
  - `theme.css`
  - `tailwind.css`
  - `tokens.json`

**Content:**
- **`DESIGN.md`:**
  - Title and source URL.
  - Palette table with token name, hex, OKLCH, area share as a percent, and a role (`background` = the largest-area light colour, `text` = the darkest, `accent` = the highest-chroma colour, the rest `support`).
  - Fonts with role, weight, and source link.
  - Type scale from `sample_size_px`/`sample_line_height` where present.
  - A one-line usage note for agents.
- **`figma-variables.json`:** W3C design-tokens (DTCG) format, `$type: "color"` with sRGB hex `$value`, and `$type: "fontFamily"`. This is the format Figma's variable import reads.

- [ ] **Step 1: Failing tests:**
  - A fixture site with 3 colours and 2 fonts produces 5 files with those names.
  - `DESIGN.md` contains the source URL and each hex.
  - The role of the largest light colour is `background`.
  - `figma-variables.json` parses, and `color.brand-1.$value` matches `^#[0-9a-f]{6}$`.
  - A site with no fonts has no "Type" section and no `font` group.
  - A site with no colours and no fonts returns `DESIGN.md` only.
  - Markdown-significant characters in the title (`|`, `*`) are escaped in tables.
- [ ] **Step 2:** Run `bun test lib/kit`. Expected: FAIL.
- [ ] **Step 3:** Implement. String templates only, no dependencies.
- [ ] **Step 4:** Run `bun test lib/kit`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 4: `POST /api/kit/[id]`

**Files:**
- Create: `app/api/kit/[id]/route.ts`, `app/api/kit/kit-route.test.ts`
- Modify: `lib/edge/edge-cache.ts` (`NEVER` gains `/api/kit` and `/api/search`)

**Interfaces:**
- Consumes: `currentUser`, `sameOriginWrite`, `problem`, `renewedCookies` (`lib/auth/request.ts`); `parseId`; `getSiteDetail`; `claimKit`; `buildKitFiles`.
- Produces responses:
  - 200 `{ files: {name, content}[], captures: {name: 'desktop.png'|'mobile.png', url}[], meter: { pro, kitsUsed, kitsLimit } }`
  - 401 `{error:'signed-out'}`
  - 402 `{error:'limit', meter}`
  - 404 `{error:'not-found'}`
  - 403 for a cross-site request

- [ ] **Step 1: Failing tests** (fakes as in the accounts route tests):
  - signed out → 401
  - bad id → 404
  - over the limit → 402 with meter
  - success → 200 with 5 files and only `https:` capture URLs
  - the response has `Cache-Control: private, no-store`
  - claiming happens only after the site exists, so a 404 doesn't burn a kit
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Order: origin check, session, id, site, claim, build.
- [ ] **Step 4:** Run `bun test` and `bun scripts/check-route-guards.ts`. Expected: all pass, 0 unguarded.
- [ ] **Step 5:** Commit.

### Task 5: Meter on `/api/me`

**Files:**
- Modify: `app/api/me/route.ts`, `lib/account-client.ts`

**Interfaces:**
- Produces: `/api/me` adds `pro: boolean`, `kits: { used: number; limit: number }`, and `useAccount()` exposes them. A new `KITS_EVENT` re-fetches `/api/me` after a kit download.

- [ ] **Step 1:** Write a failing test: `/api/me` for a user with 2 kits this month returns `kits.used === 2` and `pro === false`.
- [ ] **Step 2:** Implement with `getEntitlement`. Run the tests. Expected: PASS.
- [ ] **Step 3:** Commit.

### Task 6: Zip in the browser

**Files:**
- Create: `lib/kit/zip.ts`, `lib/kit/zip.test.ts`, `lib/kit/download-kit.ts`

**Interfaces:**
- Produces:
  - `crc32(bytes: Uint8Array): number`
  - `zipStore(entries: { name: string; data: Uint8Array }[]): Uint8Array`. STORE method only, so there's no compression and no dependency.
  - `downloadKit(id: number, title: string): Promise<'ok' | 'signed-out' | 'limit' | 'failed'>`. It calls the route, fetches each capture (skipping failures and adding `captures-missing.txt` naming them), zips, saves as `kit-<slug>.zip`, and dispatches `KITS_EVENT`.

- [ ] **Step 1: Failing tests:**
  - `crc32` of `"123456789"` is `0xCBF43926`.
  - A zip of two entries passes `unzip -t` (spawned from the test on a temp file).
  - Entry names survive a round trip.
- [ ] **Step 2:** Run `bun test lib/kit/zip.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement local file headers, the central directory, and the end record.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 7: Style kit in the site panel (design-gated)

**Files:**
- Create: `components/kit-button.tsx`
- Modify: `components/site-detail-panel.tsx` (next to `ThemeExport`)

Before building, ask the owner:
1. Where the kit sits (footer stub, or its own row).
2. How the meter reads.
3. What a signed-out visitor sees.
4. What the limit state says.

Mockups come first.

**States:**
- **Signed out:** the kit offers a free sign-in (`openSignIn('join')`).
- **Free:** shows the meter, e.g. "2 of 3 this month".
- **Already taken this month:** says it's free to download again.
- **Limit:** a quiet line naming the reset date, plus the Pro mention.
- **Pro:** no meter.
- **Failure:** plain text.

No pop-ups, no blur, no countdowns (anti-goals).

- [ ] **Step 1:** Ask the questions and get answers. Then make mockups and get them approved.
- [ ] **Step 2:** Build. Screenshot each state in light and dark, at desktop and 390 px. Run `node scripts/audit-errors.mjs http://localhost:8799`. Expected: 0 errors.
- [ ] **Step 3:** Add the changelog line and commit.

### Task 8: Deeper search (Pro)

**Files:**
- Create: `app/api/search/pro/route.ts`, `lib/search/palette-match.ts`, `lib/search/palette-match.test.ts`, `lib/palette-client.ts`
- Modify: the gallery filter UI (design-gated, same questions-first rule as Task 7)

**Interfaces:**
- **`GET /api/search/pro`**
  - Parameters: `palette` (up to 6 hex), `font` (family substring), `contrast` (`AA`|`AAA`), `limit`, `offset`.
  - Returns the same `{designs, pagination}` shape as `filter-advanced`, so the grid renders it unchanged.
  - 401 when signed out, 402 `{error:'pro'}` when not Pro, and `private, no-store`.
- **Palette match:** the ranking runs in Postgres (nearest `design_colors` by OKLCH distance per query colour, summed), so Worker CPU stays flat. `lib/search/palette-match.ts` builds the parameterised SQL and is unit-tested on the SQL text and parameters.
- **Contrast:** WCAG ratio between the site's text and background roles, using the same role rules as Task 3. Shared helper: `lib/kit/roles.ts`, extracted from Task 3.
- **`lib/palette-client.ts`:** `paletteFromFile(file: File, max = 6): Promise<string[]>`. It draws the file to a 64×64 canvas in the browser and uses the same 4-bit bucketing as `lib/palette-from-image.ts`. The image never leaves the device.
- "Search by screenshot" is dropped unless `lib/similarity.ts` can rank from existing `design_embeddings` without a model call; check this and record the outcome as a ruling.

- [ ] **Step 1: Failing tests:**
  - Palette SQL caps at 6 colours and rejects non-hex.
  - Contrast AA keeps a 4.6:1 pair and drops 3:1.
  - Signed out → 401; free → 402; Pro → 200 with `private, no-store`.
- [ ] **Step 2:** Implement until green. Run `bun test` and `check-route-guards`.
- [ ] **Step 3:** UI after design answers. Screenshot, audit, add the changelog line, commit.

### Task 9: Review priority for Pro submissions

**Files:**
- Modify: `app/api/request/route.ts` (store `user_id` when signed in), `app/api/admin/requests/route.ts` (order Pro first)

- [ ] **Step 1: Failing test:** with one free and one Pro request, the admin list returns the Pro request first; an anonymous request stores a null `user_id`.
- [ ] **Step 2:** Implement: a `LEFT JOIN subscriptions` with the same active rule as `isPro`, ordered `pro DESC, request_count DESC, created_at DESC`. Run the tests. Expected: PASS.
- [ ] **Step 3:** Commit.

### Task 10: Privacy, analytics, ship

- [ ] Privacy page: add a line that kit downloads are recorded per site per month, to count the free three.
- [ ] Add PostHog events `kit_downloaded {pro: boolean}`, `kit_limit_reached`, and `pro_search_used {facets: string[]}`, with no ids or emails.
- [ ] Run `bun run check`, `node scripts/check-bundle.mjs` and the audit. All green. Add changelog lines. Push `accounts:main`, deploy, and audit production.
- [ ] Free-tier effect report:
  - About 2 small queries per kit download.
  - No new emails.
  - No R2 use yet; R2 moves before Payments, per §9.8.
