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

- **Card grid** — Browse all sites with staggered card entrances, filter by kind of site
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
- **Linkable views** — Kind, tag, search, sort, and the open site all live in the URL, so any view can be shared and the back button steps through history

---

## How sites are filed

Every source carries a `kind` — what kind of site it is, which is the question
someone browsing a design library is actually asking:

| Kind | What belongs in it |
|---|---|
| **AI** | Models, agents, copilots, and AI platforms — the product *is* artificial intelligence |
| **Developer** | APIs, infrastructure, and tools for people who build software |
| **Work** | Team productivity, collaboration, and workplace SaaS |
| **Money** | Banking, payments, trading, and crypto |
| **Consumer** | Games, browsers, devices, and personal apps |
| **Studio** | Agencies and studios selling their own craft |
| **Editorial** | Publications, galleries, archives, guidelines |
| **Company** | Businesses that aren't covered above |
| **Portfolio** | One person's work, under their own name |
| **Store** | Things you buy |
| **Venue** | Places you physically go |
| **Event** | Something with a date on it |

Product used to be the first row and held half the library on its own, so it
was split five ways (AI, Developer, Work, Money, Consumer) in October 2026.
The rule for the borderline: AI means the product *is* artificial
intelligence; AI-assisted tools in a vertical stay in their vertical.

The rail lists them in that fixed order rather than by size, because a list that
reshuffles as sites are added is one you have to read again every visit.

This replaced `industry`, which recorded the business a site's *customer* was in.
Three quarters of the library sat in two buckets under that scheme — 104 sources
filed as "SaaS", another 105 as some flavour of uncategorised — and the labels
that did exist were often wrong: hex.inc, a brand and product studio, was filed
under E-commerce. The `industry` column is still there and nothing reads it; it
is the only record of how a source was originally filed.

A source with no kind shows as **Unsorted** and sorts last, so a newly added site
is visible rather than silently unreachable. To file a batch, edit
`scripts/kinds.json` and run:

```bash
node scripts/apply-kinds.mjs --dry   # print what would change
node scripts/apply-kinds.mjs         # write it
```

Tags are a separate matter and are not currently a filter. They were
auto-detected and are not trustworthy at the level a filter needs: `animated` is
on 216 of 277 sources and `glassmorphism` on 157. A filter that matches most of
the library is not a filter.

---

## Security model

The gallery is read-only, and everything that **deletes or drives a headless
browser** stays behind an admin session. Site requests are the single exception
to public writes, and are fenced accordingly.

- `POST /api/admin/auth` exchanges `ADMIN_PASSWORD` for an HMAC-signed, httpOnly
  session cookie (12 hour TTL). The passcode is compared in constant time.
- `requireAdmin()` in `lib/admin-auth.ts` guards every mutating route:
  `design/delete`, `design/extract`, `design/[id]/reextract`, and all of
  `api/admin/*`. Scripts can pass `Authorization: Bearer $ADMIN_PASSWORD`
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
- **The canonical host is the apex, `hitmanslibrary.xyz`.** `metadataBase`, the
  sitemap's `BASE`, `robots.host`, and the `og:image` URL all say so, and
  `www.` is a 308 to it in the Vercel project's domain settings. These have to
  agree: a canonical tag pointing at a URL that redirects splits the site in
  two as far as a crawler is concerned. If you ever move the serving host,
  change all four here in the same commit.
- `public/og.png` is the link preview card. It is one fixed image on purpose:
  platforms scrape it once and serve it from their own cache, so it has no
  viewer and no theme to answer. The card's frame follows the phone; the picture
  inside it cannot. `public/og-light.png` is the same artwork inverted, kept for
  a light-ground surface if one ever needs it. Changing the artwork means
  changing the filename too — platforms cache the old bytes against the old URL.
- Favicons *are* theme-aware: `public/icon.svg` answers `prefers-color-scheme`,
  as does `themeColor` in `app/layout.tsx`.

---

## The live preview

