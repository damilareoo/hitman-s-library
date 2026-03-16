# Enhanced Extraction & Display — Design Spec

**Date:** 2026-03-16
**Project:** Hitman's Library
**Status:** Approved for implementation

---

## Overview

Extend the existing design intelligence pipeline to extract and display typography specimens, categorized visual assets (logos, icons, illustrations, images), and a full-page screenshot preview — all within a new 4-tab detail panel. The gallery card on the main grid is unchanged. Design language (borders-not-shadows, dot grid, spring easing, dual dark/light mode) is fully preserved.

---

## 1. Panel Architecture

The existing `design-panel.tsx` (desktop sidebar / mobile bottom sheet) gains a **4-tab navigation** at the top of the panel body:

```
Preview  |  Colors  |  Type  |  Assets
```

- Tabs are horizontally scrollable on mobile (`overflow-x: auto; scrollbar-width: none`) — no wrapping
- Active tab underline uses the existing `border-bottom: 2px solid var(--foreground)` pattern
- Tab content areas are independently scrollable
- Default tab on open: **Preview**
- Tab state is local React state (`useState`) — no URL params, no deep-linking
- The existing Colors tab content is the current panel implementation, unchanged

**Panel footer** (shared across all 4 tabs, always visible, outside scroll area):
- "↗ Visit site" link rendered as a small button, styled with existing `border: 1px solid var(--border)` pattern
- Position: pinned to the bottom of the panel container, below the tab content scroll area, above the panel close affordance on mobile

---

## 2. Preview Tab

### Display
- Full-page screenshot rendered at 100% panel width (`width: 100%`, `height: auto`)
- Scrollable vertically within the tab content area
- Soft gradient fade at the bottom edge of the scroll container: `linear-gradient(to top, var(--background) 0%, transparent 100%)`, 48px tall, pointer-events none
- "scroll to explore ↓" hint text centered within the gradient, disappears after the user scrolls more than 50px; reappears only when the tab is re-opened AND the scroll position is reset to 0 (i.e., does not reappear if the user returns to a tab mid-scroll)
- Screenshot is not interactive (no zoom, no pan)

### Extraction
- Puppeteer captures a full-page screenshot after the existing 3s post-load delay:
  ```js
  await page.screenshot({ fullPage: true, type: 'webp', quality: 85 })
  ```
- Viewport remains 1440×900 (consistent with existing extraction)
- Screenshot uploaded to **Vercel Blob** (`@vercel/blob` package); the returned public URL is saved to `design_sources.screenshot_url`
- If Vercel Blob upload fails, `screenshot_url` is set to `null` — no fallback to base64
- If screenshot capture itself fails, the error is logged and extraction continues without a screenshot

### Failure state
- If `screenshot_url` is null, the Preview tab shows:
  - A bordered placeholder box with the site domain centered
  - "Screenshot unavailable" in `var(--muted-foreground)`
  - The "↗ Visit site" footer button remains active

---

## 3. Type Tab

### Display
Each extracted font role (heading, body, monospace) renders as a **specimen card**:

```
┌────────────────────────────────────┐
│ HEADING — Inter                    │
│                                    │
│  Aa                                │
│  The quick brown fox jumps         │
│  A B C D E F G H I J K L M        │
│                                    │
│  [300] [400] [600] [700]           │
└────────────────────────────────────┘
```

- "Aa" rendered at 48px in the actual extracted font — font loaded at runtime via `google_fonts_url` if available. If `google_fonts_url` is null, use the raw `font_family` value from the DB in a `font-family` CSS property with the following generic fallback appended: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for heading/body roles; `ui-monospace, "JetBrains Mono", monospace` for mono role
- Sample sentence at 16px
- Alphabet strip (`A B C D E F G H I J K L M`) at 11px, color: `var(--muted-foreground)`
- Weight chips: small bordered badges listing each detected weight. The `primary_weight` chip has a highlighted border (`border-color: var(--foreground)`)
- Cards separated by a 1px `var(--border)` divider
- Staggered `fade-in-up` on tab entry, 60ms delay per card, max 3 cards

### Extraction
The existing `lib/typography-extraction.ts` already captures font names and weights. Additions:
- Identify role via computed styles:
  - `heading`: `font-family` used on `h1` element
  - `body`: `font-family` used on `p` element
  - `mono`: `font-family` used on `code` element
