# Hitman's Library Pro — program design

Date: 2026-11-12
Owner: Damilare (decisions) · Written with Claude (brainstorm record)

## 1. Intent

Add a paid tier, **Pro**, to Hitman's Library that people feel is "a steal", without taking anything away from free users, and use the occasion to raise the whole site's bar: faster, error-free, safer, and better designed everywhere.

Why now: competitors (Mobbin, Refero, Savee) all sell AI-agent workflows (MCP, DESIGN.md) at $9–16/month. Hitman's already holds the structured data those workflows want (OKLCH palettes, fonts per site) and the owner needs income — but has **no cash**, so every part must run at **$0 fixed cost**.

Success looks like:
- People pay without hesitation, including in lower-income countries.
- The free library keeps growing (shared, bookmarked), because nothing that drives sharing goes behind a wall.
- No user data ever leaks; no errors anywhere on the site; it feels faster than today.

## 2. Goals, non-goals, anti-goals

Goals
- Pro tier with regional pricing, local-currency display, yearly emphasis.
- Accounts (only when needed), safe by construction.
- Pro features that build on data the library already has.
- A signature "You're Pro" moment (designed and approved — §8).
- Site-wide performance, correctness and design pass, including existing features.

Non-goals (for this program)
- MCP server / agent skill at launch (planned follow-up, see §6.6).
- Teams/seats, enterprise, API access.
- "Visually similar sites" as a paid AI service (only if it runs on existing embeddings at $0).
- Native apps.

Anti-goals (failure even if it "works")
- Anything currently free becomes paid (e.g. today's CSS / Tailwind / tokens.json export in the site panel stays free).
- Browsing requires an account.
- Passwords stored anywhere; card data touching our servers.
- Any recurring cost before revenue exists.
- Upsell nags: pop-ups, blocking modals, fake urgency, blurred bait.
- "AI slop" visuals: glow gradients, generic pill buttons, decorative noise.

## 3. Constraints

- **$0 fixed cost.** Only per-transaction fees are acceptable.
- **Stack (keep):** Next.js 16 on Cloudflare Workers via OpenNext (`wrangler.jsonc`), Neon Postgres (`@neondatabase/serverless`), Resend for email, PostHog for analytics, Phosphor icons (bold weight dominant), BDO Grotesk + Geist.
- **Owner is an individual in Nigeria, no registered company.** Must be paid in **USD**.
- **Repo rules (from owner):** every change gets a `data/changelog.ts` entry; never deploy without it; no confidential details in the public changelog; never change live URLs; copy is short and plain; README without emojis.
- **Workers free-plan limits are unverified.** The plan tier must be confirmed by the owner (10 ms CPU/request on free can break SSR; Browser Rendering 10 min/day on free).
- **Repo state:** working copy `~/hitman-origin` is on branch `cloudflare-browser-run` (detached HEAD at `bc1591c`, *not yet in `origin/main`*). `~/hitman's library` is an older Vercel-era checkout. Work should branch from whatever is actually deployed (confirm with owner before starting).

## 4. Decisions made (by the owner)

| Area | Decision |
|---|---|
| Price | Regional. Group A $5/mo · $48/yr; Group B ≈$3/mo · ≈$29/yr; Group C ≈$2/mo · ≈$19/yr. |
| Plans | Monthly and yearly. |
| Free taste | 3 full Pro style kits per month for signed-in free users, shown with a quiet meter (option "B"). |
| Accounts | Sign-in only when needed (saving across devices, upgrading). Email magic link **and** Google. No passwords. |
| Browsing | Always open, no sign-in. |
| Payments | Merchant of record. **Paddle** primary (only option that charges in ~30 local currencies; individuals allowed officially). **Creem** fallback if Paddle rejects an individual application. |
| Payout | USD. |
| Local currency | Every buyer sees their own currency: charged natively where Paddle supports it, honest estimate elsewhere ("≈ ₦3,100 / month · billed as $2"). |
| Hosting | Cloudflare (already moved). |
| Pro moment | "Extraction" card, approved (§8). |
| Order | Foundation → Accounts → Pro features → Payments → Design refresh. |
| Existing features | Must be redesigned to the same bar, not only new Pro surfaces. |

## 5. Program structure (five projects, in order)

Each project ships independently, behind its own changelog entry, and leaves the site better even if the next never ships.

### 5.1 Project 1 — Foundation (performance, correctness, safety baseline)

Purpose: nothing paid gets built on an unaudited base.

- **Vercel leftovers out:** remove `@vercel/analytics`, `@vercel/blob`, `vercel.json` once nothing depends on them.
- **Edge cache (done, awaiting deploy):** `cloudflare-worker.ts` serves repeat reads before Next loads. It fixed CPU-limit failures (65 killed requests in 3 days) and two page errors that fired on every load.
- **Images to Cloudflare R2:** done before Payments, not in Foundation (see §9 item 8).
- **Dead weight:** audit dependencies that look unused on Workers (`puppeteer`, `@sparticuz/chromium`, `@xenova/transformers`, `@ffmpeg-installer/ffmpeg`, `sharp`) — keep only what a runtime or script still needs; move script-only deps to devDependencies.
- **Zero-error bar:** `tsc --noEmit` clean, lint clean, no console errors or hydration warnings on every route (desktop + mobile), no failing network requests on load.
- **Performance budget (targets, builder may refine with measurements):** LCP < 2.0 s on 4G mid-tier mobile for `/`; CLS < 0.05; INP < 200 ms; JS shipped on `/` reduced vs. today's baseline (measure first, report delta). Measure before and after; record numbers in the PR.
- **Security baseline:** security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors), parameterised SQL everywhere (verify), input validation on every API route, rate limits on all write endpoints, secrets only in Worker secrets, admin auth reviewed (`lib/admin-auth.ts`).
- **Measure Workers CPU** on SSR routes; if free-plan limits are hit, report options to the owner before changing plans (cost decision is theirs).

