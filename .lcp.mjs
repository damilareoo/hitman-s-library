import { chromium, devices } from 'playwright'
const url = process.argv[2] ?? 'https://hitmanslibrary.xyz/'
const browser = await chromium.launch({ channel: 'chrome' })
const out = []
for (let run = 0; run < 3; run++) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => { window.__lcp = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: e.startTime, el: e.element?.tagName + (e.element?.className ? '.' + String(e.element.className).slice(0, 40) : ''), url: e.url?.slice(0, 90), size: e.size }) }).observe({ type: 'largest-contentful-paint', buffered: true }) })
  const reqs = []
  page.on('response', async r => { try { const h = await r.allHeaders(); reqs.push({ u: r.url().slice(0, 100), t: r.request().resourceType(), len: Number(h['content-length'] ?? 0) }) } catch {} })
  await page.goto(url, { waitUntil: 'load', timeout: 90000 })
  await page.waitForTimeout(3000)
  const lcp = await page.evaluate(() => window.__lcp)
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { ttfb: Math.round(n.responseStart), fcp: Math.round(fcp?.startTime ?? 0), domContent: Math.round(n.domContentLoadedEventEnd), html: n.transferSize } })
  out.push({ nav, lcp: lcp.at(-1) })
  if (run === 0) {
    const js = reqs.filter(r => r.t === 'script'); const img = reqs.filter(r => r.t === 'image'); const font = reqs.filter(r => r.t === 'font'); const css = reqs.filter(r => r.t === 'stylesheet')
    console.log('scripts', js.length, Math.round(js.reduce((a, r) => a + r.len, 0) / 1024) + 'KB', '| images', img.length, Math.round(img.reduce((a, r) => a + r.len, 0) / 1024) + 'KB', '| fonts', font.length, font.map(f => f.u.split('/').pop() + ' ' + Math.round(f.len / 1024) + 'KB').join(', '), '| css', css.length, Math.round(css.reduce((a, r) => a + r.len, 0) / 1024) + 'KB')
  }
  await ctx.close()
}
for (const o of out) console.log(JSON.stringify(o))
await browser.close()
