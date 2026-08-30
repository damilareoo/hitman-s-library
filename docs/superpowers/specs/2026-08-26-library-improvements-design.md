# Hitman's Library — improvement program

Date: 2026-08-26

## Problem

Measured against the production database (281 sources):

| Surface | Renders | Missing |
|---|---|---|
| Colors | 198 | 83 |
| Typography | 199 | 82 |
| Assets | 194 | 87 |
| All three | 193 (69%) | 88 (31%) |

The default sort is `recent`, and the newest additions are the degraded ones, so
the first screen of the gallery is disproportionately broken. That is why the
failure rate reads as "most sites" rather than a third.

Failure buckets: 26 never extracted, 55 collapsed to a legacy fallback shape that
the UI does not read, 5 with no screenshot, and a partial tail.

## Root causes

1. **`design_typography` has no `all_fonts` column.** `extract/route.ts` inserts
   into it and swallows the error with `.catch(() => null)`. Typography is lost
   silently for every site that takes the fallback path.
2. **`extractFullDesignData` does not guard `page.goto`.** `networkidle2` with a
   15s ceiling never settles on sites with analytics or websocket traffic, the
   throw escapes, and the whole extraction degrades to regex-over-HTML.
3. **Assets race the screenshot.** `Promise.all` runs `extractAssets` alongside
   `captureFullPageScreenshot`, which autoscrolls. Lazy images still report
   `naturalWidth === 0`, and logo tier 3 (`rect.top <= 100`) reads a viewport
   moving underneath it.
4. **The route aborts before the browser runs.** A plain `fetch` returns early on
   403/429 — every Cloudflare-fronted site — although headless Chrome would
   render it. `html.includes('blocked')` additionally rejects any page containing
   the word "blocked" anywhere in its source.

Contributing: typography roles come from `querySelector('h1' | 'p' | 'code')`
only, with no `document.fonts.ready` wait, so late webfonts read as fallbacks.
Asset extraction ignores CSS `background-image`, `srcset`/`<picture>`, and
shadow DOM.

## Decisions

- Backfill all 88 degraded sites automatically once the pipeline is fixed.
- Sidebar aesthetic: **live specimen rail** — each category carries a micro
  palette sampled from the sites inside it.
- Explore the rail as live variants before committing to one.
- Typography: keep the monochrome editorial system, widen the range.
- All four core-purpose gaps are in scope, but phase 4 gets its own brainstorm.

## Phases

### Phase 1 — Extraction reliability

- `gotoResilient()`: `domcontentloaded` at 20s, then a soft network-idle race
  that resolves rather than throws, then `document.fonts.ready` behind a guard.
  A navigation timeout degrades to "extract what rendered".
- `settlePage()`: one full autoscroll forcing `loading=eager`, back to top,
  await fonts. Extraction reads happen after it; screenshots after those.
- Remove both legacy write paths. Fallbacks write in the displayable shape —
  colors as `hex_value`/`oklch`, typography as role-tagged rows.
- The plain `fetch` supplies title/description/og:image only. Never abort the
  browser attempt because of its status. Replace the `'blocked'` substring test
  with real challenge-page markers.
- Widen extractors: heading by computed font-size ranking, body weighted by
  rendered text area, mono from `code,pre,[class*=mono]`; assets gain CSS
  backgrounds, `srcset`, shadow DOM, and better logo tiers.
- `scripts/backfill-extraction.ts` with per-site logging and an honest
  `extraction_error` on anything still unrecoverable.

### Phase 2 — Performance

Drop the per-request `AllSitesIndex` 100-row query, move off blanket
`force-dynamic`, cut the 900ms preloader, delete `components/nodes/*`, prune
unused dependencies, tighten `images.remotePatterns` off `'**'`, stop ignoring
TypeScript build errors.

### Phase 3 — Sidebar and typography

Type scale first: seven tiers with a real display tier and a legible body tier,
then retune usage. Then `queryCategoryPalettes()` to supply per-category swatch
data, three rail variants on a local `/lab/sidebar` route in both themes, pick,
implement.

### Phase 4 — Core purpose

Export path, faceted discovery, pinned comparison. Depends on phase 1's derived
data. Brainstormed separately.

## Testing

Extraction is verified against a fixture set drawn from the real failure
buckets — a Cloudflare-fronted site, a never-settling SPA, a lazy-image-heavy
marketing page, and a site with no `<h1>` — asserting that each yields colors,
at least one typography role, and at least one asset.
