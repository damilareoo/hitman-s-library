# Mobile Screenshot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture a 390×844 mobile screenshot alongside the existing desktop screenshot, and add a Desktop/Mobile toggle to the preview tab.

**Architecture:** Four changes working together: (1) DB column, (2) capture function, (3) API saves mobile URL, (4) preview UI toggle. The mobile capture reuses the already-open Puppeteer page — resize viewport, screenshot, resize back. No new dependencies.

**Tech Stack:** Next.js 16 App Router, Puppeteer + Sparticuz Chromium, Vercel Blob, Neon PostgreSQL, Tailwind CSS v4

---

## File Map

| File | What changes |
|------|-------------|
| `scripts/009-mobile-screenshot.sql` | Add `mobile_screenshot_url` column to `design_sources` |
| `lib/browser-extraction.ts` | Add `captureMobileScreenshot(page, url)` function |
| `app/api/design/extract/route.ts` | Capture mobile after desktop, save URL |
| `app/api/design/[id]/reextract/route.ts` | Same — capture mobile on re-extract |
| `app/api/design/[id]/route.ts` | Include `mobile_screenshot_url` in GET response |
| `components/preview-tab.tsx` | Add Desktop/Mobile toggle, accept `mobileScreenshotUrl` prop |
| `components/site-detail-panel.tsx` | Pass `mobile_screenshot_url` to `PreviewTab` |

---

## Task 1: Database Migration

**Files:**
- Create: `scripts/009-mobile-screenshot.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS mobile_screenshot_url TEXT;
```

- [ ] **Step 2: Run the migration**

```bash
psql $DATABASE_URL -f scripts/009-mobile-screenshot.sql
```

Expected: `ALTER TABLE`

- [ ] **Step 3: Commit**

```bash
git add scripts/009-mobile-screenshot.sql
git commit -m "feat(db): add mobile_screenshot_url column to design_sources"
```

---

## Task 2: Mobile Capture Function

**Files:**
- Modify: `lib/browser-extraction.ts`

**Context:** `captureFullPageScreenshot(page, url)` at line 439 captures the page at whatever viewport is currently set (1440×900). We add a `captureMobileScreenshot(page, url)` that resizes to 390×844, captures, uploads, and resizes back. The blob filename uses a `-mobile` suffix.

**Important:** Mobile screenshots use `fullPage: false` — we capture just the viewport height. Most mobile designs don't have meaningful full-page content at mobile width and the files would be huge.

- [ ] **Step 1: Add captureMobileScreenshot after captureFullPageScreenshot (around line 463)**

```ts
export async function captureMobileScreenshot(
  page: Page,
  siteUrl: string
): Promise<string | null> {
  try {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    // Brief pause for responsive layout to settle
    await new Promise(r => setTimeout(r, 1200))

    const buffer = await page.screenshot({
      fullPage: false,
      type: 'webp',
      quality: 85,
    }) as Buffer

    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `screenshots/${hostname}-${Date.now()}-mobile.webp`

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/webp',
    })

    // Restore desktop viewport for any downstream operations
    await page.setViewport({ width: 1440, height: 900 })

    return blob.url
  } catch (err) {
    console.error('[screenshot] mobile capture failed:', err)
    return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/browser-extraction.ts
git commit -m "feat: add captureMobileScreenshot function (390x844, viewport only)"
```

---

## Task 3: Wire Mobile Screenshot into extractFullDesignData

**Files:**
- Modify: `lib/browser-extraction.ts` (FullExtractionResult interface + extractFullDesignData function)
- Modify: `app/api/design/extract/route.ts`
- Modify: `app/api/design/[id]/reextract/route.ts`

**Context:** `extract/route.ts` and `reextract/route.ts` never have direct access to a Puppeteer `page` object — they call the high-level `extractFullDesignData(url)` which manages the browser lifecycle internally. The correct place to add mobile capture is inside `extractFullDesignData`, then surface the result via `FullExtractionResult`.