- If heading and body resolve to the same font family, they are stored as separate rows with different roles
- Capture `google_fonts_url`: first `<link href="...fonts.googleapis.com...">` whose `href` includes the font family name (case-insensitive match). If no Google Fonts link found, stored as `null`
- Capture `primary_weight`: the `font-weight` computed value on the role's target element (`h1` / `p` / `code`), stored as integer
- `available_weights` (existing column): retain existing logic

**Re-scrape behavior:** On re-extraction of an existing URL, `design_typography` rows for that `source_id` are deleted and re-inserted (delete-then-insert, not upsert).

### New columns on `design_typography`
```sql
role           TEXT     -- 'heading' | 'body' | 'mono'
google_fonts_url TEXT   -- nullable
primary_weight  INTEGER -- nullable
```

---

## 4. Assets Tab

### Display
Four sections rendered top-to-bottom. Sections with zero items are hidden entirely (no empty state per section).

#### Logo
- Up to 2 candidates shown (primary + wordmark/icon variant if distinct)
- Rendered against a CSS checkerboard background (to reveal transparency):
  ```css
  background-image: linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
                    linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
                    linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
  background-size: 8px 8px;
  ```
- **Click behavior by asset type:**
  - SVG logo: copies `outerHTML` markup to clipboard; toast: "SVG copied"
  - Raster logo: copies the absolute image URL as a string to clipboard; toast: "URL copied"

#### Icons
- Grid: 5 columns desktop, 4 columns mobile
- Each cell: 44×44px, `background: var(--secondary)`, centered SVG rendered via `dangerouslySetInnerHTML`
- Hover: `border-color: var(--foreground)`, copy icon (Lucide `Copy`) overlaid at bottom-right
- Click: copies `outerHTML` to clipboard; toast: "SVG copied"
- Staggered `scale-in` on tab entry, 30ms per item, **max 12 items animated** (remaining appear instantly)

#### Illustrations
- Grid: 3 columns desktop, 2 columns mobile
- Each cell: 80px tall, SVG rendered with `contain` fit via `dangerouslySetInnerHTML`
- Same hover/copy behavior as Icons
- Staggered `scale-in`, 30ms per item, max 6 items animated

#### Images
- Grid: 3 columns desktop, 2 columns mobile
- Each cell: 80px tall, `<img>` with `object-fit: cover`, `loading: lazy`
- Click: opens image URL in new tab (no copy behavior)
- No stagger animation (external images load asynchronously)

### Extraction (`lib/asset-extraction.ts`)

**Logo detection heuristic** (evaluated in priority order; stop at the first tier that produces at least one match):
1. All `<svg>` and `<img>` elements inside `<header>` or `<nav>` that are wrapped in an `<a>` linking to `/` or the root domain — collect all, take first 2
2. All `<img>` elements with an `alt` attribute containing the site name (extracted from `<title>` tag, case-insensitive) — collect all, take first 2
3. All `<svg>` and `<img>` elements whose `getBoundingClientRect().top` is ≤ 100px and whose `getBoundingClientRect().width` is between 20px and 300px — collect all, take first 2

Up to 2 distinct candidates stored (deduplicated by `src` or `outerHTML` hash after selection).

**SVG extraction:**
- `document.querySelectorAll('svg')` after page load
- Measure each SVG via `getBoundingClientRect()` (live layout dimensions — not SVG attributes or viewBox)
- **Exclude** SVGs where `rect.width < 8 || rect.height < 8` (both dimensions must be ≥ 8px to include)
- **Exclude** SVGs whose `outerHTML` exceeds **50,000 characters** (skip pathologically large inline SVGs)
- Deduplicate by exact `outerHTML` string match
- Categorize using live layout dimensions: `Math.max(rect.width, rect.height) >= 40` → illustration; otherwise → icon (threshold inclusive: 40px = illustration)
- Strip `id` attributes from `outerHTML` before storage
- Cap **after deduplication**: first 50 icons and first 20 illustrations in DOM order

**Image extraction:**
- `document.querySelectorAll('img')` after page load
- Include only if: `naturalWidth >= 100 && naturalHeight >= 100`
- **Exclude** data URIs longer than **2,048 characters**
- Resolve `src` to absolute URL
- Cap: **20 images** (first N in DOM order after filtering)

**Re-scrape behavior:** On re-extraction, the delete-and-insert for both `design_typography` and `design_assets` rows must be wrapped in a single database transaction. If the insert phase fails, the transaction is rolled back — leaving the existing rows intact. Partial overwrites are not acceptable.

