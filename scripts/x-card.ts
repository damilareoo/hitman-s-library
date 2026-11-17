// scripts/x-card.ts
// Renders link cards: the site's capture on a flat field of its own colour.
// The card is each /site/ page's og:image, so any link to a site page shows
// it on X, and the daily post attaches it. GitHub Actions runs this at 12:30
// UTC (the daily post goes at 14:00): today's site first, then any site that
// has no card yet. Cards are kept and reused.
//
//   bun scripts/x-card.ts                 today's site + up to --limit missing (default 40)
//   bun scripts/x-card.ts --all           every site without a card
//   bun scripts/x-card.ts --day 2026-11-20 --dry --out card.jpg
import puppeteer, { type Browser } from 'puppeteer'
import { writeFileSync } from 'node:fs'
import { getSql } from '@/lib/db'
import { put } from '@/lib/blob'
import { loadCandidates, postTime, type CandidateRow } from '@/lib/x/candidates'
import { composeDailyPost } from '@/lib/x/compose'
import { CARD_H, CARD_W, cardHtml, pickField } from '@/lib/x/card'

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const flag = (name: string) => process.argv.includes(name)
const sql = getSql()

async function render(browser: Browser, site: CandidateRow): Promise<{ jpg: Buffer; field: string }> {
  const field = pickField(site.colors)
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: CARD_W, height: CARD_H, deviceScaleFactor: 1 })
    await page.setContent(cardHtml(site.screenshotUrl, field), { waitUntil: 'networkidle0', timeout: 60_000 })
    const ok = await page.$eval('img', (i: HTMLImageElement) => i.complete && i.naturalWidth > 0)
    if (!ok) throw new Error(`capture did not load: ${site.screenshotUrl}`)
    return { jpg: Buffer.from(await page.screenshot({ type: 'jpeg', quality: 86 })), field }
  } finally {
    await page.close()
  }
}

async function file(site: CandidateRow, jpg: Buffer, field: string): Promise<string> {
  const { url } = await put(`x-cards/${site.id}-${Date.now()}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg' })
  await sql`
    INSERT INTO x_cards (source_id, image_url, field_hex) VALUES (${site.id}, ${url}, ${field})
    ON CONFLICT (source_id) DO UPDATE SET image_url = EXCLUDED.image_url, field_hex = EXCLUDED.field_hex, made_at = now()
  `
  return url
}

async function main() {
  const cands = await loadCandidates(sql as never)
  const have = new Set((await sql`SELECT source_id FROM x_cards`).map((r: any) => r.source_id as number))
  const post = composeDailyPost(cands, postTime(arg('--day')))
  const today = post?.sourceId ? cands.find(c => c.id === post.sourceId) : undefined

  const queue: CandidateRow[] = []
  if (today && (!have.has(today.id) || flag('--force'))) queue.push(today)
  if (!flag('--dry')) {
    const limit = flag('--all') ? Infinity : Number(arg('--limit') ?? 40)
    queue.push(...cands.filter(c => !have.has(c.id) && c.id !== today?.id).slice(0, limit))
  }
  if (!queue.length) { console.log('Every card is made.'); return }

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  let made = 0, failed = 0
  try {
    for (const site of queue) {
      try {
        const { jpg, field } = await render(browser, site)
        const out = arg('--out')
        if (out && site === queue[0]) writeFileSync(out, jpg)
        if (flag('--dry')) { console.log(`[dry] ${site.slug} on ${field}, ${jpg.length} bytes`); continue }
        console.log(`${site.slug} on ${field} -> ${await file(site, jpg, field)}`)
        made++
      } catch (err) {
        failed++
        console.error(`${site.slug}: ${err instanceof Error ? err.message : err}`)
      }
    }
  } finally {
    await browser.close()
  }
  console.log(`${made} made, ${failed} failed`)
}

main().then(() => process.exit(0), err => { console.error(err); process.exit(1) })