### 5.2 Project 2 — Accounts

- Library: an open-source, self-hosted auth library storing users/sessions in Neon (e.g. Better Auth or Auth.js — builder's choice, must run on Workers). No third-party auth vendor.
- Methods: email magic link via Resend; Google OAuth.
- Sessions: httpOnly, Secure, SameSite=Lax cookies; short-lived session tokens, rotation on privilege change; CSRF protection on state-changing routes.
- Data minimisation: store only email, optional name/avatar from Google, timestamps, plan state. No IP logs beyond rate-limit windows.
- Migration on first sign-in: localStorage hearts (`hl:favorites`) and collections (`lib/collections.ts`) merge into the account; anonymous use keeps working exactly as today.
- Account page: email, plan, renewal date, member number, manage billing (link to provider portal), export my data, delete my account (hard delete + provider cancellation).
- Privacy page updated to plain language.

### 5.3 Project 3 — Pro features

All built on data already in the database. Gating is enforced **server-side**; the UI only reflects it.

1. **Full style kit** (Pro; 3 free per month with a free account): one download per site that bundles `DESIGN.md` for AI agents (palette in OKLCH + hex with roles, fonts with sources, type scale), Figma Variables JSON, the desktop and mobile captures at full resolution, and the formats that are already free (CSS, Tailwind, tokens.json). **Built from a template out of database rows. No LLM, so $0 per kit.** A kit counts once per site per calendar month: re-downloading the same site that month is free. The meter is per account only. Anonymous visitors keep today's free CSS/Tailwind/tokens.json and are asked to sign in (free) for kits. That removes the cookie meter and its 3 + 3 loophole.
2. **Collections stay free and unlimited,** exactly as today. A free account adds sync across devices. Pro adds nothing here at launch. Taking away or capping something people already use fails the anti-goal, and free sync is what makes accounts worth creating.
3. **Deeper search** (Pro): search by an uploaded palette (colours extracted in the browser, so $0), plus font and contrast filters. The existing site-type filter stays free. "Search by screenshot" ships only if it runs on the existing embeddings (`design_embeddings`, `lib/similarity.ts`) at $0; otherwise it's dropped.
4. **Full-resolution captures stay public.** Their URLs are already public and live, so nothing gets hidden. Pro's value is having them packaged inside the kit (item 1).
5. **No early-access gating.** Holding new sites back from free users breaks shared links, SEO and the edge cache, and hides content from the people who spread the library. Instead, **Pro members' submissions are reviewed first**, which costs nothing and withholds nothing. The weekly digest stays one edition for everyone.

### 5.4 Project 4 — Payments

- Provider abstraction: the app knows only `subscription { status, plan, interval, renewsAt, provider, providerCustomerId }`. One module talks to Paddle (or Creem). Webhooks are the source of truth; verify signatures; idempotent handlers; reconcile on login.
- Paddle setup: products for monthly and yearly; country-specific prices for groups B and C; local currencies enabled; Paddle-hosted overlay/inline checkout (no card fields on our domain).
- Country groups: derived from World Bank income groups + a purchasing-power index into a checked-in table (`data/price-groups.ts`), reviewed by the owner before launch. Exact group-B/C local price points: builder proposes clean numbers (e.g. ₹149, R59), owner approves.
- Local display: country from Cloudflare (`request.cf.country`); Paddle `PricePreview` for supported currencies; daily FX rate (free source, cached) for an approximate local figure elsewhere, labelled "≈ … · billed as $…".
- Group C: yearly is the default selection on the pricing page.
- Pricing page states plainly that prices adjust to where you live.
- Required for provider review: Terms, Privacy, Refund policy pages naming the owner as seller; domain verification.
- Fallback: if Paddle declines, swap to Creem behind the same abstraction (USD/EUR charges + estimates everywhere).

### 5.5 Project 5 — Design refresh (new and existing features)

- New surfaces: pricing page, upgrade flow, account page, Pro meter, style-kit download, locked/limit states, sign-in.
- Existing surfaces redesigned to the same bar: gallery/grid, site detail panel and its tabs (Preview, Mobile, Colors, Type, History), browse/index views, request-site dialog, digest signup, changelog, about, empty states.
- Language: the approved Pro card (§8) sets it — one surface, strict grid, real data as the visual, hairline structure, ticket-stub actions, Phosphor bold icons, BDO Grotesk. No glow, no gradient washes, no generic pill CTAs.
- Owner rule: **ask 3–4 design-direction questions before shipping any visual change** in this project; mockups first.

## 6. Details that matter

### 6.1 Security and privacy ("no leaks ever")
- Card data: never touches our servers (merchant of record).
- No passwords anywhere.
- Least data stored; nothing sensitive in logs or PostHog (no emails in analytics events; hash or omit identifiers).
- All gating server-side; never trust client flags.
- Webhook signatures verified; replay-protected.
- Dependency audit in CI; secrets only in Worker secrets.
- Delete-my-account and export-my-data work end to end.

### 6.2 Error-free definition
Typecheck and lint clean; zero console errors/warnings on all routes in light and dark, desktop and 390 px mobile; no unhandled promise rejections; API routes return typed errors, never stack traces.

### 6.3 Performance
Budgets in §5.1 apply to every project; new features may not regress them. Pro card animation must hold 60 fps and respect reduced motion (it does in the prototype).

### 6.4 Copy
Short and plain, one line per idea. No exclamation-mark hype, no "unlock your potential".

### 6.5 Analytics
Funnel events (pricing viewed, checkout opened, upgraded, meter hit 3/3) in PostHog without personal data.

### 6.6 Later (not this program)
MCP server + Claude skill for Pro (per-user keys, strict rate limits), share image of the Pro card, Paystack for naira bank-transfer payments in Nigeria.

## 7. Cost model (for the owner)

| Item | Fixed cost | Variable |
|---|---|---|
| Cloudflare Workers + R2 | $0 (free tier) — *confirm plan* | — |
| Neon | $0 (free tier) | — |
| Resend | $0 up to 3,000 emails/mo | — |
| Paddle | $0 | 5% + 50¢ per transaction |
| Auth | $0 (self-hosted library) | — |

Fee share: $5/mo ≈ 15%; $48/yr ≈ 6%; $2/mo ≈ 30% (why yearly leads in group C); $19/yr ≈ 8%.

## 8. The Pro moment (approved)

Prototype: `.superpowers/brainstorm/51729-1794497776/content/extraction-v9.html` (local, gitignored).

- One surface card, 420 px wide. Top: the word "Pro" built from a grid of 3 px squares on a 4 px pitch, flush-left on the same 22 px edge as the text, sized to content width.
- Each square is a real colour from a real library site. Colours come from one coherent hue range per member (production: the range of their hearted sites; fallback: newest sites).
- Intro (~2.3 s): squares gather into the word as unsorted noise, then sort in a left-to-right sweep — hue across, lightness down each column. Text fades in after.
- Lens: hover is a Sarkar-Brown fisheye over the grid with the logo's red/cyan rim; resting names the centre square (site + hex).
- Easter egg: drag a square out — it becomes a swatch, release copies its hex; the line under the headline briefly reads "■ #HEX copied from site.com"; a near-hue library colour refills the gap.
- Replay: Phosphor ArrowCounterClockwise (bold) top-right, visible on card hover (always faint on touch), replays with the same colours.
- Below: "You're Pro." / "Every colour in the library is yours to take." / single ticket-stub action "Back to the library" with Phosphor KeyReturn (bold); Enter works.
- Light and dark; reduced motion shows the final state.
- Production must fetch the member's colours server-side (no client access to other users' data) and render with canvas 2D (no libraries).