`FullExtractionResult` is at `lib/browser-extraction.ts:520`. `extractFullDesignData` is at line 532. It does `Promise.all([colors, screenshot, assets, typography])` then closes the page.

**Important:** Mobile screenshot must run *after* `Promise.all` completes (not in parallel) because `captureMobileScreenshot` resizes the viewport to 390px and then restores it — doing this mid-Promise.all would corrupt the desktop capture.

- [ ] **Step 1: Add mobileScreenshotUrl to FullExtractionResult (lib/browser-extraction.ts:520)**

Change from:
```ts
export interface FullExtractionResult {
  colors: string[]
  screenshotUrl: string | null
  assets: import('./asset-extraction').ExtractedAsset[]
  typography: Array<{...}>
}
```
To:
```ts
export interface FullExtractionResult {
  colors: string[]
  screenshotUrl: string | null
  mobileScreenshotUrl: string | null
  assets: import('./asset-extraction').ExtractedAsset[]
  typography: Array<{...}>
}
```

- [ ] **Step 2: Update all early-return stubs in extractFullDesignData**

The function has two early returns that return partial objects (one when browser unavailable). Add `mobileScreenshotUrl: null` to both:
```ts
return { colors: [], screenshotUrl: null, mobileScreenshotUrl: null, assets: [], typography: [] }
```

- [ ] **Step 3: Call captureMobileScreenshot after Promise.all, before page.close()**

Change the `try` block in `extractFullDesignData` (lines 541–555) from:
```ts
const [colors, screenshotUrl, assets, typography] = await Promise.all([
  extractBrandColors(page),
  captureFullPageScreenshot(page, url),
  extractAssets(page, url),
  extractTypographyWithRoles(page),
])

return { colors, screenshotUrl, assets, typography }
```
To:
```ts
const [colors, screenshotUrl, assets, typography] = await Promise.all([
  extractBrandColors(page),
  captureFullPageScreenshot(page, url),
  extractAssets(page, url),
  extractTypographyWithRoles(page),
])

// Mobile capture after desktop — resizes viewport, must run sequentially
const mobileScreenshotUrl = await captureMobileScreenshot(page, url)

return { colors, screenshotUrl, mobileScreenshotUrl, assets, typography }
```

- [ ] **Step 4: Save mobileScreenshotUrl in extract/route.ts**

In `app/api/design/extract/route.ts`, find the `UPDATE design_sources SET screenshot_url = ...` query (around line 271). Extend it:
```ts
await sql`
  UPDATE design_sources
  SET screenshot_url = ${extractionResult.screenshotUrl},
      mobile_screenshot_url = ${extractionResult.mobileScreenshotUrl}
  WHERE id = ${sourceId}
`
```

- [ ] **Step 5: Same save in reextract/route.ts**

In `app/api/design/[id]/reextract/route.ts`, find where `screenshot_url` is saved after extraction and add `mobile_screenshot_url = ${extractionResult.mobileScreenshotUrl}` to the same UPDATE.

- [ ] **Step 6: Commit**

```bash
git add lib/browser-extraction.ts app/api/design/extract/route.ts app/api/design/[id]/reextract/route.ts
git commit -m "feat: capture and save mobile screenshot via extractFullDesignData"
```

---

## Task 4: Expose mobile_screenshot_url via API

**Files:**
- Modify: `app/api/design/[id]/route.ts`

**Context:** The GET handler at `app/api/design/[id]/route.ts` currently selects `screenshot_url` but not `mobile_screenshot_url`. Add it to both the SELECT and the JSON response.

- [ ] **Step 1: Update the SELECT query**

Change:
```ts
SELECT id, source_url, screenshot_url, created_at,
       metadata->>'extraction_error' as extraction_error
FROM design_sources WHERE id = ${id}
```
To:
```ts
SELECT id, source_url, screenshot_url, mobile_screenshot_url, created_at,
       metadata->>'extraction_error' as extraction_error
FROM design_sources WHERE id = ${id}
```

- [ ] **Step 2: Add to the JSON response**

In the `return NextResponse.json({...})` block, add:
```ts
mobile_screenshot_url: source.mobile_screenshot_url ?? null,
```

