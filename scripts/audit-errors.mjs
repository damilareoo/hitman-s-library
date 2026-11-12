#!/usr/bin/env node
// scripts/audit-errors.mjs
//
// The "no errors whatsoever" gate. Loads every main route at desktop and phone
// size, in light and dark, and fails on any console error or warning, page
// error, failed same-origin request, or Content-Security-Policy violation.
// Also records LCP and CLS for / on a throttled phone (spec targets: LCP <
// 2000 ms, CLS < 0.05).
//
//   node scripts/audit-errors.mjs [http://localhost:8799]

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:8799'
const ROUTES = ['/', '/about', '/changelog', '/submit', '/?site=798', '/?color=%232f4fd8', '/?q=studio']
const SIZES = [[1440, 900], [390, 844]]
const THEMES = ['light', 'dark']
const origin = new URL(BASE).origin

// Noise that is not ours to fix: third-party pages inside the preview iframe.
const IGNORE = [/preview\.hitmanslibrary\.xyz/, /127\.0\.0\.1:\d+\/api\/proxy/]

const browser = await chromium.launch({ channel: 'chrome' })
const findings = []

for (const [w, h] of SIZES) for (const theme of THEMES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme })
  const page = await ctx.newPage()
  let route = ''
  const note = (kind, text) => { if (!IGNORE.some(r => r.test(text))) findings.push(`${route} ${w}px ${theme}: ${kind}: ${text.slice(0, 220)}`) }
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    // A third-party resource failing (inside a previewed site, or its own
    // beacon) is that site's problem, not ours; same-origin failures still count.
    const at = m.location()?.url ?? ''
    if (/Failed to load resource/.test(m.text()) && at && !at.startsWith(origin)) return
    note(m.type(), m.text())
  })
  page.on('pageerror', e => note('pageerror', e.message))
  page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) note('http ' + r.status(), r.url()) })
  page.on('requestfailed', r => { if (r.url().startsWith(origin) && !/net::ERR_ABORTED/.test(r.failure()?.errorText ?? '')) note('failed', r.url()) })
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => console.error(`CSP ${e.violatedDirective} blocked ${e.blockedURI}`))
  })

  for (route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load' }).catch(e => note('goto', e.message))
    if (route === '/?site=798') {
      for (const tab of await page.$$('[role="tab"]')) { await tab.click().catch(() => {}); await page.waitForTimeout(500) }
    }
    if (route === '/') {
      const card = await page.$('main a[href*="site="], main [data-design-id]')
      if (card) { await card.click().catch(() => {}); await page.waitForTimeout(1200); await page.keyboard.press('Escape') }
    }
    // Not networkidle: analytics and the live preview keep the network busy.
    await page.waitForTimeout(1500)
  }
  await ctx.close()
}

// LCP and CLS on a throttled phone (Fast 4G, 4x CPU).
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(BASE + '/', { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const { lcp, cls } = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }))
  console.log(`LCP ${Math.round(lcp)} ms   CLS ${cls.toFixed(3)}   (390px, Fast 4G, 4x CPU)`)
  if (lcp >= 2000) findings.push(`/ 390px: LCP ${Math.round(lcp)} ms (target < 2000)`)
  if (cls >= 0.05) findings.push(`/ 390px: CLS ${cls.toFixed(3)} (target < 0.05)`)
  await ctx.close()
}

await browser.close()
for (const f of [...new Set(findings)]) console.log(f)
console.log(`${new Set(findings).size} findings`)
process.exit(findings.length ? 1 : 0)