The preview tab renders the real site through `/api/proxy`: the HTML is fetched
server-side, `<base href>` is rewritten to the real origin so relative CSS,
images and links resolve, and the response carries no `X-Frame-Options` or CSP,
which is the entire point of the route.

### Why the preview has its own domain

The proxy answers on `preview.hitmanslibrary.xyz`, not on the app's own host,
and the panel's iframe carries `allow-same-origin`.

Both halves are load-bearing. Without `allow-same-origin` the framed page gets
an opaque origin, `localStorage` throws on first access, and a modern site's
hydration dies there — which is what was killing the live preview on nearly
every site in the library. And that flag cannot go on the app's own origin: it
grants the framed page whatever origin the document came from, so third-party
JavaScript would hold ours, with the app's storage, its `window.parent`, and
`/api/admin/*` with the session cookie attached.

A separate host resolves "same origin" to somewhere harmless. The admin session
cookie is host-only, so it is never sent there; storage is per-origin;
middleware serves only `/api/proxy` and `/api/proxy-asset` on that hostname and
404s the rest; and the panel ignores `postMessage` from any other origin.

`lib/preview-origin.ts` picks the host. Where there is no separate one — a
deployment URL, a bare IP — it returns empty and the flag stays off, so
previews degrade rather than the isolation. Set `NEXT_PUBLIC_PREVIEW_ORIGIN` to
override. In development `localhost` and `127.0.0.1` are the same server and
different origins, which is exactly the separation needed, so dev gets a real
preview too.

A failed preview is reported by the injected script over `postMessage`, and the
panel waits 20 seconds for a frame that never loads at all. It used to report
window errors and unhandled rejections as well, and that took previews down
across the library: a cross-origin script that throws yields the string
`"Script error."` and nothing more, and a proxied page is almost entirely
cross-origin script. A page that renders and throws is a working preview.

**`<base href>` also moves `document.baseURI`,** and that is where it bites.
Every client-side router resolves the URL it passes to `history.replaceState`
against `baseURI`, so the call goes cross-origin, throws a `SecurityError`
during hydration, and drops the whole page to Chrome's "This page couldn't
load". It presents as the site being broken; it is ours. The injected head
script guards `pushState` and `replaceState` and retries without the URL, which
leaves the router's state machine intact — only the address bar is untouched,
and nobody can see that inside a panel.

A site that cannot render live can carry `metadata.live_preview: false` and
open straight to its capture rather than spending the whole timeout
rediscovering that on every visit. Nothing carries it today.

**That flag needs re-testing whenever the preview changes.** Nine sites held it
from an audit that predated the preview's own origin, and all nine previewed
perfectly once it was cleared — seven of them are still in the library because
the flag was questioned rather than trusted. A sweep cannot tell you a flagged
site is broken: it opens to a capture by configuration, so confirming it shows
a capture is circular. Clear the flag and re-measure.

`scripts/preview-audit.mjs` checks the whole library at once, loading each site
through the real proxy in a real browser and judging what painted:

```bash
node scripts/preview-audit.mjs                  # all of them
node scripts/preview-audit.mjs --ids 3,4,5      # a few
BASE_URL=http://localhost:3000 node scripts/preview-audit.mjs
```

Be suspicious of a high failure count. A bad metric will happily report that
most of the library is broken — an earlier version of this script compared each
render against the site's stored capture and failed 90% of them, because
headless Chrome reports `prefers-color-scheme: dark` and half the web answers
that with a different palette. Look at a screenshot before believing a number.

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

### Colour coverage

`design_colors.area_share` records how much of a page each colour accounts for,
and the palette in the panel is drawn at those proportions. Rows without one
draw at equal weight, and the tab says so.

```bash
node scripts/backfill-color-shares.mjs             # everything unmeasured
node scripts/backfill-color-shares.mjs --ids 3,4
node scripts/backfill-color-shares.mjs --limit 20
```

The script only writes that one number — it never inserts, deletes or rewrites
a colour. Re-running the full extractor would have done the job and would also
have replaced good palettes and typography with whatever today's render
produced, which is too much risk for one number. Sites added later need a run
to be measured.

