// lib/extraction-history.ts
// Append-only extraction snapshots (Phase 0).
//
// Every extraction run — initial add or re-extract — appends one row to
// extraction_history and repoints design_sources.current_extraction_id at
// it. The legacy per-source tables (design_colors, design_typography,
// design_assets, screenshot columns) are still written exactly as before,
// so the public view never changes: the history row is a snapshot, not a
// relocation. Reads prefer the pointed-to snapshot and fall back to legacy
// rows when the pointer is NULL (pre-migration data).
import { getSql } from '@/lib/db'
import { fetchImageInfo } from '@/lib/image-hash'

export const EXTRACTOR_VERSION = 'phase0-append-only'

const sql = getSql()

export interface ExtractionSnapshot {
  id: number
  site_id: number
  captured_at: string
  screenshot_url: string | null
  mobile_screenshot_url: string | null
  palette: Array<{ hex: string; oklch: string; area_share?: number | null }>
  typography: Array<{
    fontFamily: string
    role: string
    googleFontsUrl: string | null
    primaryWeight: number
    sampleSizePx?: number | null
    sampleLineHeight?: string | null
  }>
  assets: Array<Record<string, any>>
  screenshot_hash: string | null
  extractor_version?: string | null
}

/**
 * Append a snapshot and repoint the site at it. Never throws — a history
 * write must not fail an extraction that already succeeded.
 */
export async function recordExtraction(args: {
  siteId: number
  screenshotUrl: string | null
  mobileScreenshotUrl: string | null
  palette: Array<{ hex: string; oklch: string; area_share?: number | null }>
  typography: Array<{
    fontFamily: string
    role: string
    googleFontsUrl: string | null
    primaryWeight: number
    sampleSizePx?: number | null
    sampleLineHeight?: string | null
  }>
  assets: Array<Record<string, any>>
}): Promise<number | null> {
  // Hash the capture before inserting so the row lands complete in one
  // write. A missing hash (failed fetch, pre-migration rows) is fine —
  // drift falls back to palette + typography. The same fetch measures the
  // file size for the similarity blank-capture guard, at zero extra cost.
  let screenshotHash: string | null = null
  let screenshotBytes: number | null = null
  if (args.screenshotUrl) {
    const info = await fetchImageInfo(args.screenshotUrl)
    screenshotHash = info.hash
    screenshotBytes = info.bytes
  }
  try {
    const rows = await sql`
      INSERT INTO extraction_history (
        site_id, screenshot_url, mobile_screenshot_url,
        palette, typography, assets, extractor_version, screenshot_hash
      ) VALUES (
        ${args.siteId},
        ${args.screenshotUrl},
        ${args.mobileScreenshotUrl},
        ${JSON.stringify(args.palette)},
        ${JSON.stringify(args.typography)},
        ${JSON.stringify(args.assets)},
        ${EXTRACTOR_VERSION},
        ${screenshotHash}
      )
      RETURNING id
    `
    const historyId = rows[0]?.id as number | undefined
    if (historyId == null) return null
    await sql`
      UPDATE design_sources
      SET current_extraction_id = ${historyId},
          screenshot_bytes = COALESCE(${screenshotBytes}, screenshot_bytes)
      WHERE id = ${args.siteId}
    `.catch(() => null)
    return historyId
  } catch (err) {
    console.error('[extraction-history] record failed:', err)
    return null
  }
}

/** All snapshots for one site, oldest first — the History tab's timeline. */
export async function getSiteHistory(siteId: number): Promise<ExtractionSnapshot[]> {
  try {
    const rows = await sql`
      SELECT id, site_id, captured_at, screenshot_url, mobile_screenshot_url,
             palette, typography, screenshot_hash, extractor_version
      FROM extraction_history
      WHERE site_id = ${siteId}
      ORDER BY captured_at ASC, id ASC
      LIMIT 100
    `
    return rows.map((row: any) => ({
      id: Number(row.id),
      site_id: Number(row.site_id),
      captured_at: row.captured_at,
      screenshot_url: row.screenshot_url ?? null,
      mobile_screenshot_url: row.mobile_screenshot_url ?? null,
      palette: parseJsonArray(row.palette),
      typography: parseJsonArray(row.typography),
      assets: [],
      screenshot_hash: typeof row.screenshot_hash === 'string' ? row.screenshot_hash : null,
      extractor_version: typeof row.extractor_version === 'string' ? row.extractor_version : null,
    }))
  } catch (err) {
    console.error('[extraction-history] site history failed:', err)
    return []
  }
}

/** Bulk-load snapshots for the pointer-resolution step in reads. */
export async function getHistoriesByIds(ids: number[]): Promise<Map<number, ExtractionSnapshot>> {
  const out = new Map<number, ExtractionSnapshot>()
  if (ids.length === 0) return out
  try {
    const rows = await sql`
      SELECT id, site_id, captured_at, screenshot_url, mobile_screenshot_url,
             palette, typography, screenshot_hash
      FROM extraction_history
      WHERE id = ANY(${ids}::int[])
    `
    for (const row of rows) {
      out.set(Number(row.id), {
        id: Number(row.id),
        site_id: Number(row.site_id),
        captured_at: row.captured_at,
        screenshot_url: row.screenshot_url ?? null,
        mobile_screenshot_url: row.mobile_screenshot_url ?? null,
        palette: parseJsonArray(row.palette),
        typography: parseJsonArray(row.typography),
        assets: [],
        screenshot_hash: typeof row.screenshot_hash === 'string' ? row.screenshot_hash : null,
      })
    }
  } catch (err) {
    console.error('[extraction-history] bulk read failed:', err)
  }
  return out
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}
