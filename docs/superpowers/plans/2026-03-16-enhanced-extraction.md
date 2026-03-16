# Enhanced Extraction & Display Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-page screenshot preview, typography specimen cards, categorized asset extraction (logo/icons/illustrations/images), and brand-signal color extraction with HEX+OKLCH output — all surfaced in a new 4-tab detail panel.

**Architecture:** Extend `lib/browser-extraction.ts` to expose a page-level API (open page once, run all extractors, close it), add `lib/asset-extraction.ts` for SVG/image logic, add `lib/color-utils.ts` for OKLCH conversion, migrate DB with migration 006, then build the panel UI as focused components wired into a new `components/site-detail-panel.tsx`.

**Tech Stack:** Next.js 16, React 19, Neon/Postgres (`@neondatabase/serverless` Client for transactions), Puppeteer + @sparticuz/chromium, Vercel Blob, culori (color conversion), Geist Mono (already in `geist` package v1.3.1), Tailwind CSS 4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-16-enhanced-extraction-design.md`

---

## Chunk 1: Foundation — Dependencies, Font, Migration

### Task 1: Install dependencies and link packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install all packages**

```bash
cd "/Users/v/hitman's library"
pnpm install
pnpm add culori @vercel/blob
pnpm add -D @types/culori
```

Expected: no errors, `culori` and `@vercel/blob` appear in `package.json` dependencies.

- [ ] **Step 2: Verify culori parses and converts a color**

```bash
node -e "
const { parse, formatHex, oklch: toOklch, formatCss } = require('culori');
const c = parse('#635bff');
const ok = toOklch(c);
console.log('hex:', formatHex(c));
console.log('oklch:', formatCss(ok));
"
```

Expected output:
```
hex: #635bff
oklch: oklch(58.27% 0.2437 279.37)
```

(Exact values may vary slightly — check they are non-null and well-formed.)

- [ ] **Step 3: Add BLOB_READ_WRITE_TOKEN to .env.local**

In the Vercel dashboard → Storage → Blob → your store, copy the `BLOB_READ_WRITE_TOKEN`. Add to `.env.local`:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Also add to Vercel project environment variables for production.

- [ ] **Step 4: Verify @vercel/blob is importable**

```bash
node -e "const { put } = require('@vercel/blob'); console.log(typeof put)"
```

Expected: `function`

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .env.local
git commit -m "feat: add culori and @vercel/blob, set BLOB token"
```

---

### Task 2: Switch monospace font to Geist Mono

**Files:**
- Modify: `app/layout.tsx`
- Verify: `app/globals.css` (likely already correct — do not change if `--font-mono` already references Geist)

- [ ] **Step 1: Read current layout.tsx**

Open `app/layout.tsx`. Note the current mono font import (JetBrains Mono or IBM Plex Mono) and any leftover placeholder variables like `ibmPlexMono`.

- [ ] **Step 2: Replace mono font**

Remove:
- The `JetBrains_Mono` (or equivalent) import from `next/font/google`
- The `jetbrainsMono` (or `ibmPlexMono`) const
- Any reference to `jetbrainsMono.variable` or `ibmPlexMono.variable` in the `<html>` or `<body>` className

Add:
```tsx
import { GeistMono } from 'geist/font/mono'
```

Apply `GeistMono.variable` to the **`<html>`** element (not `<body>`):
```tsx
<html lang="en" className={`${inter.variable} ${GeistMono.variable}`}>
```

- [ ] **Step 3: Verify globals.css (read, do not blindly edit)**

Open `app/globals.css` and search for `--font-mono`. If it already reads:
```css
--font-mono: var(--geist-mono), ui-monospace, monospace;
```
No change needed. If it still references JetBrains Mono, update it to the above.

- [ ] **Step 4: Run dev and verify**

```bash
pnpm dev
```

Open the app. DevTools → Elements → `<html>` should have the Geist Mono variable class. Any existing monospace text should render in Geist Mono. No TypeScript errors in the terminal.

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

Expected: no unused variable errors, no missing module errors.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: switch mono font to Geist Mono"
```

---

### Task 3: Run DB migration 006

**Files:**
- Create: `scripts/006-add-screenshot-assets.sql`

- [ ] **Step 1: Confirm migration sequence**

```bash
ls "/Users/v/hitman's library/scripts/"*.sql | sort
```

Confirm highest is `005-*`. If a `006-*` already exists, rename this plan's migration to `007-*`.

- [ ] **Step 2: Check for existing duplicate typography rows**

Before adding the unique constraint, deduplicate any existing rows:

```sql
-- Run in Neon dashboard first — check for duplicates
SELECT source_id, COUNT(*) FROM design_typography GROUP BY source_id HAVING COUNT(*) > 1;
```

If duplicates exist, they must be cleaned up before the migration. Run:

```sql
-- Keep only the most recent row per source_id (pre-roles era — all will have role=NULL)
DELETE FROM design_typography dt
WHERE id NOT IN (
  SELECT MAX(id) FROM design_typography GROUP BY source_id
);
```

- [ ] **Step 3: Create migration file**

```sql
-- scripts/006-add-screenshot-assets.sql

-- design_sources: full-page screenshot URL
ALTER TABLE design_sources ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- design_colors: add hex_value and oklch columns
-- (existing schema has primary_color/all_colors — new per-color rows use hex_value)
ALTER TABLE design_colors ADD COLUMN IF NOT EXISTS hex_value TEXT;
ALTER TABLE design_colors ADD COLUMN IF NOT EXISTS oklch TEXT;

-- design_typography: add font_family and role classification columns
-- (existing schema has heading_font/body_font/mono_font — new role rows use font_family)
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS font_family TEXT;
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS google_fonts_url TEXT;
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS primary_weight INTEGER;

-- design_sources: add quality_score if missing (used by detail endpoint)
ALTER TABLE design_sources ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 0;

-- Backfill role=NULL rows so constraint doesn't collide with new inserts.
-- Existing rows get role='legacy' to avoid NULL uniqueness issues.
UPDATE design_typography SET role = 'legacy' WHERE role IS NULL;