- [ ] **Step 3: Commit**

```bash
git add app/api/design/[id]/route.ts
git commit -m "feat: include mobile_screenshot_url in GET /api/design/[id] response"
```

---

## Task 5: Desktop/Mobile Toggle in Preview Tab

**Files:**
- Modify: `components/preview-tab.tsx`
- Modify: `components/site-detail-panel.tsx`

**Context:** `PreviewTab` currently accepts `screenshotUrl` (desktop). We add `mobileScreenshotUrl?: string | null`. When both are present, a Desktop/Mobile toggle appears at the top of the tab. The `screenshotUrl` state resets to desktop whenever a new site is selected.

- [ ] **Step 1: Update PreviewTab props and add viewport state**

Change the interface:
```ts
interface PreviewTabProps {
  screenshotUrl: string | null
  mobileScreenshotUrl?: string | null
  siteUrl: string
  extractionError?: string | null
}
```

Inside the component, add:
```tsx
const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')

// Reset to desktop when site changes
useEffect(() => {
  setViewport('desktop')
  setShowHint(true)
  setShowBackTop(false)
  if (scrollRef.current) scrollRef.current.scrollTop = 0
}, [screenshotUrl])
```

Replace the existing `useEffect` that resets scroll (it only reset on `screenshotUrl`) — the new one above covers it.

- [ ] **Step 2: Compute active URL and add toggle**

```tsx
const hasMobile = Boolean(mobileScreenshotUrl)
const activeUrl = hasMobile && viewport === 'mobile' ? mobileScreenshotUrl! : screenshotUrl
```

At the top of the scrollable area (just before the `<div ref={scrollRef}...>`), add the toggle only when both views are available:

```tsx
{hasMobile && (
  <div className="flex border-b border-border/40 shrink-0">
    <button
      onClick={() => setViewport('desktop')}
      className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${viewport === 'desktop' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
    >
      Desktop
    </button>
    <button
      onClick={() => setViewport('mobile')}
      className={`flex-1 py-1.5 text-[10px] font-mono border-l border-border/40 transition-colors ${viewport === 'mobile' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
    >
      Mobile
    </button>
  </div>
)}
```

Replace `screenshotUrl` with `activeUrl` in the `<img>` src.

- [ ] **Step 3: Add mobile_screenshot_url to DetailData in site-detail-panel.tsx**

`site-detail-panel.tsx` has a local `DetailData` interface at line 18. Add the new field:
```ts
interface DetailData {
  // ... existing fields ...
  screenshot_url: string | null
  mobile_screenshot_url: string | null   // ← add this
  // ...
}
```

- [ ] **Step 4: Pass mobileScreenshotUrl from SiteDetailPanel**

In `components/site-detail-panel.tsx`, find the `<PreviewTab>` usage and add the new prop:

```tsx
<PreviewTab
  screenshotUrl={data.screenshot_url}
  mobileScreenshotUrl={data.mobile_screenshot_url}
  siteUrl={data.url}
  extractionError={data.extraction_error}
