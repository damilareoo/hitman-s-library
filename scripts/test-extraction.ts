/**
 * Exercise the extraction pipeline against sites drawn from each real failure
 * bucket, without writing anything to the database or blob storage.
 *
 *   bun run scripts/test-extraction.ts [url ...]
 *
 * Reports colours, typography roles and assets per site. A site is only
 * considered passing when it yields all three — "we got a screenshot" was the
 * bar that let a third of the library through in a broken state.
 */
import puppeteer from 'puppeteer'
import { gotoResilient, settlePage, extractBrandColors, extractTypographyWithRoles } from '../lib/browser-extraction'
import { extractAssets } from '../lib/asset-extraction'
import { toColorFormats, deduplicateColors } from '../lib/color-utils'

// One per failure bucket, plus a known-good control.
const DEFAULT_TARGETS = [
  'https://granola.ai',        // thin: 1 legacy colour, no type, no assets
  'https://langbase.com/',     // thin
  'https://populous.com',      // thin
  'https://stripe.com',        // never extracted — bot-protected
  'https://wise.com',          // never extracted
  'https://parallel.ai',       // control: currently good (6 colours, 3 type, 59 assets)
]

async function main() {
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TARGETS

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  const rows: Array<Record<string, string | number>> = []

  for (const url of targets) {
    const page = await browser.newPage()
    const started = Date.now()
    try {
      await page.setBypassCSP(true)
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      )
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

      const navState = await gotoResilient(page, url)
      await settlePage(page)

      const [colors, assets, typography] = await Promise.all([
        extractBrandColors(page).catch(() => [] as string[]),
        extractAssets(page, url).catch(() => []),
        extractTypographyWithRoles(page).catch(() => []),
      ])

      const palette = deduplicateColors(colors)
        .map(c => toColorFormats(c))
        .filter(c => c !== null)
        .slice(0, 16)

      const ok = palette.length > 0 && typography.length > 0 && assets.length > 0

      rows.push({
        site: new URL(url).hostname,
        nav: navState,
        colors: palette.length,
        type: typography.length,
        assets: assets.length,
        secs: ((Date.now() - started) / 1000).toFixed(1),
        result: ok ? 'PASS' : 'FAIL',
      })

      console.log(
        `${ok ? 'PASS' : 'FAIL'}  ${new URL(url).hostname.padEnd(20)} ` +
        `nav=${navState.padEnd(7)} colors=${String(palette.length).padStart(2)} ` +
        `type=${typography.length} assets=${String(assets.length).padStart(3)}  ` +
        `${typography.map(t => `${t.role}:${t.fontFamily}`).join(' ') || '(none)'}`,
      )
    } catch (err) {
      rows.push({ site: new URL(url).hostname, nav: 'threw', colors: 0, type: 0, assets: 0, secs: '-', result: 'ERROR' })
      console.log(`ERROR ${url}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      await page.close().catch(() => {})
    }
  }

  await browser.close()

  console.log()
  console.table(rows)
  const passed = rows.filter(r => r.result === 'PASS').length
  console.log(`${passed}/${rows.length} sites yielded colours, typography and assets`)
}

main()
