// scripts/x-card.ts
// Renders the image for today's X post before it goes out (GitHub Actions,
// daily 12:30 UTC; the post sends at 14:00). Picks the same site the cron
// route will, draws its capture on a field of its own colour, uploads the PNG
// to Blob storage and files it in x_cards. Cards are kept, so a site featured
// again later reuses its card.
//
//   bun scripts/x-card.ts [--day 2026-11-20] [--dry] [--out card.png]
import puppeteer from 'puppeteer'
import { writeFileSync } from 'node:fs'
import { getSql } from '@/lib/db'
import { put } from '@/lib/blob'
import { loadCandidates, postTime } from '@/lib/x/candidates'
import { composeDailyPost } from '@/lib/x/compose'
import { CARD_H, CARD_W, cardHtml, pickField } from '@/lib/x/card'

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const dry = process.argv.includes('--dry')

async function main() {
  const sql = getSql()
  const cands = await loadCandidates(sql as never)
  const post = composeDailyPost(cands, postTime(arg('--day')))
  if (!post?.sourceId) { console.log('No site in today\'s post; no card needed.', post?.kind ?? ''); return }

  const site = cands.find(c => c.id === post.sourceId)!
  const have = await sql`SELECT image_url FROM x_cards WHERE source_id = ${site.id}`
  if (have.length && !process.argv.includes('--force')) { console.log(`Card exists for ${site.slug}: ${have[0].image_url}`); return }

  const field = pickField(site.colors)
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: CARD_W, height: CARD_H, deviceScaleFactor: 1 })
    await page.setContent(cardHtml(site.screenshotUrl, field), { waitUntil: 'networkidle0', timeout: 60_000 })
    const ok = await page.$eval('img', (i: HTMLImageElement) => i.complete && i.naturalWidth > 0)
    if (!ok) throw new Error(`capture did not load: ${site.screenshotUrl}`)
    const png = Buffer.from(await page.screenshot({ type: 'png' }))
    const out = arg('--out')
    if (out) writeFileSync(out, png)
    if (dry) { console.log(`[dry] ${site.slug} on ${field}, ${png.length} bytes${out ? ` -> ${out}` : ''}`); return }
    const { url } = await put(`x-cards/${site.id}-${Date.now()}.png`, png, { access: 'public', contentType: 'image/png' })
    await sql`
      INSERT INTO x_cards (source_id, image_url, field_hex) VALUES (${site.id}, ${url}, ${field})
      ON CONFLICT (source_id) DO UPDATE SET image_url = EXCLUDED.image_url, field_hex = EXCLUDED.field_hex, made_at = now()
    `
    console.log(`${post.kind}: ${site.slug} on ${field} -> ${url}`)
  } finally {
    await browser.close()
  }
}

main().then(() => process.exit(0), err => { console.error(err); process.exit(1) })