-- Now safe to add unique constraint
ALTER TABLE design_typography
  ADD CONSTRAINT design_typography_source_role_unique
  UNIQUE (source_id, role);

-- New asset table
CREATE TABLE IF NOT EXISTS design_assets (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER NOT NULL REFERENCES design_sources(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  content     TEXT NOT NULL,
  width       INTEGER,
  height      INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS design_assets_source_id_idx ON design_assets(source_id);
```

- [ ] **Step 4: Run migration**

Run the SQL in the Neon dashboard SQL editor (paste entire file), or via psql:

```bash
psql $DATABASE_URL -f scripts/006-add-screenshot-assets.sql
```

- [ ] **Step 5: Verify**

Run in Neon dashboard:

```sql
-- Confirm new columns on design_sources
SELECT column_name FROM information_schema.columns
WHERE table_name = 'design_sources' AND column_name = 'screenshot_url';

-- Confirm new columns on design_typography
SELECT column_name FROM information_schema.columns
WHERE table_name = 'design_typography'
  AND column_name IN ('role', 'google_fonts_url', 'primary_weight');

-- Confirm design_assets table exists with correct columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'design_assets'
ORDER BY ordinal_position;

-- Confirm unique constraint
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'design_typography' AND constraint_type = 'UNIQUE';
```

All queries should return rows. `design_assets` should have: id, source_id, type, content, width, height, created_at.

- [ ] **Step 6: Commit**

```bash
git add scripts/006-add-screenshot-assets.sql
git commit -m "feat: migration 006 — screenshot_url, oklch, typography roles, design_assets"
```

---

## Chunk 2: Brand-Signal Color Extraction + OKLCH

### Task 4: Color conversion utilities

**Files:**
- Create: `lib/color-utils.ts`

- [ ] **Step 1: Create the utility module**

```typescript
// lib/color-utils.ts
import { parse, formatHex, oklch as toOklch, formatCss, clampChroma, differenceEuclidean } from 'culori'

export interface ColorFormats {
  hex: string
  oklch: string
}

/**
 * Convert any CSS color string to both HEX and OKLCH CSS strings.
 * Returns null if the input is not a parseable color.
 */
export function toColorFormats(cssColor: string): ColorFormats | null {
  try {
    const parsed = parse(cssColor)
    if (!parsed) return null

    const hex = formatHex(parsed)
    if (!hex) return null

    const clamped = clampChroma(toOklch(parsed), 'oklch')
    if (!clamped) return null

    const oklchStr = formatCss(clamped)
    if (!oklchStr) return null

    return { hex, oklch: oklchStr }
  } catch {
    return null
  }
}

// culori's differenceEuclidean in oklch space is perceptually appropriate
const diff = differenceEuclidean('oklch')

/**
 * Deduplicate an array of CSS color strings by perceptual similarity.
 * Colors within euclidean distance 0.05 in OKLCH space are considered duplicates.
 * (Roughly equivalent to delta-E ~5 — visually near-identical.)
 */
export function deduplicateColors(colors: string[]): string[] {
  const result: string[] = []
  for (const color of colors) {
    const parsed = parse(color)
    if (!parsed) continue
    const isTooSimilar = result.some(existing => {
      const existingParsed = parse(existing)
      if (!existingParsed) return false
      try { return diff(parsed, existingParsed) < 0.05 } catch { return false }
    })
    if (!isTooSimilar) result.push(color)
  }
  return result
}
```

- [ ] **Step 2: Manual smoke test**

```bash
node -e "
// Quick test without ts-node — compile first or test via the running dev server
const { execSync } = require('child_process');
// If ts-node available:
// execSync('npx ts-node -e \"...\"', { stdio: 'inherit' })
console.log('Module created — verify via pnpm type-check')
"
pnpm type-check
```

Expected: no type errors in `lib/color-utils.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/color-utils.ts
git commit -m "feat: color-utils — HEX+OKLCH conversion and perceptual dedup via culori"
```

---

### Task 5: Replace color extraction with brand-signal strategy

**Files:**
- Modify: `lib/browser-extraction.ts`
- Modify: `app/api/design/extract/route.ts`

- [ ] **Step 1: Read the current extract route carefully**

Open `app/api/design/extract/route.ts`. Find:
1. Where colors are currently extracted (likely a local `extractColors(html)` regex function)
2. Where `design_colors` is inserted into the DB
3. Whether `@neondatabase/serverless` is imported as `neon` tagged template or `sql`

Note the exact variable names and line numbers before making changes.

- [ ] **Step 2: Add extractBrandColors to browser-extraction.ts**

Add this function to `lib/browser-extraction.ts`. It takes a `Page` object — the refactor in Task 6 will establish how pages are exposed. For now, add the function:

```typescript
// Add to lib/browser-extraction.ts

/**
 * Extract brand/design-language colors only — CSS variables + structural UI elements.
 * Excludes content areas, raster images, near-transparent colors.
 * Runs inside the Puppeteer browser context.
 */
export async function extractBrandColors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const rawColors: string[] = []

    // --- Pass 1: CSS custom properties on :root ---
    try {
      const rootStyles = getComputedStyle(document.documentElement)
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (!(rule instanceof CSSStyleRule)) continue
            if (rule.selectorText !== ':root' && rule.selectorText !== 'html') continue
            for (const prop of Array.from(rule.style)) {
              if (!prop.startsWith('--')) continue
              const val = rootStyles.getPropertyValue(prop).trim()
              if (val && !val.includes('var(') && val !== 'transparent' && val !== '') {
                rawColors.push(val)
              }
            }
          }
        } catch { /* cross-origin stylesheet — skip */ }
      }
    } catch { /* getComputedStyle failed */ }

    // --- Pass 2: Structural UI element colors ---
    const uiSelectors = ['header', 'nav', 'footer', 'button', '[role="button"]', 'a', 'h1', 'h2', 'body']
    const cssProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor'] as const

    for (const selector of uiSelectors) {
      const els = Array.from(document.querySelectorAll(selector)).slice(0, 8)
      for (const el of els) {
        const style = getComputedStyle(el)
        for (const prop of cssProps) {
          const val = style[prop as keyof CSSStyleDeclaration] as string
          if (
            val &&
            val !== 'transparent' &&
            val !== 'rgba(0, 0, 0, 0)' &&
            !val.includes('inherit') &&
            !val.includes('currentColor') &&
            !val.includes('initial')
          ) {
            rawColors.push(val)
          }
        }
      }
    }

    return rawColors
  })
}
```

- [ ] **Step 3: Update the extract route — replace old color extraction**

In `app/api/design/extract/route.ts`:

1. Import the new utilities:
```typescript
import { extractBrandColors } from '@/lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '@/lib/color-utils'
```

2. Find the existing local `extractColors(html)` regex function (or wherever hex colors are extracted from raw HTML). **Remove it** and replace the color extraction call with:

```typescript
// After Puppeteer page load (will be wired properly in Task 6's page lifecycle refactor):
const rawCssColors = await extractBrandColors(page)
const colorFormats = deduplicateColors(rawCssColors)
  .map(c => toColorFormats(c))
  .filter((c): c is { hex: string; oklch: string } => c !== null)
  .slice(0, 16)
