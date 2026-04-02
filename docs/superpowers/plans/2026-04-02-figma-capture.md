# Figma Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-click "Copy to Figma" button on every site card that writes editable Figma layers to the clipboard — no bookmarklet, no visiting the live site, works on desktop and mobile web.

**Architecture:** During Puppeteer extraction we already have the page open. We bypass CSP (`page.setBypassCSP(true)`), inject Figma's public `capture.js`, intercept the `navigator.clipboard.write()` call before it fires, and store the `text/html` blob to Vercel Blob. The URL is saved in a new `figma_capture_url` column. The frontend fetches that blob on demand, writes it to clipboard with `ClipboardItem({ 'text/html': ... })`, and the user pastes editable layers directly into Figma.

**Why this works:** `capture.js` writes `text/html` containing base64 JSON between `<!--(figh2d)..(/figh2d)-->` markers. Figma parses this on paste — it doesn't validate clipboard origin or session. Re-serving the stored HTML and re-writing it to clipboard is identical to the bookmarklet flow from Figma's perspective.

**Tech Stack:** Next.js 16, Puppeteer + Sparticuz Chromium, Vercel Blob (`@vercel/blob`), Neon PostgreSQL

---

## File Map

| File | What changes |
|------|-------------|
| `scripts/010-figma-capture.sql` | Add `figma_capture_url TEXT` column to `design_sources` |
| `lib/browser-extraction.ts` | Add `captureFigmaLayers(page, url)` function; update `extractFullDesignData` to call it and return result; update `FullExtractionResult` interface |
| `app/api/design/extract/route.ts` | Save `figma_capture_url` from extraction result |
| `app/api/design/[id]/reextract/route.ts` | Same — save on re-extract |
| `app/api/design/[id]/route.ts` | Include `figma_capture_url` in GET response |
| `app/api/admin/figma-backfill/route.ts` | **New** — capture Figma layers for one site by ID (used by admin for backfill) |
| `app/admin/page.tsx` | Add `figma_capture_url` to Site interface + backfill button |
| `app/api/design/list/route.ts` | Include `figma_capture_url` in list response |
| `components/site-detail-panel.tsx` | Add "Copy to Figma" button in footer; update `DetailData` interface |

---

## Task 1: Database Migration

**Files:**
- Create: `scripts/010-figma-capture.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS figma_capture_url TEXT;
```

- [ ] **Step 2: Run it**

```bash
psql $DATABASE_URL -f scripts/010-figma-capture.sql
```

Expected: `ALTER TABLE`

- [ ] **Step 3: Commit**

```bash
git add scripts/010-figma-capture.sql
git commit -m "feat(db): add figma_capture_url column to design_sources"
```

---

## Task 2: captureFigmaLayers Function

**Files:**
- Modify: `lib/browser-extraction.ts`

**Context:** `extractFullDesignData` at line 532 manages the Puppeteer page lifecycle. We add `captureFigmaLayers(page, url)` which: overrides `navigator.clipboard.write` on the page, injects `capture.js`, triggers capture via hash, waits for the intercepted data, uploads to Vercel Blob, and returns the blob URL.

**Critical ordering:** `page.setBypassCSP(true)` must be called before `page.goto()`. This change must be applied to `extractFullDesignData`'s page setup. Currently line 541 is `await page.setViewport(...)` — `setBypassCSP` goes before it but after `browser.newPage()`.

- [ ] **Step 1: Add setBypassCSP to extractFullDesignData**

In `extractFullDesignData` (line 538), change:
```ts
const page = await browser.newPage()

try {
  await page.setViewport({ width: 1440, height: 900 })
```
To:
```ts
const page = await browser.newPage()

try {
  await page.setBypassCSP(true)
  await page.setViewport({ width: 1440, height: 900 })
```

- [ ] **Step 2: Add captureFigmaLayers function after captureFullPageScreenshot**

After `captureFullPageScreenshot` (around line 463), add:

```ts
export async function captureFigmaLayers(
  page: Page,
  siteUrl: string
): Promise<string | null> {
  try {
    // Override clipboard.write to intercept the figma data before it fires
    await page.evaluate(() => {
      (window as any).__figmaCapture = null
      const originalWrite = navigator.clipboard.write.bind(navigator.clipboard)
      navigator.clipboard.write = async (items: ClipboardItem[]) => {
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html')
            ;(window as any).__figmaCapture = await blob.text()
          }
        }
      }
    })

    // Inject capture.js (CSP already bypassed)
    await page.addScriptTag({
      url: 'https://mcp.figma.com/mcp/html-to-design/capture.js',
    })

    // Wait for script to initialise, then trigger via hash
    await new Promise(r => setTimeout(r, 800))
    await page.evaluate(() => {
      window.location.hash = 'figmacapture&figmadelay=500'
    })

    // Wait for clipboard intercept (up to 20s)
    await page.waitForFunction(
      '(window as any).__figmaCapture !== null',
      { timeout: 20000 }
    )

    const figmaHtml = await page.evaluate(
      '(window as any).__figmaCapture'
    ) as string

    if (!figmaHtml) return null

    // Upload to Vercel Blob
    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `figma/${hostname}-${Date.now()}.html`
    const blob = await put(filename, figmaHtml, {
      access: 'public',
      contentType: 'text/html',
    })

    return blob.url
  } catch (err) {
    console.error('[figma-capture] failed:', err)
    return null
  }
}
```

