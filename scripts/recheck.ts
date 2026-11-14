#!/usr/bin/env bun
// scripts/recheck.ts
//
// The weekly re-check (GitHub Actions, .github/workflows/recheck.yml). Every
// watched site, plus a rolling quarter of the library, is extracted again and
// compared with its current snapshot. Only a real redesign is filed (new
// snapshot, captures kept, watchers emailed); otherwise the fresh captures are
// deleted at once, so storage stays flat and History only holds changes.
//
//   bun scripts/recheck.ts            re-check this week's sites
//   bun scripts/recheck.ts --dry      extract and compare, write nothing
//   bun scripts/recheck.ts --ids 12,801
import { getSql } from '@/lib/db'
import { extractFullDesignData } from '@/lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '@/lib/color-utils'
import { driftBetween, isConfirmedRedesign } from '@/lib/drift'
import { fetchImageInfo } from '@/lib/image-hash'
import { applyReextraction } from '@/lib/reextract'
import { notifyWatchers } from '@/lib/pro/notify-watchers'
import { del } from '@/lib/blob'

const dry = process.argv.includes('--dry')
const idsArg = process.argv[process.argv.indexOf('--ids') + 1]
const BUDGET_MS = 50 * 60_000
const started = Date.now()
const sql = getSql()

async function main() {
  const week = Math.floor(Date.now() / (7 * 864e5))
  const rows = idsArg && process.argv.includes('--ids')
    ? await sql`SELECT id, source_url, current_extraction_id FROM design_sources WHERE id = ANY(${idsArg.split(',').map(Number)}::int[])`
    : await sql`
        SELECT id, source_url, current_extraction_id FROM design_sources
         WHERE screenshot_url IS NOT NULL
           AND (id IN (SELECT source_id FROM watches) OR id % 4 = ${week % 4})
         ORDER BY (id IN (SELECT source_id FROM watches)) DESC, id`

  let checked = 0, redesigned = 0, mailed = 0, failed = 0
  for (const row of rows) {
    if (Date.now() - started > BUDGET_MS) { console.log('budget reached, stopping'); break }
    const id = Number(row.id), url = String(row.source_url)
    let result: Awaited<ReturnType<typeof extractFullDesignData>> | null = null
    try {
      result = await extractFullDesignData(url, { signal: AbortSignal.timeout(60_000) })
      checked++
      const fresh = [result.screenshotUrl, result.mobileScreenshotUrl, result.motionClipUrl].filter((u): u is string => Boolean(u))
      if (result.challengeBlocked || result.renderedNothing) {
        if (!dry && fresh.length) await del(fresh).catch(() => {})
        console.log(`skip ${id} ${url}: ${result.challengeBlocked ? 'bot wall' : 'rendered nothing'}`)
        continue
      }
      const [prev] = row.current_extraction_id
        ? await sql`SELECT palette, typography, screenshot_hash, screenshot_url FROM extraction_history WHERE id = ${row.current_extraction_id}`
        : []
      const palette = deduplicateColors(result.colors).map(c => toColorFormats(c)).filter((c): c is { hex: string; oklch: string } => c !== null).slice(0, 16)
      const hash = result.screenshotUrl ? (await fetchImageInfo(result.screenshotUrl)).hash : null
      // Older snapshots never stored a capture fingerprint; take it now so the
      // captures can be compared, which is the strongest signal there is.
      const prevHash = prev?.screenshot_hash ?? (prev?.screenshot_url ? (await fetchImageInfo(String(prev.screenshot_url)).catch(() => ({ hash: null }))).hash : null)
      const drift = prev
        ? driftBetween(
            { palette: prev.palette ?? [], typography: prev.typography ?? [], screenshotHash: prevHash },
            { palette, typography: result.typography ?? [], screenshotHash: hash },
          )
        : null
      if (drift && !isConfirmedRedesign(drift)) {
        if (!dry && fresh.length) await del(fresh).catch(() => {})
        console.log(`same ${id} ${url}`)
        continue
      }
      redesigned++
      console.log(`REDESIGN ${id} ${url}`, drift ? JSON.stringify({ turnover: Math.round(drift.paletteTurnover * 100) / 100, fonts: drift.typoChanges.filter(c => c.familyChanged).map(c => `${c.role}: ${c.beforeFamily} -> ${c.afterFamily}`), capture: drift.screenshotChanged }) : '(no previous snapshot)')
      if (dry) { if (fresh.length) await del(fresh).catch(() => {}); continue }
      const applied = await applyReextraction(id, url, result)
      if (applied.status === 200) mailed += await notifyWatchers(id)
    } catch (err) {
      failed++
      console.log(`fail ${id} ${url}: ${err instanceof Error ? err.message : err}`)
    }
  }
  console.log(JSON.stringify({ sites: rows.length, checked, redesigned, mailed, failed, dry }))

}

main().then(() => process.exit(0), err => { console.error(err); process.exit(1) })