## 9. Decisions made after the builder review (owner delegated: "make the right decisions")

1. **Stay on the free Workers plan.** The edge-cache entry point (`cloudflare-worker.ts`, commit `bef95fb`) is the architecture. Every page stays anonymous and cacheable. Signed-in state, the meter and Pro status are fetched by the browser from small uncached `/api/me`-style endpoints, never rendered into cached HTML. New server code must stay light: no heavy dependencies in the Worker. The $5/month Workers Paid plan is reconsidered only once Pro revenue covers it, and only by the owner.
2. **Collections** stay free and unlimited. Free accounts get sync (see §5.3).
3. **Captures** stay public. The kit packages them (see §5.3).
4. **Seller identity** on Terms, Privacy and Refund pages: the owner's legal name (Oluwadamilare Osofisan) and the public contact hello@damilare.works. No home address is published; Paddle holds that privately in the seller account. The pages state that Paddle is the merchant of record and reseller.
5. **Digest subscribers** stay a separate list. When someone signs in with a verified email that matches a subscriber, the subscription links to the account. **Nothing is ever returned by email alone.** Any email-keyed data path (migration `023-collections-sync.sql` and anything reading it) is removed in Project 2 before accounts ship. Only verified sessions read personal data.
6. **No early access** (see §5.3). Pro gets review priority on submissions instead.
7. **Kits are template-built** and the meter is account-only (see §5.3).
8. **Images:** existing Vercel Blob URLs keep working; nothing is deleted. **Before Payments ships**, the app's image reads move to Cloudflare R2 (free tier, no bandwidth fees), because Vercel's free Hobby plan is for non-commercial use and a paid product shouldn't depend on it. Cloudflare may ask for a payment method to switch R2 on. PayPal is accepted and nothing is charged inside the free tier. The owner adds that when Project 3 starts. Old Blob URLs stay valid for outside links until their traffic is near zero.
9. **Free-tier limits to respect** (so nothing hitches): Workers 100k requests/day; Resend 100 emails/day (Google sign-in reduces magic-link volume, and sign-in emails are rate-limited per address); Neon free compute and storage; R2 10 GB. Each project reports its effect on these.

## 10. Left to the builder

- Auth library choice (must run on Workers, store in Neon).
- R2 migration mechanics.
- Exact performance tooling and measurement method.
- Anonymous-meter abuse handling (keep light).
- Group B/C local price points (propose; owner approves).
- Free-tier collections sync behaviour (propose).
- Component structure, file layout, tests.