/>
```

- [ ] **Step 5: Verify in browser**

1. Re-extract an existing site (mobile screenshot won't exist for old entries — only new extractions get it).
2. After re-extraction, open the detail panel. The Preview tab should show a Desktop/Mobile toggle.
3. Click Mobile — should show the 390px viewport screenshot.
4. Old sites without mobile screenshots show no toggle (graceful degradation).

- [ ] **Step 6: Commit**

```bash
git add components/preview-tab.tsx components/site-detail-panel.tsx
git commit -m "feat: desktop/mobile viewport toggle in preview tab"
```

---

## Task 6: Backfill Mobile Screenshots for Existing Sites

**Files:**
- Create: `app/api/admin/mobile-capture/route.ts`
- Modify: `app/admin/page.tsx`

**Context:** Old sites have `mobile_screenshot_url = NULL`. Full re-extraction is wasteful (re-runs colors, typography, assets, Puppeteer full-page). Instead, a dedicated lightweight endpoint takes a single `id`, opens the browser, navigates to the URL, captures mobile only, and saves. The admin runs this sequentially across all sites missing mobile screenshots using the same queue pattern as bulk add.

**Why not one big batch endpoint?** Vercel serverless functions have a 60s timeout. One site takes ~8–12s mobile. Processing all sites in one request would time out. Sequential calls from the client (one at a time) is the right pattern.

- [ ] **Step 1: Create app/api/admin/mobile-capture/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getBrowser } from '@/lib/browser-extraction'
import { captureMobileScreenshot } from '@/lib/browser-extraction'

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
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(source_url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 2000))

    const mobileUrl = await captureMobileScreenshot(page, source_url)
    if (mobileUrl) {
      await sql`UPDATE design_sources SET mobile_screenshot_url = ${mobileUrl} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true, mobile_screenshot_url: mobileUrl })
  } catch (err) {
    console.error('[mobile-capture]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await page.close()
  }
}
```

- [ ] **Step 2: Add backfill state and handler to AdminPage**

In `app/admin/page.tsx`, add state after the dedup state:

```tsx
const [isBackfilling, setIsBackfilling] = useState(false)
const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null)
```

Add the handler after `handleDeduplicate`:

```tsx
const handleBackfillMobile = async () => {
  // Find all sites that have a screenshot but no mobile screenshot
  const missing = allSites.filter(s => s.screenshot_url && !s.mobile_screenshot_url)
  if (!missing.length) return alert('All sites already have mobile screenshots.')
  if (!confirm(`Capture mobile screenshots for ${missing.length} sites? This will take a while.`)) return

  setIsBackfilling(true)
  setBackfillProgress({ done: 0, total: missing.length })

  for (let i = 0; i < missing.length; i++) {
    try {
      await fetch('/api/admin/mobile-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: missing[i].id }),
      })
    } catch { /* continue on individual failures */ }
    setBackfillProgress({ done: i + 1, total: missing.length })
  }

  setIsBackfilling(false)
  setBackfillProgress(null)
  await loadSites()
}
```

**Note:** `allSites` currently doesn't include `mobile_screenshot_url` — the list API (`/api/design/list`) must also return this field. Add it to the SELECT and mapping in Task 4 of this plan (the list route step).

- [ ] **Step 3: Update /api/design/list to include mobile_screenshot_url**

In `app/api/design/list/route.ts`, add `mobile_screenshot_url` to the SELECT and to the mapped return object:

```ts
// In all 4 query branches, add:
SELECT id, source_url, source_name, industry, metadata, tags, created_at,
       screenshot_url, thumbnail_url, mobile_screenshot_url  -- ← add this
FROM design_sources ...

// In the .map():
return {
  ...
  screenshot_url: row.screenshot_url ?? null,
  thumbnail_url: row.thumbnail_url ?? null,
  mobile_screenshot_url: row.mobile_screenshot_url ?? null,   // ← add this
  extraction_error: metadata.extraction_error ?? null,
}
```

Also add `mobile_screenshot_url?: string | null` to the `Site` interface at the top of `app/admin/page.tsx`.

- [ ] **Step 4: Add backfill button to stats row in admin**

Next to the "Remove duplicates" button in the stats row, add:

```tsx
<button
  onClick={handleBackfillMobile}
  disabled={isBackfilling}
  className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
>
  {isBackfilling
    ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {backfillProgress?.done}/{backfillProgress?.total}</>
    : 'Backfill mobile'
  }
</button>
```

- [ ] **Step 5: Verify in browser**

1. Open admin, click "Backfill mobile". Confirm prompt shows correct count.
2. Progress counter increments as each site is processed.
3. After completion, open detail panel for an old site — mobile toggle should appear in Preview tab.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/mobile-capture/route.ts app/api/design/list/route.ts app/admin/page.tsx
git commit -m "feat: backfill mobile screenshots for existing sites via admin"
```

---

## Task 8: Deploy

```bash
git push origin main
```

No new env vars required. `BLOB_READ_WRITE_TOKEN` and `DATABASE_URL` already cover all new operations.