- [ ] **Step 3: Add figmaCaptureUrl to FullExtractionResult interface (line 520)**

```ts
export interface FullExtractionResult {
  colors: string[]
  screenshotUrl: string | null
  mobileScreenshotUrl: string | null
  figmaCaptureUrl: string | null       // ← add
  assets: import('./asset-extraction').ExtractedAsset[]
  typography: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
  }>
}
```

- [ ] **Step 4: Update all early-return stubs in extractFullDesignData**

Add `figmaCaptureUrl: null` to both early-return objects:
```ts
return { colors: [], screenshotUrl: null, mobileScreenshotUrl: null, figmaCaptureUrl: null, assets: [], typography: [] }
```

- [ ] **Step 5: Call captureFigmaLayers in extractFullDesignData — after the Promise.all**

`captureFigmaLayers` must run after `captureFullPageScreenshot` and `captureMobileScreenshot` since it changes the hash and page state. Add it after `mobileScreenshotUrl`:

```ts
const [colors, screenshotUrl, assets, typography] = await Promise.all([...])

const mobileScreenshotUrl = await captureMobileScreenshot(page, url)
const figmaCaptureUrl = await captureFigmaLayers(page, url)

return { colors, screenshotUrl, mobileScreenshotUrl, figmaCaptureUrl, assets, typography }
```

- [ ] **Step 6: Commit**

```bash
git add lib/browser-extraction.ts
git commit -m "feat: add captureFigmaLayers — intercepts capture.js clipboard write during extraction"
```

---

## Task 3: Save figma_capture_url in Extract + Reextract Routes

**Files:**
- Modify: `app/api/design/extract/route.ts`
- Modify: `app/api/design/[id]/reextract/route.ts`

- [ ] **Step 1: Save in extract/route.ts**

Find the `UPDATE design_sources SET screenshot_url = ...` query and extend:
```ts
await sql`
  UPDATE design_sources
  SET screenshot_url = ${extractionResult.screenshotUrl},
      mobile_screenshot_url = ${extractionResult.mobileScreenshotUrl},
      figma_capture_url = ${extractionResult.figmaCaptureUrl}
  WHERE id = ${sourceId}
`
```

- [ ] **Step 2: Same in reextract/route.ts**

Find the equivalent UPDATE and add `figma_capture_url = ${extractionResult.figmaCaptureUrl}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/design/extract/route.ts app/api/design/[id]/reextract/route.ts
git commit -m "feat: save figma_capture_url on extract and reextract"
```

---

## Task 4: Expose via APIs

**Files:**
- Modify: `app/api/design/[id]/route.ts`
- Modify: `app/api/design/list/route.ts`

- [ ] **Step 1: Add to GET /api/design/[id]**

In the SELECT:
```ts
SELECT id, source_url, screenshot_url, mobile_screenshot_url, figma_capture_url, created_at,
       metadata->>'extraction_error' as extraction_error
FROM design_sources WHERE id = ${id}
```

In the JSON response:
```ts
figma_capture_url: source.figma_capture_url ?? null,
```

- [ ] **Step 2: Add to /api/design/list**

Add `figma_capture_url` to all 4 SELECT branches and the `.map()` return:
```ts
figma_capture_url: row.figma_capture_url ?? null,
```

- [ ] **Step 3: Commit**

```bash
git add app/api/design/[id]/route.ts app/api/design/list/route.ts
git commit -m "feat: include figma_capture_url in design API responses"
```

---

## Task 5: "Copy to Figma" Button in Detail Panel

**Files:**
- Modify: `components/site-detail-panel.tsx`

**Context:** The detail panel footer (line 169) has a "Visit site" button and a "Re-extract" button. We add "Copy to Figma" next to them. It only renders when `data.figma_capture_url` is non-null.

The button fetches the stored HTML blob and writes it to clipboard using `ClipboardItem` with `text/html`. This is identical to what `capture.js` does natively — Figma sees the same clipboard content either way.

- [ ] **Step 1: Add figma_capture_url to DetailData interface**

```ts
interface DetailData {
  id: number
  url: string
  screenshot_url: string | null
  mobile_screenshot_url: string | null
  figma_capture_url: string | null      // ← add
  extraction_error: string | null
  colors: ColorRow[]
  typography: TypographyRow[]
  assets: AssetRow[]
}
```

- [ ] **Step 2: Add copyToFigma handler**

Inside `SiteDetailPanel`, add:

