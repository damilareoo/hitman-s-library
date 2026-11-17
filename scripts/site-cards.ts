// scripts/site-cards.ts
// Renders link cards for sites that don't have one: the capture on a field of
// the site's own colour, 1600x900 JPEG, uploaded to Blob and filed in
// site_cards. GitHub Actions runs it daily for new sites.
//
//   bun scripts/site-cards.ts              up to 40 sites without a card
//   bun scripts/site-cards.ts --all        every site without a card
//   bun scripts/site-cards.ts --ids 12,40 --force --dry --out card.jpg
import puppeteer, { type Browser } from 'puppeteer'
import { writeFileSync } from 'node:fs'
import { getSql } from '@/lib/db'
import { put } from '@/lib/blob'
import { siteSlug } from '@/lib/site-slug'
import { nameColors } from '@/lib/tokens/roles'
import { CARD_H, CARD_W, cardHtml, pickField } from '@/lib/link-card'

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const flag = (name: string) => process.argv.includes(name)
const sql = getSql()

interface Site { id: number; slug: string; shot: string; colors: { role: string; hex: string }[] }

async function sites(): Promise<Site[]> {
  const [rows, colors, have] = await Promise.all([
    sql`SELECT id, source_url, screenshot_url FROM design_sources WHERE screenshot_url IS NOT NULL ORDER BY created_at DESC`,
    sql`SELECT source_id, hex_value, oklch, area_share FROM design_colors`,
    sql`SELECT source_id FROM site_cards`,
  ])
  const by = new Map<number, any[]>()
  for (const c of colors as any[]) (by.get(c.source_id) ?? by.set(c.source_id, []).get(c.source_id)!).push(c)
  const done = new Set((have as any[]).map(r => r.source_id as number))
  const ids = arg('--ids')?.split(',').map(Number)
  return (rows as any[])
    .filter(r => (ids ? ids.includes(r.id) : true) && (flag('--force') || !done.has(r.id)))
    .map(r => ({
      id: r.id,
      slug: siteSlug(r.source_url),
      shot: String(r.screenshot_url).replace(/^http:\/\//, 'https://'),
      colors: nameColors(by.get(r.id) ?? []).map(c => ({ role: c.role, hex: c.hex })),
    }))
}

async function render(browser: Browser, site: Site): Promise<{ jpg: Buffer; field: string }> {
  const field = pickField(site.colors)
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: CARD_W, height: CARD_H, deviceScaleFactor: 1 })
    await page.setContent(cardHtml(site.shot, field), { waitUntil: 'domcontentloaded' })
    // Full-page captures can be very tall; wait for the decode, not the network.
    await page.waitForFunction(() => { const i = document.querySelector('img'); return i && i.complete }, { timeout: 90_000 })
    const ok = await page.$eval('img', (i: HTMLImageElement) => i.naturalWidth > 0)
    if (!ok) throw new Error(`capture did not load: ${site.shot}`)
    return { jpg: Buffer.from(await page.screenshot({ type: 'jpeg', quality: 86 })), field }
  } finally {
    await page.close().catch(() => {})
  }
}

async function main() {
  const queue = (await sites()).slice(0, flag('--all') || arg('--ids') ? Infinity : Number(arg('--limit') ?? 40))
  if (!queue.length) { console.log('Every site has a card.'); return }
  const launch = () => puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  let browser = await launch()
  let made = 0, failed = 0
  for (const site of queue) {
    try {
      const { jpg, field } = await render(browser, site)
      const out = arg('--out')
      if (out) writeFileSync(out, jpg)
      if (flag('--dry')) { console.log(`[dry] ${site.slug} on ${field}, ${jpg.length} bytes`); continue }
      const { url } = await put(`site-cards/${site.id}-${Date.now()}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg' })
      await sql`
        INSERT INTO site_cards (source_id, image_url, field_hex) VALUES (${site.id}, ${url}, ${field})
        ON CONFLICT (source_id) DO UPDATE SET image_url = EXCLUDED.image_url, field_hex = EXCLUDED.field_hex, made_at = now()
      `
      console.log(`${site.slug} on ${field} -> ${url}`)
      made++
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : String(err)
      console.error(`${site.slug}: ${message}`)
      // A crashed browser would fail every site after it; start a fresh one.
      if (!browser.connected) { await browser.close().catch(() => {}); browser = await launch() }
    }
  }
  await browser.close()
  console.log(`${made} made, ${failed} failed`)
}

main().then(() => process.exit(0), err => { console.error(err); process.exit(1) })