```

3. Update the `design_colors` DB insert to include `oklch`:

```typescript
for (const color of colorFormats) {
  await sql`
    INSERT INTO design_colors (source_id, hex_value, oklch)
    VALUES (${sourceId}, ${color.hex}, ${color.oklch})
    ON CONFLICT DO NOTHING
  `
}
```

**Note:** `sql` here is whatever the project uses — check the import. If using `@vercel/postgres` it's `sql` tagged template; if `@neondatabase/serverless` it may be `neon` or similar.

- [ ] **Step 4: Verify type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 5: Test color extraction end-to-end**

```bash
pnpm dev
# Then in another terminal:
curl -X POST http://localhost:3000/api/design/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stripe.com"}'
```

Query DB to verify colors saved with OKLCH:
```sql
SELECT hex_value, oklch FROM design_colors
WHERE source_id = (SELECT MAX(id) FROM design_sources)
LIMIT 10;
```

Expected: rows with both `hex_value` (#xxxxxx format) and `oklch` (oklch(...) format).

- [ ] **Step 6: Commit**

```bash
git add lib/browser-extraction.ts app/api/design/extract/route.ts
git commit -m "feat: brand-signal color extraction with HEX+OKLCH, replaces regex extraction"
```

---

## Chunk 3: Screenshot, Assets, and Typography Extraction

### Task 6: Refactor browser-extraction.ts to expose Page + add screenshot

**Files:**
- Modify: `lib/browser-extraction.ts`

This task establishes the page lifecycle that Tasks 7 and 8 depend on. Currently `extractAllDesignDataFromRenderedPage` creates and destroys a page internally. We need to expose a page so screenshot, asset, and typography extractors can all run in one browser session.

- [ ] **Step 0: Add imports at top of browser-extraction.ts**

Add these imports to the **top** of `lib/browser-extraction.ts` (not inside functions):

```typescript
import { put } from '@vercel/blob'
import type { Page } from 'puppeteer'
import { extractAssets } from './asset-extraction'
```

`Page` is used throughout the new functions for type annotations. `captureFullPageScreenshot` is defined in the same file — do NOT import it from itself.

- [ ] **Step 1: Add next.config.mjs serverExternalPackages**

Open `next.config.mjs` and add `serverExternalPackages` so Puppeteer/Chromium are not bundled by Next.js (required for serverless deployment):

```js
// next.config.mjs
const nextConfig = {
  serverExternalPackages: ['puppeteer', '@sparticuz/chromium'],
  // ...existing config
}
export default nextConfig
```

- [ ] **Step 2: Add a page-level extraction orchestrator**

Add this to `lib/browser-extraction.ts`. **Critical notes:**
- Do NOT import `captureFullPageScreenshot` — it is in the same file
- Do NOT call `browser.close()` — `getBrowser()` manages a singleton; closing it breaks subsequent calls. Only close the `page`.
- Replace the call to `extractAllDesignDataFromRenderedPage` in the route with this function.

```typescript
// Add to lib/browser-extraction.ts — no self-imports needed

export interface FullExtractionResult {
  colors: string[]
  screenshotUrl: string | null
  assets: import('./asset-extraction').ExtractedAsset[]
  typography: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
  }>
}

export async function extractFullDesignData(url: string): Promise<FullExtractionResult> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 3000))

    const [colors, screenshotUrl, assets, typography] = await Promise.all([
      extractBrandColors(page),
      captureFullPageScreenshot(page, url),  // defined below in same file — no import needed
      extractAssets(page, url),
      extractTypographyWithRoles(page),
    ])

    return { colors, screenshotUrl, assets, typography }
  } finally {
    await page.close()  // close page only — do NOT close browser (singleton)
  }
}
```

- [ ] **Step 3: Add captureFullPageScreenshot function**

```typescript
// Add to lib/browser-extraction.ts (same file — already has Page import from Step 0)