```tsx
const [figmaCopied, setFigmaCopied] = useState(false)
const [figmaCopying, setFigmaCopying] = useState(false)

async function copyToFigma() {
  if (!data?.figma_capture_url || figmaCopying) return
  setFigmaCopying(true)
  try {
    const res = await fetch(data.figma_capture_url)
    const html = await res.text()
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
    ])
    setFigmaCopied(true)
    setTimeout(() => setFigmaCopied(false), 2000)
  } catch (err) {
    console.error('[copy-to-figma]', err)
  } finally {
    setFigmaCopying(false)
  }
}
```

- [ ] **Step 3: Add the button to the footer**

In the footer `<div>` (line 169), add alongside the existing buttons:

```tsx
{data.figma_capture_url && (
  <button
    onClick={copyToFigma}
    disabled={figmaCopying}
    className="flex items-center justify-center gap-1.5 flex-1 text-xs border border-border rounded-md py-2 min-h-[44px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors font-mono disabled:opacity-50"
  >
    {figmaCopying ? '···' : figmaCopied ? '✓ Copied' : 'Copy to Figma'}
  </button>
)}
```

- [ ] **Step 4: Verify in browser**

1. Re-extract a site (new sites get Figma capture automatically)
2. Open the detail panel — footer should show "Copy to Figma" button
3. Click it — open Figma, ⌘V — verify editable layers appear (text, frames, etc.)
4. Old sites without `figma_capture_url` should show no button (graceful)

- [ ] **Step 5: Commit**

```bash
git add components/site-detail-panel.tsx
git commit -m "feat: copy to figma button in detail panel — one-click editable layers"
```

---

## Task 6: Backfill for Existing Sites

**Files:**
- Create: `app/api/admin/figma-backfill/route.ts`
- Modify: `app/admin/page.tsx`

**Context:** Same pattern as mobile backfill. Lightweight endpoint opens the site, runs `captureFigmaLayers`, saves the URL. Admin processes sites sequentially.

- [ ] **Step 1: Create app/api/admin/figma-backfill/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getBrowser, captureFigmaLayers } from '@/lib/browser-extraction'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sources = await sql`SELECT id, source_url FROM design_sources WHERE id = ${id}`
  if (!sources.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { source_url } = sources[0]
  const browser = await getBrowser()
  if (!browser) return NextResponse.json({ error: 'Browser unavailable' }, { status: 500 })

  const page = await browser.newPage()
  try {
    await page.setBypassCSP(true)
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(source_url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 3000))

    const figmaCaptureUrl = await captureFigmaLayers(page, source_url)
    if (figmaCaptureUrl) {
      await sql`UPDATE design_sources SET figma_capture_url = ${figmaCaptureUrl} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true, figma_capture_url: figmaCaptureUrl })
  } catch (err) {
    console.error('[figma-backfill]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await page.close()
  }
}
```

- [ ] **Step 2: Add figma_capture_url to Site interface in admin/page.tsx**

```ts
interface Site {
  // ... existing fields ...
  figma_capture_url?: string | null
}
```

- [ ] **Step 3: Add backfill state + handler to AdminPage**

```tsx
const [isFigmaBackfilling, setIsFigmaBackfilling] = useState(false)
const [figmaBackfillProgress, setFigmaBackfillProgress] = useState<{ done: number; total: number } | null>(null)

const handleFigmaBackfill = async () => {
  const missing = allSites.filter(s => s.screenshot_url && !s.figma_capture_url)
  if (!missing.length) return alert('All sites already have Figma capture data.')
  if (!confirm(`Capture Figma layers for ${missing.length} sites? Each takes ~15s.`)) return

  setIsFigmaBackfilling(true)
  setFigmaBackfillProgress({ done: 0, total: missing.length })

  for (let i = 0; i < missing.length; i++) {
    try {
      await fetch('/api/admin/figma-backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: missing[i].id }),
      })
    } catch { /* continue on failures */ }
    setFigmaBackfillProgress({ done: i + 1, total: missing.length })
  }

  setIsFigmaBackfilling(false)
  setFigmaBackfillProgress(null)
  await loadSites()
}
```

- [ ] **Step 4: Add "Backfill Figma" button to stats row**

Next to "Backfill mobile" button in the stats row:

```tsx
<button
  onClick={handleFigmaBackfill}
  disabled={isFigmaBackfilling}
  className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
>
  {isFigmaBackfilling
    ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {figmaBackfillProgress?.done}/{figmaBackfillProgress?.total}</>
    : 'Backfill Figma'
  }
</button>
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/figma-backfill/route.ts app/admin/page.tsx
git commit -m "feat: figma layers backfill in admin — captures existing sites sequentially"
```

---

## Task 7: Deploy

```bash
git push origin main
```

No new env vars. `BLOB_READ_WRITE_TOKEN` covers the new Figma HTML uploads.

**Failure modes to expect:**
- Sites with canvas/WebGL-heavy UIs (e.g. Spline, Three.js sites) — capture.js produces sparse or empty layers. Button won't appear (figma_capture_url stays null).
- Sites that block external script injection even with CSP bypassed (rare) — same, null result, no button.
- Very complex pages — Figma layer data can be 1–3MB. Vercel Blob handles this fine; clipboard write is fine up to browser memory limits.
