/**
 * Capture a bot-walled site from this machine — the one place its challenge
 * clears — and file the captures on the library.
 *
 *   ADMIN_PASSWORD=… bun run scripts/capture-walled.ts <id-or-url>
 *
 * Real Chrome on a residential IP is admitted by the wall; Vercel's headless
 * browser on a datacenter IP never is. The captures are resized locally
 * (1600px desktop, 800px mobile) and POSTed — one request per capture, to
 * stay under Vercel's body ceiling — to the admin capture-upload endpoint,
 * which uploads them to Blob and measures the palette off the desktop frame.
 * The passcode is read from ADMIN_PASSWORD and never printed.
 */
import puppeteer, { type Page } from 'puppeteer'
import sharp from 'sharp'
import {
  autoScroll,
  DESKTOP_UA,
  gotoResilient,
  settlePage,
  waitPastInterstitial,
} from '../lib/browser-extraction'

const BASE = process.env.LIBRARY_URL ?? 'https://www.hitmanslibrary.xyz'

function usage(): never {
  console.error('usage: ADMIN_PASSWORD=… bun run scripts/capture-walled.ts <id-or-url>')
  process.exit(2)
}

async function resolveTarget(arg: string): Promise<{ id?: number; url: string }> {
  if (/^\d+$/.test(arg)) {
    const res = await fetch(`${BASE}/api/design/${arg}?cb=${Date.now()}`)
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
    if (!res.ok || !data?.url) {
      throw new Error(`id ${arg}: library answered ${res.status}${data?.error ? ` — ${data.error}` : ''}`)
    }
    return { id: Number(arg), url: data.url }
  }
  return { url: /^https?:\/\//i.test(arg) ? arg : `https://${arg}` }
}

async function shot(page: Page, label: string): Promise<Buffer> {
  let buf = await page
    .screenshot({ type: 'jpeg', quality: 80, fullPage: true })
    .catch(() => null) as Buffer | null
  // A page too tall to encode comes back empty; the viewport still shows the
  // site. Same guard the server pipeline uses.
  if (!buf || buf.length === 0) {
    console.warn(`${label}: full-page capture came back empty — taking the viewport instead`)
    buf = await page.screenshot({ type: 'jpeg', quality: 80 }) as Buffer
  }
  return buf
}

async function main() {
  const arg = process.argv.slice(2).find(a => !a.startsWith('-'))
  if (!arg) usage()
  const passcode = process.env.ADMIN_PASSWORD
  if (!passcode) {
    console.error('ADMIN_PASSWORD is not set — the upload endpoint requires it.')
    console.error('Run: ADMIN_PASSWORD=… bun run scripts/capture-walled.ts <id-or-url>')
    process.exit(2)
  }

  const { id, url } = await resolveTarget(arg)
  console.log(`capturing ${url} (${id ? `id ${id}` : 'by url'})`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage()
    try {
      await page.setBypassCSP(true)
      await page.setUserAgent(DESKTOP_UA)
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

      await gotoResilient(page, url)
      if (!(await waitPastInterstitial(page, url))) {
        throw new Error('the challenge never cleared, even from this machine — nothing captured')
      }
      await settlePage(page)

      // Desktop at 2×, so the 1600px resize stays crisp instead of stretching
      // a 1440px render. The panel never asks the optimizer for more than
      // 1080px, so 1600 is headroom, not loss.
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
      const desktop = await sharp(await shot(page, 'desktop'))
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer()

      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
      await new Promise(r => setTimeout(r, 1500))
      await autoScroll(page, 300)
      await new Promise(r => setTimeout(r, 600))
      const mobile = await sharp(await shot(page, 'mobile'))
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer()

      console.log(`uploading ${Math.round(desktop.length / 1024)}kb desktop + ${Math.round(mobile.length / 1024)}kb mobile`)

      // Two requests, not one: a full-page pair from a tall site can exceed
      // Vercel's 4.5MB request-body ceiling and get a platform 413 before the
      // route ever runs.
      const upload = async (name: 'desktop' | 'mobile', buf: Buffer) => {
        const form = new FormData()
        if (id) form.append('id', String(id))
        form.append('url', url)
        form.append(name, new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }), `${name}.jpg`)
        const res = await fetch(`${BASE}/api/design/capture-upload`, {
          method: 'POST',
          headers: { authorization: `Bearer ${passcode}` },
          body: form,
        })
        const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
        if (!res.ok) throw new Error(`${name} upload rejected: ${res.status}${body?.error ? ` — ${body.error}` : ''}`)
        return body
      }

      let ok = true
      let desktopRes: Record<string, unknown> | null = null
      let mobileRes: Record<string, unknown> | null = null
      for (const [name, buf] of [['desktop', desktop], ['mobile', mobile]] as const) {
        try {
          const res = await upload(name, buf)
          if (name === 'desktop') desktopRes = res
          else mobileRes = res
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err))
          ok = false
        }
      }
      if (!desktopRes && !mobileRes) throw new Error('nothing was filed')
      console.log(`filed: ${String(desktopRes?.screenshot_url ?? '(no desktop)')}`)
      console.log(`       ${String(mobileRes?.mobile_screenshot_url ?? '(no mobile)')}`)
      console.log(`       ${desktopRes?.colors ?? 0} colors`)
      if (!ok) process.exitCode = 1
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
