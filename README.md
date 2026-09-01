# Hitman's Library

A personal design library for collecting, analyzing, and browsing websites — extracting colors, typography, assets, and full-page screenshots automatically.

**Live:** (https://www.hitmanslibrary.xyz/)

---

## What it does

When you add a URL, the app:
1. Launches a headless browser and captures a full-page screenshot
2. Extracts the dominant color palette (HEX + OKLCH)
3. Identifies typography roles (heading, body, mono)
4. Collects SVG/image assets
5. Stores everything in a database for instant browsing

---

## Features

- **Card grid** — Browse all sites with staggered card entrances, filter by category
- **Detail panel** — Click any site to see preview, mobile, colors, and type in a wide inspector with a sliding tab underline
- **About** — Where the library came from, with both signatures drawn on as single-centreline SVG paths when they scroll into view (`components/signature.tsx`; art in `data/signatures.ts`)
- **Keyboard** — `/` focuses search, arrow keys cycle tabs, `Esc` closes the panel
- **Full-page preview** — Scrollable screenshot in a bounded panel with back-to-top button; Mobile is its own tab when a mobile screenshot is available
- **Color extraction** — HEX and OKLCH values, copy-paste ready, sorted by lightness
- **Typography** — Font family, role, weight, and Google Fonts link
- **Assets** — SVG logos, icons, and images
- **Re-extract** — Re-run extraction for any site from the detail panel footer
- **Theme switch** — Light/dark toggle with animated icon transition
- **Sound effects** — Subtle UI sounds, toggleable via header
- **Failure messaging** — Categorised error states (bot protection, login required, timeout, 404) with plain-language explanations
- **Extraction progress** — Animated stage labels while a URL is being processed
- **Bulk add** — Paste multiple URLs in admin and process them sequentially with live per-item status
- **Site requests** — anyone can ask for a site to be added. The form resolves the URL as it is typed: already in the library, already requested, or new with a live preview. Requests queue for review in `/admin`; approving one runs the normal extraction
- **Changelog** — `/changelog` feed showing all additions, re-extractions, and deletions
- **Color export** — Copy palette as CSS custom properties or Tailwind config snippet
- **Admin CMS** — Passcode-protected admin at `/admin` to add, search, and delete sites; bulk duplicate removal
- **Linkable views** — Category, tag, search, sort, and the open site all live in the URL, so any view can be shared and the back button steps through history

---

## Security model

The gallery is read-only, and everything that **deletes or drives a headless
browser** stays behind an admin session. Site requests are the single exception
to public writes, and are fenced accordingly.

- `POST /api/admin/auth` exchanges `ADMIN_PASSWORD` for an HMAC-signed, httpOnly
  session cookie (12 hour TTL). The passcode is compared in constant time.
- `requireAdmin()` in `lib/admin-auth.ts` guards every mutating route:
  `design/delete`, `design/extract`, `design/[id]/reextract`,
  `design/[id]/figma-capture`, `design/import-excel`, `design/capture-element`,
  and all of `api/admin/*`. Scripts can pass `Authorization: Bearer $ADMIN_PASSWORD`
  instead of a cookie.
- The guard fails closed — with no passcode configured, nothing is callable.
- `lib/safe-url.ts` protects every server-side fetch of a caller-supplied URL.
  It resolves DNS and rejects loopback, link-local (including cloud metadata),
  private, CGNAT, and multicast addresses, re-validating on each redirect hop.
  `/api/proxy` and `/api/design/extract` both run through it.

Client-side admin state (`lib/use-is-admin.ts`) only decides what to render.
It is never the thing that grants access.

### Public writes: site requests

`POST /api/request` is the only unauthenticated endpoint that writes. It inserts
a row into `design_requests` and does nothing else — no extraction, no browser,
no blob storage. Approving a request is what starts real work, and that is
behind `requireAdmin()`.

Four things fence it:

- **`assertPublicUrl`** on every submitted address, so a request cannot point at
  anything internal.
- **`checkRateLimit`** (`lib/rate-limit.ts`), 5 submissions and 40 previews per
  IP per 10 minutes. Backed by Postgres rather than process memory, because
  serverless instances share none and an in-process counter resets on every cold
  start. It runs *before* the URL is resolved, so invalid addresses cannot spend
  DNS lookups without spending quota. It fails **open** — a limiter that took the
  feature down with a database hiccup would be the worse failure.
- **A honeypot field**, off-screen and out of the tab order, answered with the
  same response a success gets so there is nothing to learn from the difference.
- **Hashed IPs only.** `ip_hash` is salted with the admin session secret; the raw
  address is never stored.

`POST /api/request/preview` makes an outbound fetch on a caller-supplied URL, so
it goes through `safeFetch`, which re-validates every redirect hop.

`POST /api/request/status` is public but only answers about URLs the caller
already named — it discloses nothing they could not learn from the request form.

---

## Rendering and SEO

`app/page.tsx` is a server component. It queries the database directly through
`lib/design-queries.ts` — the same module the API route uses — and hands the first
page of results to the client gallery, so the grid, categories, and counts ship as
HTML rather than being fetched after hydration.

- Filter state is read from `searchParams`, so a shared link server-renders the
  view it describes.
- Filtered views (`?q=`, `?category=`, `?tag=`, `?site=`) are marked `noindex` to
  avoid competing with the index page.
- `app/robots.ts`, `app/sitemap.ts`, and `app/manifest.ts` generate their routes.
- `public/og.png` is the link preview card. It is one fixed image on purpose:
  platforms scrape it once and serve it from their own cache, so it has no
  viewer and no theme to answer. The card's frame follows the phone; the picture
  inside it cannot. `public/og-light.png` is the same artwork inverted, kept for
  a light-ground surface if one ever needs it. Changing the artwork means
  changing the filename too — platforms cache the old bytes against the old URL.
- Favicons *are* theme-aware: `public/icon.svg` answers `prefers-color-scheme`,
  as does `themeColor` in `app/layout.tsx`.

---

## Extraction pipeline

`lib/browser-extraction.ts` owns the browser. The order of operations is the
load-bearing part:

1. **`gotoResilient()`** — `domcontentloaded` with a 20s ceiling, then a *soft*
   wait for network idle that resolves rather than throws. A page that rendered
   but never went quiet is a page worth extracting from. Only a navigation that
   never committed is treated as a failure.
2. **`settlePage()`** — force lazy images eager, one full autoscroll and back,
   then `document.fonts.ready`. Everything downstream reads a stationary,
   fully-loaded page.
3. **Reads** — colours, assets and typography in parallel, each caught
   individually so one failure cannot zero the other two.
4. **Captures** — desktop then mobile, last, because they scroll and resize.

Screenshot height is capped in *device* pixels, derived from the device pixel
ratio in force (2× desktop, 3× mobile). Chrome returns an empty buffer rather
than an error past roughly 16k device pixels.

Typography roles are inferred, not looked up: heading is the largest visible
text on the page whatever tag carries it, body is the family covering the most
rendered text area, and mono must prove itself by measuring `iiii` against
`WWWW` in its own face.

Everything writes `hex_value`/`oklch` for colours and role-tagged rows for
typography, because those are the only shapes the detail API reads. Do not add
a fallback that writes some other shape — that is precisely how a third of the
library ended up holding data nothing would ever render.

### Backfill

```bash
bun run scripts/backfill-extraction.ts --dry-run   # list degraded sources
bun run scripts/backfill-extraction.ts             # re-extract them
bun run scripts/backfill-extraction.ts --limit 10
bun run scripts/backfill-extraction.ts --all       # every source
```

"Degraded" is judged the way the UI judges it — a source counts as broken if it
cannot be seen, read for colour, or read for type, which is stricter than asking
whether rows exist. A missing screenshot counts: the gallery query filters on
`screenshot_url IS NOT NULL`, so a source without one is not merely missing a
picture, it is absent from the gallery altogether. Assets deliberately do not
count. A canvas game has nothing in the document to extract and would otherwise
be re-attempted nightly forever; its empty panel is recorded as a note instead.
Sources that still cannot be extracted get a written `metadata.extraction_error`
explaining which part failed.

Extraction refuses to write when a page renders nothing readable — no
typography, no assets, and almost no colour. A site that has gone down often
still answers 200 with an outage notice, and that notice extracts perfectly
well: `newterritory.studio` fell over behind a Kirby PHP error and a backfill
run filed a screenshot of it as the studio's card. The existing capture is kept
and the reason recorded, because a stale picture of the real site beats a fresh
picture of somebody's stack trace.

```bash
bun run scripts/test-extraction.ts                 # pipeline check, no writes
```

### Captures

```bash
bun run scripts/recapture-flat.ts --dry-run        # list captures of nothing much
bun run scripts/recapture-flat.ts                  # retake them
bun run scripts/recapture-flat.ts --ids 4,73,188   # retake named sources
```

Capture waits for the page to finish painting, not merely to finish loading —
`waitForPaint` samples the viewport as a low-quality JPEG and watches whether the
buffer is still growing. Content arriving pushes it up; a preloader holds it flat
and low. This is measured through the encoder rather than by decoding the image,
which is what makes it cheap enough to run several times a second inside a
function.

Sites with intro animations had been photographed mid-preloader while extracting
their colour, type and assets perfectly — the document was there the whole time,
underneath a splash. A capture that still comes back nearly empty is retaken once
and the busier of the two frames kept, so a genuinely sparse page keeps its
picture. `recapture-flat.ts` applies the same judgement to captures already
stored, on two measures: bytes per megapixel across the whole frame, and how much
of the first screenful is one flat colour. The second is what catches a hero
caught mid-transition, which the first scores as healthy.

---

## Design system

The UI runs on a small token system defined in `app/globals.css`:

- **Type scale** — micro 10px / meta 11px / ui 12px / body 13px / title 14px / reading 15px / heading 20px / display 26–32px. The first five are mono-led and carry labels, data and dense UI; the last three are sans and carry prose, sections and identity. Nothing in the UI renders below 10px
- **Ink levels** — foreground at 100 / 62 / 40 / 24 percent, replacing ad-hoc text opacities
- **Edges** — border at 70 / 50 / 30 percent for structural, default, and faint hairlines
- **Radius** — 4px for boxes, full for pills and swatches
- **Motion** — one easing (`cubic-bezier(0.22, 1, 0.36, 1)`) with tokenized durations (120 / 200 / 300 / 450 ms), mirrored in `lib/motion.ts` for motion/react

Shared primitives live in `components/ui` (Spinner, SectionLabel) and `lib/use-copied.ts` (copy feedback).

### Layout

The three-pane split (categories / grid / detail) opens at `xl`, not `md`. Below that, phones and tablets share one layout: horizontal category chips, a sort row, a full-width grid, and the detail view as a bottom sheet. A tablet is treated as a wide phone rather than a narrow desktop. The two earlier positions both failed: `md` left cards 158px wide at 768px, and `lg` left them 222px at 1024 — narrower than the phone's 335px, because the panes fit but leave the grid half the window.

The detail panel holds its column at all times — `2 / 6 / 4` of a 12-column grid. The empty state is deliberate: it names what the panel contains (preview, mobile, colors, type), which is how the tabs are discovered in the first place. Do not reclaim that space for the grid.

Touch targets are expanded with pseudo-element overlays rather than padding, so controls hit 44px without changing how they are drawn. Note that `overflow-x-auto` clips these overlays vertically — the compact sort row compensates with padding and a matching negative margin.

---

## Tech stack

- **Framework:** Next.js 16 App Router (React 19)
- **Styling:** Tailwind CSS v4
- **Animations:** motion (Framer Motion v11)
- **Database:** Neon PostgreSQL (serverless)
- **Storage:** Vercel Blob (screenshots)
- **Browser:** Puppeteer + Sparticuz Chromium (Lambda-compatible)
- **Package manager:** bun

---

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `ADMIN_PASSWORD` | Passcode for `/admin`, and the bearer token for scripts |
| `ADMIN_SESSION_SECRET` | Optional. Signs session cookies; falls back to `ADMIN_PASSWORD`. Set it so rotating the passcode does not invalidate the signing key |
| `CRON_SECRET` | Bearer token for the nightly `/api/cron/backfill` job |

---

## Development

```bash
bun install
bun run dev
```

Build:

```bash
bun run build
```

---

## Maintenance

Extraction occasionally uploads a zero-byte screenshot. The blob then answers
200 with an empty body, the image optimizer returns 502, and the card falls back
to plain text. To find and repair those:

```bash
node scripts/repair-screenshots.mjs              # report only
node scripts/repair-screenshots.mjs --fix        # re-extract the broken ones
node scripts/repair-screenshots.mjs --fix --limit 5
node scripts/repair-screenshots.mjs --salvage    # fall back to the site OG image
```

`--fix` calls the live re-extract endpoint, so it needs `ADMIN_PASSWORD` and
`BASE_URL` (defaults to production).

A few sites resist capture entirely — heavy client-rendered apps and bot
protection. `--salvage` promotes their stored OG thumbnail into `screenshot_url`
so the card shows something real. Where there is no usable fallback the card
degrades to the domain name, which is the intended behaviour.