export async function captureFullPageScreenshot(
  page: Page,
  siteUrl: string
): Promise<string | null> {
  try {
    const buffer = await page.screenshot({
      fullPage: true,
      type: 'webp',
      quality: 85,
    }) as Buffer

    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `screenshots/${hostname}-${Date.now()}.webp`

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/webp',
    })

    return blob.url
  } catch (err) {
    console.error('[screenshot] capture/upload failed:', err)
    return null
  }
}
```

- [ ] **Step 4: Update the extract route to use extractFullDesignData**

In `app/api/design/extract/route.ts`, replace the existing Puppeteer call (likely `extractAllDesignDataFromRenderedPage(url)`) with `extractFullDesignData(url)`. The route already has color/font save logic — wire the new result shape into the existing save calls. The `fonts` field is removed from `FullExtractionResult` — retain the existing font save logic using the old extraction path if needed, or adapt it to use `typography` from the new result.

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Test screenshot upload**

```bash
curl -X POST http://localhost:3000/api/design/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vercel.com"}'
```

Query DB:
```sql
SELECT screenshot_url FROM design_sources ORDER BY id DESC LIMIT 1;
```

Open the URL in a browser — should load a full-page WebP screenshot.

- [ ] **Step 7: Commit**

```bash
git add lib/browser-extraction.ts app/api/design/extract/route.ts next.config.mjs
git commit -m "feat: page lifecycle orchestrator + full-page screenshot via Vercel Blob"
```

---

### Task 7: Asset extraction

**Files:**
- Create: `lib/asset-extraction.ts`
- Modify: `app/api/design/extract/route.ts`

- [ ] **Step 1: Create lib/asset-extraction.ts**

```typescript
// lib/asset-extraction.ts
import type { Page } from 'puppeteer'

export interface ExtractedAsset {
  type: 'logo' | 'icon' | 'illustration' | 'image'
  content: string
  width: number
  height: number
}

export async function extractAssets(
  page: Page,
  siteUrl: string
): Promise<ExtractedAsset[]> {
  const origin = new URL(siteUrl).origin

  return page.evaluate((origin: string) => {
    const assets: Array<{
      type: 'logo' | 'icon' | 'illustration' | 'image'
      content: string
      width: number
      height: number
    }> = []

    function stripIds(html: string): string {
      return html
        .replace(/\s+id="[^"]*"/g, '')
        .replace(/\s+id='[^']*'/g, '')
        // Basic script tag removal for safety
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/href="javascript:[^"]*"/gi, '')
    }

    function resolveUrl(src: string): string {
      try { return new URL(src, location.href).href } catch { return src }
    }

    // --- Logo detection (first tier with results wins) ---
    let logoEls: Element[] = []

    // Tier 1: header/nav SVG or img linked to root
    for (const link of Array.from(document.querySelectorAll('header a, nav a'))) {
      try {
        const href = (link as HTMLAnchorElement).href
        const u = new URL(href)
        if (u.origin !== origin) continue
        if (u.pathname !== '/' && u.pathname !== '') continue
        const svg = link.querySelector('svg')
        const img = link.querySelector('img')
        if (svg && !logoEls.includes(svg)) logoEls.push(svg)
        if (img && !logoEls.includes(img)) logoEls.push(img)
        if (logoEls.length >= 2) break
      } catch { /* invalid href */ }
    }

    // Tier 2: img alt matches site title
    if (logoEls.length === 0) {
      const title = document.title.split(/[|\-–]/)[0].trim().toLowerCase()
      if (title.length > 2) {
        logoEls = Array.from(document.querySelectorAll('img')).filter(img =>
          img.alt && img.alt.toLowerCase().includes(title)
        ).slice(0, 2)
      }
    }

    // Tier 3: first SVG/img in top 100px viewport, 20–300px wide
    if (logoEls.length === 0) {
      logoEls = Array.from(document.querySelectorAll('svg, img')).filter(el => {
        const r = el.getBoundingClientRect()
        return r.top <= 100 && r.width >= 20 && r.width <= 300
      }).slice(0, 2)
    }

    // Serialize logos (deduplicate)
    const logoDedupe = new Set<string>()
    for (const el of logoEls) {
      const r = el.getBoundingClientRect()
      if (el.tagName.toLowerCase() === 'svg') {
        const html = stripIds(el.outerHTML)
        if (html.length > 50000 || logoDedupe.has(html)) continue
        logoDedupe.add(html)
        assets.push({ type: 'logo', content: html, width: Math.round(r.width), height: Math.round(r.height) })
      } else if (el.tagName.toLowerCase() === 'img') {
        const src = resolveUrl((el as HTMLImageElement).src)
        if (!src || (src.startsWith('data:') && src.length > 2048)) continue
        if (logoDedupe.has(src)) continue
        logoDedupe.add(src)
        assets.push({ type: 'logo', content: src, width: Math.round(r.width), height: Math.round(r.height) })
      }
    }

    // --- SVG extraction ---
    const svgDedupe = new Set<string>()
    let iconCount = 0
    let illustrationCount = 0

    for (const svg of Array.from(document.querySelectorAll('svg'))) {
      const r = svg.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) continue
      const html = stripIds(svg.outerHTML)
      if (html.length > 50000 || svgDedupe.has(html)) continue
      svgDedupe.add(html)

      if (Math.max(r.width, r.height) >= 40) {
        if (illustrationCount < 20) {
          assets.push({ type: 'illustration', content: html, width: Math.round(r.width), height: Math.round(r.height) })
          illustrationCount++
        }
      } else {
        if (iconCount < 50) {
          assets.push({ type: 'icon', content: html, width: Math.round(r.width), height: Math.round(r.height) })
          iconCount++
        }
      }
    }

    // --- Image extraction ---
    const imgDedupe = new Set<string>()
    let imageCount = 0

    for (const img of Array.from(document.querySelectorAll('img'))) {
      if (img.naturalWidth < 100 || img.naturalHeight < 100) continue
      const src = resolveUrl(img.src)
      if (!src) continue
      if (src.startsWith('data:') && src.length > 2048) continue
      if (imgDedupe.has(src)) continue
      imgDedupe.add(src)
      if (imageCount < 20) {
        assets.push({ type: 'image', content: src, width: img.naturalWidth, height: img.naturalHeight })
        imageCount++
      }
    }

    return assets
  }, origin)
}
```

- [ ] **Step 2: Save assets in extract route using a proper transaction**

The `@neondatabase/serverless` tagged template (`neon()`) does not support `BEGIN/COMMIT`. Use `Client` for transactions:

```typescript
// In app/api/design/extract/route.ts
import { Client } from '@neondatabase/serverless'