---

## 5. Database Schema

### Migration `scripts/006-add-screenshot-assets.sql`
*(Confirm this is the next sequence after the current highest migration before running.)*

```sql
-- design_sources: add screenshot column
ALTER TABLE design_sources ADD COLUMN screenshot_url TEXT;

-- design_typography: add new classification columns
ALTER TABLE design_typography ADD COLUMN role TEXT;
ALTER TABLE design_typography ADD COLUMN google_fonts_url TEXT;
ALTER TABLE design_typography ADD COLUMN primary_weight INTEGER;

-- new assets table
CREATE TABLE design_assets (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER NOT NULL REFERENCES design_sources(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- 'logo' | 'icon' | 'illustration' | 'image'
  content     TEXT NOT NULL,    -- SVG outerHTML for type=logo/icon/illustration; absolute image URL for type=image
  width       INTEGER,          -- rendered bounding box width in px
  height      INTEGER,          -- rendered bounding box height in px
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX design_assets_source_id_idx ON design_assets(source_id);

-- Prevent duplicate role rows per source (enforces delete-then-insert pattern)
ALTER TABLE design_typography ADD CONSTRAINT design_typography_source_role_unique UNIQUE (source_id, role);
```

**`content` column contract:**
- `type = 'logo'` (SVG): full `outerHTML` string with `id` attributes stripped
- `type = 'logo'` (raster): absolute image URL
- `type = 'icon'` or `'illustration'`: full `outerHTML` string with `id` attributes stripped
- `type = 'image'`: absolute image URL

---

## 6. Responsive Behavior

| Breakpoint | Panel behavior |
|---|---|
| Mobile `< 640px` | Bottom sheet, tab bar horizontally scrollable, full-width |
| Tablet `640–1023px` | Bottom sheet or inline (existing behavior unchanged) |
| Desktop `≥ 1024px` | Right sidebar ~400px fixed width |

Tab bar scroll: `overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch`

---

## 7. Animation & Interaction

All new interactions use the existing motion system (`cubic-bezier(0.34, 1.56, 0.64, 1)`):

| Event | Animation | Duration | Stagger |
|---|---|---|---|
| Tab switch | `fade-in-up` (translateY 12px → 0, opacity 0 → 1) | 0.3s | — |
| Specimen cards enter | `fade-in-up` | 0.4s | 60ms, max 3 cards |
| Icon/illustration grid enter | `scale-in` (0.95 → 1) | 0.3s | 30ms, max 12 icons / 6 illustrations |
| Copy success toast | existing toast system | — | — |

`prefers-reduced-motion`: all transforms removed, opacity transitions only (0.15s).

---

## 8. API Changes

**`POST /api/design/extract`**
- Runs screenshot capture and asset extraction in parallel with existing color/typography extraction
- Both new extractors are fault-tolerant: exceptions are caught, logged, and do not abort the overall extraction
- Re-scrape: triggers transactional delete-then-insert for `design_typography` and `design_assets` rows; rollback on failure leaves existing rows intact

**`GET /api/design/list`** — response shape unchanged

**`GET /api/design/[id]`** (new endpoint or extended existing detail endpoint)
- Returns a flat JSON object. `screenshot_url` is a top-level field (not nested):
  ```ts
  {
    id: number
    url: string
    screenshot_url: string | null   // top-level, new field
    typography: TypographyRow[]     // includes new role, google_fonts_url, primary_weight fields
    assets: AssetRow[]              // all rows; client groups by type
    // ...existing DesignSource fields
  }
  ```

---

## 9. New Files

| File | Purpose |
|---|---|
| `lib/asset-extraction.ts` | Logo, SVG, image extraction logic |
| `scripts/006-add-screenshot-assets.sql` | DB migration |
| `components/panel-tabs.tsx` | Tab bar component (local `useState`, 4 tabs) |
| `components/type-specimen-card.tsx` | Typography specimen card |
| `components/asset-grid.tsx` | Categorized asset grid with copy behavior |
| `components/preview-tab.tsx` | Scrollable screenshot tab with scroll hint |

---

## 10. Out of Scope

- Gallery card changes
- Live iframe embedding
- Asset download (copy to clipboard only)
- Historical screenshot diffs
- Asset search or filtering across the library
- Adobe Fonts / Bunny Fonts extraction (Google Fonts and system font fallback only)