Three things this got wrong before it got them right, all of them worth
knowing if you touch `lib/color-area.js`:

- Headless Chrome reports `prefers-color-scheme: dark`, so a theme-aware site
  paints a palette unrelated to the one stored against it. The backfill asks
  for light.
- Exact hex matching throws away nearly every measurement, because a page
  repaints `#fdfdfc` where the palette recorded `#ffffff`. Measurements are
  attributed to the nearest stored colour within a small radius.
- Counting background area alone returns one colour at 100% and the rest at
  zero, for every site. True of a page, useless as a palette. Ink is counted
  too, at a glyph's share of its em square.

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
| `NEXT_PUBLIC_PREVIEW_ORIGIN` | Optional. Host that serves the live preview. Derived from the current hostname when unset |

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
```

`--fix` calls the live re-extract endpoint, so it needs `ADMIN_PASSWORD` and
`BASE_URL` (defaults to production).

A few sites resist capture entirely — heavy client-rendered apps and bot
protection. Where there is no usable capture the card degrades to the domain
name, which is the intended behaviour.

There used to be a `--salvage` mode that promoted a site's OG thumbnail into
`screenshot_url` so the card showed *something*. It is gone. A promoted share
graphic is not a capture of the page and nothing downstream could tell the
difference: six sources were displaying their own OG image as their screenshot,
Linear and Granola among them, and every one of those rows looked healthy
because the URL resolved and the bytes decoded. A site that will not photograph
should say so, not quietly show a different picture.

### Checking captures

A stored URL proves nothing. It can 404, answer 200 with an empty body, or
return a single flat colour because the shutter fired before the page painted.
`validate-captures.mjs` fetches every capture, decodes it, and measures pixel
variance, so a blank page fails the way a missing one does:

```bash
node scripts/validate-captures.mjs        # writes capture-problems.json
node scripts/recapture.mjs --desktop 13,31 --mobile 34,97
```

`backfill-mobile.mjs` captures the mobile breakpoint for every source missing
one. It sets the phone viewport and user agent *before* navigating, which the
`/api/admin/mobile-capture` route does not: that route navigates at 1440px and
then resizes to 390, so a site serving a different document to phones was
photographed as a desktop page squeezed to phone width.

```bash
node scripts/backfill-mobile.mjs             # everything missing a mobile shot
node scripts/backfill-mobile.mjs --ids 3,4   # named sources, re-shot
```

### Sites that will not preview

Every card offers a live preview, so a site that cannot render inside the panel
has less to offer than its capture suggests. `preview-audit.mjs` walks the
library through the proxy and measures what actually paints; anything it flags
goes to `preview-recheck.mjs`, which retries the flagged set three times each
and writes `preview-confirmed.json`.

```bash
node scripts/preview-audit.mjs               # writes preview-results.json
node scripts/preview-recheck.mjs             # confirms, one site at a time
node scripts/remove-sites.mjs --dry          # plan, plus a restore file
node scripts/remove-sites.mjs                # remove them
```

The recheck is serial on purpose. The audit runs eight headless tabs at once
and they starve each other: on the run that produced this list, ten of the
forty-one it flagged rendered perfectly when given a browser to themselves.
Removing straight from a parallel audit would have deleted working sites, so
nothing is removed until a serial pass agrees.

Two sweeps, measuring different things. `preview-sweep.mjs` loads the proxy at
the top level and asks whether a site can be rendered at all.
`panel-sweep.mjs` opens the real panel and asks whether a visitor gets a live
page or a capture — those differ, and the gap between them is where the sandbox
bugs lived.

```bash
node scripts/preview-sweep.mjs               # the proxy, both breakpoints
node scripts/panel-sweep.mjs                 # the panel, both breakpoints
```

`remove-sites.mjs` writes every row a site owns to `removed-sites-<date>.json`
before deleting anything. Colors, typography and assets cascade off
`design_sources`, which makes removal one statement and makes an unexamined
removal unrecoverable — hence the export, and hence `--dry` first.

## Contributors

- [Damilare](https://github.com/damilareoo)
- [Judie](https://github.com/Judiedesigns)