// After getting sourceId, save assets transactionally:
if (assets.length > 0) {
  const client = new Client(process.env.DATABASE_URL!)
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM design_assets WHERE source_id = $1', [sourceId])
    for (const asset of assets) {
      await client.query(
        'INSERT INTO design_assets (source_id, type, content, width, height) VALUES ($1, $2, $3, $4, $5)',
        [sourceId, asset.type, asset.content, asset.width, asset.height]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[assets] Transaction rolled back:', err)
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 4: Test**

```bash
curl -X POST http://localhost:3000/api/design/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://linear.app"}'
```

```sql
SELECT type, COUNT(*) FROM design_assets
WHERE source_id = (SELECT MAX(id) FROM design_sources)
GROUP BY type;
```

Expected: rows for icon, illustration, logo, and/or image types.

- [ ] **Step 5: Commit**

```bash
git add lib/asset-extraction.ts app/api/design/extract/route.ts
git commit -m "feat: asset extraction — logos, icons, illustrations, images with transactional save"
```

---

### Task 8: Role-aware typography extraction

**Files:**
- Modify: `lib/browser-extraction.ts`
- Modify: `app/api/design/extract/route.ts`

- [ ] **Step 1: Add extractTypographyWithRoles to browser-extraction.ts**

```typescript
// Add to lib/browser-extraction.ts

export async function extractTypographyWithRoles(page: Page): Promise<Array<{
  fontFamily: string
  role: 'heading' | 'body' | 'mono'
  googleFontsUrl: string | null
  primaryWeight: number
}>> {
  const raw = await page.evaluate(() => {
    function fontFrom(el: Element | null): { family: string; weight: number } | null {
      if (!el) return null
      const style = getComputedStyle(el)
      const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
      const weight = parseInt(style.fontWeight, 10) || 400
      if (!family || family === 'serif' || family === 'sans-serif' || family === 'monospace') return null
      return { family, weight }
    }

    const gfLinks = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'))
      .map(l => (l as HTMLLinkElement).href)

    return {
      heading: fontFrom(document.querySelector('h1')),
      body: fontFrom(document.querySelector('p') ?? document.body),
      mono: fontFrom(document.querySelector('code, pre')),
      gfLinks,
    }
  })

  const results: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
  }> = []

  for (const [role, data] of [
    ['heading', raw.heading],
    ['body', raw.body],
    ['mono', raw.mono],
  ] as const) {
    if (!data) continue
    const googleFontsUrl = raw.gfLinks.find(url =>
      url.toLowerCase().includes(data.family.toLowerCase().replace(/\s+/g, '+'))
    ) ?? null

    results.push({
      fontFamily: data.family,
      role,
      googleFontsUrl,
      primaryWeight: data.weight,
    })
  }

  return results
}
```

- [ ] **Step 2: Save typography transactionally in extract route**

Use `Client` for transaction safety (same pattern as Task 7). Note: `role` is NEVER NULL — the unique constraint relies on this.

```typescript
// In app/api/design/extract/route.ts
if (typographyRoles.length > 0) {
  const client = new Client(process.env.DATABASE_URL!)
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM design_typography WHERE source_id = $1 AND role != $2',
      [sourceId, 'legacy']  // preserve legacy rows, replace role-aware ones
    )
    for (const t of typographyRoles) {
      await client.query(
        `INSERT INTO design_typography (source_id, font_family, role, google_fonts_url, primary_weight)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_id, role) DO UPDATE SET
           font_family = EXCLUDED.font_family,
           google_fonts_url = EXCLUDED.google_fonts_url,
           primary_weight = EXCLUDED.primary_weight`,
        [sourceId, t.fontFamily, t.role, t.googleFontsUrl, t.primaryWeight]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[typography] Transaction rolled back:', err)
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 4: Test**

```bash
curl -X POST http://localhost:3000/api/design/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vercel.com"}'
```

```sql
SELECT font_family, role, google_fonts_url, primary_weight
FROM design_typography
WHERE source_id = (SELECT MAX(id) FROM design_sources);
```

Expected: rows with role = 'heading', 'body', 'mono', correct font families, `primary_weight` as integer.

- [ ] **Step 5: Commit**

```bash
git add lib/browser-extraction.ts app/api/design/extract/route.ts
git commit -m "feat: role-aware typography extraction — heading/body/mono with Google Fonts URL"
```

---

## Chunk 4: Detail API Endpoint

### Task 9: GET /api/design/[id]

**Files:**
- Create: `app/api/design/[id]/route.ts`

- [ ] **Step 1: Verify no route conflict**

```bash
ls "/Users/v/hitman's library/app/api/design/"
```

Confirm there is no existing `[id]` directory. If a `delete/route.ts` or similar exists, check the routing won't conflict.

- [ ] **Step 2: Create the endpoint**

```typescript
// app/api/design/[id]/route.ts
import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const sources = await sql`
      SELECT id, source_url, screenshot_url, created_at
      FROM design_sources WHERE id = ${id}
    `
    // Note: quality_score was added to design_sources in migration 006.
    // If migration has not run yet, this column will be null — that is safe.
    if (!sources.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [colors, typography, assets] = await Promise.all([
      sql`SELECT hex_value, oklch FROM design_colors WHERE source_id = ${id} ORDER BY id`,
      sql`
        SELECT font_family, role, google_fonts_url, primary_weight
        FROM design_typography WHERE source_id = ${id} AND role != 'legacy'
        ORDER BY CASE role WHEN 'heading' THEN 1 WHEN 'body' THEN 2 WHEN 'mono' THEN 3 ELSE 4 END
      `,
      sql`
        SELECT id, type, content, width, height
        FROM design_assets WHERE source_id = ${id}
        ORDER BY type, id
      `,
    ])

    const source = sources[0]
    return NextResponse.json({
      id: source.id,
      url: source.source_url,
      screenshot_url: source.screenshot_url ?? null,
      created_at: source.created_at,
      colors,
      typography,
      assets,
    })
  } catch (err) {
    console.error('[GET /api/design/[id]]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Test**

```bash
# Replace 1 with a real source ID
curl http://localhost:3000/api/design/1 | jq .
```

Expected: JSON with `id`, `url`, `screenshot_url`, `colors`, `typography`, `assets` arrays.

- [ ] **Step 4: Commit**

```bash
git add "app/api/design/[id]/route.ts"
git commit -m "feat: GET /api/design/[id] — full detail endpoint"
```

---

## Chunk 5: Panel UI Components

### Task 10: Tab bar component

**Files:**
- Create: `components/panel-tabs.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/panel-tabs.tsx
'use client'

export type PanelTab = 'preview' | 'colors' | 'type' | 'assets'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
}

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Type' },
  { key: 'assets', label: 'Assets' },
]

export function PanelTabs({ active, onChange }: PanelTabsProps) {
  return (
    <div
      className="flex border-b border-border"
      style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={[
            'flex-shrink-0 px-4 py-2.5 text-xs tracking-wide transition-colors -mb-px border-b-2',
            active === key
              ? 'text-foreground border-foreground'
              : 'text-muted-foreground border-transparent hover:text-foreground',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 3: Commit**

```bash
git add components/panel-tabs.tsx
git commit -m "feat: PanelTabs — 4-tab bar, scrollable on mobile"
```

---

### Task 11: Preview tab

**Files:**
- Create: `components/preview-tab.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/preview-tab.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface PreviewTabProps {
  screenshotUrl: string | null
  siteUrl: string
}

export function PreviewTab({ screenshotUrl, siteUrl }: PreviewTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    setShowHint(true)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [screenshotUrl])

  function handleScroll() {
    if (scrollRef.current?.scrollTop && scrollRef.current.scrollTop > 50) {
      setShowHint(false)
    }
  }

  if (!screenshotUrl) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <div className="w-full rounded-md border border-border p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            {(() => { try { return new URL(siteUrl).hostname } catch { return siteUrl } })()}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">Screenshot unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={`Screenshot of ${siteUrl}`}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center pb-2 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)',
          opacity: showHint ? 1 : 0,
        }}
      >
        <span className="font-mono text-[10px] text-muted-foreground/40">
          scroll to explore ↓
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm type-check
git add components/preview-tab.tsx
git commit -m "feat: PreviewTab — scrollable screenshot with scroll hint"
```

---

### Task 12: Colors tab

**Files:**
- Create: `components/colors-tab.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/colors-tab.tsx
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ColorRow {
  hex_value: string
  oklch: string | null
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      {copied
        ? <Check className="w-3 h-3 text-foreground" />
        : <Copy className="w-3 h-3" />}
    </button>
  )
}

export function ColorsTab({ colors }: { colors: ColorRow[] }) {
  if (!colors.length) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <p className="text-xs text-muted-foreground">No colors extracted</p>
      </div>
    )
  }

  const sorted = [...colors].sort((a, b) => {
    const lA = a.oklch ? parseFloat(a.oklch.match(/oklch\(([\d.]+)/)?.[1] ?? '50') : 50
    const lB = b.oklch ? parseFloat(b.oklch.match(/oklch\(([\d.]+)/)?.[1] ?? '50') : 50
    return lA - lB
  })

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Brand colors</span>
        <span className="text-[9px] text-muted-foreground/40 bg-secondary border border-border rounded-full px-2 py-0.5">
          {colors.length}
        </span>
      </div>

      {sorted.map((color, i) => (
        <div
          key={i}
          className="group flex items-center gap-3 bg-secondary/50 border border-border rounded-md px-3 py-2 hover:border-border/80 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-md flex-shrink-0 border border-white/[0.08]"
            style={{ background: color.hex_value }}
          />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-foreground">{color.hex_value}</span>
              <CopyBtn value={color.hex_value} />
            </div>
            {color.oklch && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted-foreground truncate pr-1">{color.oklch}</span>
                <CopyBtn value={color.oklch} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm type-check
git add components/colors-tab.tsx
git commit -m "feat: ColorsTab — HEX + OKLCH rows with individual copy buttons"
```

---

### Task 13: Type tab

**Files:**
- Create: `components/type-specimen-card.tsx`
- Create: `components/type-tab.tsx`

- [ ] **Step 1: Create specimen card**

```tsx
// components/type-specimen-card.tsx
'use client'

import { useEffect, useState } from 'react'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

const ROLE_LABELS: Record<string, string> = {
  heading: 'Heading',
  body: 'Body',
  mono: 'Monospace',
}

const FALLBACKS: Record<string, string> = {
  heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "Geist Mono", monospace',
}

export function TypeSpecimenCard({ typography, index }: { typography: TypographyRow; index: number }) {
  const [fontLoaded, setFontLoaded] = useState(!typography.google_fonts_url)

  useEffect(() => {
    if (!typography.google_fonts_url) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = typography.google_fonts_url
    link.onload = () => setFontLoaded(true)
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch {} }
  }, [typography.google_fonts_url])

  const weight = typography.primary_weight ?? 400
  const fontFamily = `"${typography.font_family}", ${FALLBACKS[typography.role] ?? 'sans-serif'}`

  return (
    <div
      className="border border-border rounded-md p-4 flex flex-col gap-3"
      style={{ animationDelay: `${index * 60}ms`, animation: 'fade-in-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">
          {ROLE_LABELS[typography.role] ?? typography.role} — {typography.font_family}
        </span>
        {typography.google_fonts_url && (
          <span className="text-[8px] text-muted-foreground/40 border border-border rounded px-1.5 py-0.5">
            Google Fonts
          </span>
        )}
      </div>

      <div style={{ fontFamily, fontSize: 48, fontWeight: weight, lineHeight: 1, opacity: fontLoaded ? 1 : 0.3, transition: 'opacity 0.3s' }}>
        Aa
      </div>

      <p style={{ fontFamily, fontSize: 16, fontWeight: weight, color: 'var(--muted-foreground)', margin: 0 }}>
        The quick brown fox jumps
      </p>

      <p style={{ fontFamily, fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)', opacity: 0.5, margin: 0, letterSpacing: '0.05em' }}>
        A B C D E F G H I J K L M
      </p>

      <div className="flex gap-1.5">
        <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-foreground text-foreground">
          {weight}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create type tab wrapper**

```tsx
// components/type-tab.tsx
'use client'

import { TypeSpecimenCard } from './type-specimen-card'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

export function TypeTab({ typography }: { typography: TypographyRow[] }) {
  if (!typography.length) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <p className="text-xs text-muted-foreground">No typography extracted</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      {typography.slice(0, 3).map((t, i) => (
        <TypeSpecimenCard key={`${t.role}-${i}`} typography={t} index={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm type-check
git add components/type-specimen-card.tsx components/type-tab.tsx
git commit -m "feat: TypeSpecimenCard + TypeTab — specimen cards with Google Fonts loading"
```

---

### Task 14: Assets tab

**Files:**
- Create: `components/assets-tab.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/assets-tab.tsx
'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

interface Asset {
  id: number
  type: 'logo' | 'icon' | 'illustration' | 'image'
  content: string
  width: number
  height: number
}

function isSvg(content: string) {
  return content.trimStart().toLowerCase().startsWith('<svg')
}

function useClipboard() {
  const [copiedId, setCopiedId] = useState<number | string | null>(null)
  async function copy(id: number | string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }
  return { copiedId, copy }
}

const CHECKERBOARD = {
  backgroundImage: `
    linear-gradient(45deg,#1a1a1a 25%,transparent 25%),
    linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#1a1a1a 75%),
    linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)
  `,
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px',
  backgroundColor: '#111',
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">{label}</span>
      <span className="text-[9px] text-muted-foreground/40 bg-secondary border border-border rounded-full px-2 py-0.5">{count}</span>
    </div>
  )
}

function LogoSection({ logos }: { logos: Asset[] }) {
  const { copiedId, copy } = useClipboard()
  return (
    <div>
      <SectionLabel label="Logo" count={logos.length} />
      <div className="flex gap-2 flex-wrap mt-2">
        {logos.map(logo => (
          <button
            key={logo.id}
            onClick={() => copy(logo.id, logo.content)}
            className="relative group border border-border rounded-md p-3 hover:border-foreground/30 transition-colors"
            style={CHECKERBOARD}
            title={isSvg(logo.content) ? 'Copy SVG' : 'Copy URL'}
          >
            {isSvg(logo.content) ? (
              <div
                className="h-10 min-w-[60px] max-w-[140px] flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: logo.content }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.content} alt="Logo" className="h-10 max-w-[140px] object-contain" />
            )}
            {copiedId === logo.id && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                <span className="font-mono text-[9px] text-foreground">copied</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function AssetItem({ asset, size, index }: { asset: Asset; size: 'sm' | 'md'; index: number }) {
  const { copiedId, copy } = useClipboard()
  const animDelay = Math.min(index, 11) * 30

  function handleClick() {
    if (asset.type === 'image') window.open(asset.content, '_blank')
    else copy(asset.id, asset.content)
  }

  return (
    <div
      className="group relative border border-border rounded-md overflow-hidden bg-secondary/30 cursor-pointer hover:border-foreground/30 transition-colors"
      style={{ animationDelay: `${animDelay}ms`, animation: 'scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      onClick={handleClick}
    >
      <div className={`${size === 'sm' ? 'h-11' : 'h-20'} flex items-center justify-center p-1`}>
        {isSvg(asset.content) ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: asset.content }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.content} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
      {asset.type !== 'image' && (
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background border border-border rounded p-0.5">
            <Copy className="w-2.5 h-2.5 text-muted-foreground" />
          </div>
        </div>
      )}
      {copiedId === asset.id && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <span className="font-mono text-[9px] text-foreground">copied</span>
        </div>
      )}
    </div>
  )
}

function AssetSection({
  label, assets, type, cols, size,
}: {
  label: string
  assets: Asset[]
  type: Asset['type']
  cols: string
  size: 'sm' | 'md'
}) {
  const filtered = assets.filter(a => a.type === type)
  if (!filtered.length) return null
  return (
    <div>
      <SectionLabel label={label} count={filtered.length} />
      <div className={`grid ${cols} gap-1.5 mt-2`}>
        {filtered.map((asset, i) => (
          <AssetItem key={asset.id} asset={asset} size={size} index={i} />
        ))}
      </div>
    </div>
  )
}

export function AssetsTab({ assets }: { assets: Asset[] }) {
  const logos = assets.filter(a => a.type === 'logo')

  if (!assets.length) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <p className="text-xs text-muted-foreground">No assets extracted</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto">
      {logos.length > 0 && <LogoSection logos={logos} />}
      <AssetSection label="Icons" assets={assets} type="icon" cols="grid-cols-5 sm:grid-cols-4" size="sm" />
      <AssetSection label="Illustrations" assets={assets} type="illustration" cols="grid-cols-3 sm:grid-cols-2" size="md" />
      <AssetSection label="Images" assets={assets} type="image" cols="grid-cols-3 sm:grid-cols-2" size="md" />
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm type-check
git add components/assets-tab.tsx
git commit -m "feat: AssetsTab — logo (checkerboard), icons, illustrations, images grids"
```

---

## Chunk 6: Wire Into the Gallery

### Task 15: Site detail panel + gallery integration

**Files:**
- Create: `components/site-detail-panel.tsx`
- Modify: `components/design-browser.tsx` (or `app/page.tsx` — check which holds the card click handler)

- [ ] **Step 1: Read design-browser.tsx and app/page.tsx**

Open both files. Identify:
1. How gallery cards are rendered and what data they expose (`id` field)
2. Where the existing detail panel / sheet / drawer is opened on card click
3. Whether there is an existing `selectedSource` state or similar

- [ ] **Step 2: Create site-detail-panel.tsx**

```tsx
// components/site-detail-panel.tsx
'use client'

import { useState, useEffect } from 'react'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { AssetsTab } from './assets-tab'

interface Asset { id: number; type: 'logo' | 'icon' | 'illustration' | 'image'; content: string; width: number; height: number }
interface ColorRow { hex_value: string; oklch: string | null }
interface TypographyRow { font_family: string; role: string; google_fonts_url: string | null; primary_weight: number | null }

interface DetailData {
  id: number
  url: string
  screenshot_url: string | null
  colors: ColorRow[]
  typography: TypographyRow[]
  assets: Asset[]
}

interface SiteDetailPanelProps {
  sourceId: number
  onClose?: () => void
}

export function SiteDetailPanel({ sourceId, onClose }: SiteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('preview')
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setActiveTab('preview')
    setData(null)
    fetch(`/api/design/${sourceId}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sourceId])

  const hostname = (() => {
    try { return data?.url ? new URL(data.url).hostname : '…' } catch { return data?.url ?? '…' }
  })()

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{hostname}</p>
          <p className="font-mono text-[10px] text-muted-foreground truncate">{data?.url ?? ''}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-3 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0">
        <PanelTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="flex flex-col flex-1 min-h-0">
          {activeTab === 'preview' && <PreviewTab screenshotUrl={data.screenshot_url} siteUrl={data.url} />}
          {activeTab === 'colors' && <ColorsTab colors={data.colors} />}
          {activeTab === 'type' && <TypeTab typography={data.typography} />}
          {activeTab === 'assets' && <AssetsTab assets={data.assets} />}
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 p-8">
          <p className="text-xs text-muted-foreground">Failed to load</p>
        </div>
      )}

      {/* Footer — always visible, shared across all tabs */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <a
          href={data?.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full text-xs border border-border rounded-md py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors font-mono"
        >
          ↗ Visit site
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire SiteDetailPanel into the gallery**

Based on what you found in Step 1, update the card click handler to open `SiteDetailPanel` with the selected `sourceId`. Common patterns:

**If using a drawer (vaul):**
```tsx
// In the parent component managing the sheet:
const [selectedId, setSelectedId] = useState<number | null>(null)

// Card onClick:
onClick={() => setSelectedId(card.id)}

// Sheet content:
{selectedId && <SiteDetailPanel sourceId={selectedId} onClose={() => setSelectedId(null)} />}
```

**If using a sidebar on desktop:**
```tsx
// Right panel ~400px on lg+, full-width bottom sheet on mobile
<div className="hidden lg:block w-[400px] border-l border-border h-full">
  {selectedId && <SiteDetailPanel sourceId={selectedId} />}
</div>
```

Follow the existing pattern in the codebase — do not introduce a new drawer library.

- [ ] **Step 4: End-to-end test**

```bash
pnpm dev
```

1. Open the gallery at `http://localhost:3000`
2. Click a card → SiteDetailPanel opens
3. Preview tab: screenshot visible (or placeholder if not yet extracted)
4. Colors tab: HEX + OKLCH rows, copy buttons appear on hover
5. Type tab: specimen cards animate in, "Aa" renders in correct font
6. Assets tab: logo on checkerboard, icon grid, illustration grid, images
7. Visit site footer: opens correct URL in new tab
8. Mobile: confirm panel opens as bottom sheet, tabs scroll horizontally

- [ ] **Step 5: Type-check + lint**

```bash
pnpm type-check
pnpm lint
```

Fix any issues before committing.

- [ ] **Step 6: Commit**

```bash
git add components/site-detail-panel.tsx components/design-browser.tsx app/page.tsx
git commit -m "feat: SiteDetailPanel — 4-tab detail view wired into gallery"
```

---

### Task 16: Reduced-motion + final build check

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add reduced-motion overrides**

In `app/globals.css`, add to the existing `@media (prefers-reduced-motion: reduce)` block (or create it if missing):

```css
@media (prefers-reduced-motion: reduce) {
  /* New panel components use inline animation styles — override them */
  [style*="fade-in-up"],
  [style*="scale-in"] {
    animation-duration: 0.15s !important;
    animation-timing-function: ease !important;
  }
}
```

- [ ] **Step 2: Test in Chrome DevTools**

DevTools → Rendering → Emulate CSS media: `prefers-reduced-motion: reduce`. Open panel, switch tabs — no translateY transforms, only opacity transitions.

- [ ] **Step 3: Production build**

```bash
pnpm build
```

Expected: clean build, zero TypeScript errors, no "missing env" warnings (set all required env vars). Fix any build errors before considering this task done.

- [ ] **Step 4: Final commit**

```bash
git add app/globals.css
git commit -m "feat: reduced-motion support + production build verified"
```

---

## File Summary

### New files
| File | Purpose |
|---|---|
| `lib/color-utils.ts` | HEX↔OKLCH conversion, perceptual dedup |
| `lib/asset-extraction.ts` | Logo, SVG, image extraction via Puppeteer |
| `scripts/006-add-screenshot-assets.sql` | DB migration |
| `app/api/design/[id]/route.ts` | Full detail endpoint |
| `components/panel-tabs.tsx` | 4-tab bar |
| `components/preview-tab.tsx` | Scrollable screenshot tab |
| `components/colors-tab.tsx` | HEX + OKLCH rows |
| `components/type-specimen-card.tsx` | Font specimen card |
| `components/type-tab.tsx` | Type tab wrapper |
| `components/assets-tab.tsx` | Logo + icons + illustrations + images |
| `components/site-detail-panel.tsx` | Main 4-tab panel |

### Modified files
| File | Change |
|---|---|
| `package.json` | Add culori, @vercel/blob |
| `app/layout.tsx` | Switch to Geist Mono, remove old mono font |
| `app/globals.css` | Geist Mono variable, reduced-motion |
| `lib/browser-extraction.ts` | Brand colors, screenshot, typography, page orchestrator |
| `app/api/design/extract/route.ts` | Wire all new extractors |
| `components/design-browser.tsx` | Card click → SiteDetailPanel |
| `app/page.tsx` | selectedId state + panel render |
