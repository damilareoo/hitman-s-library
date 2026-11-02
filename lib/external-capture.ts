// lib/external-capture.ts
//
// A bot-walled site never renders for our headless browser, but it renders for
// ScreenshotOne's real browsers on a network the wall admits. This is the
// fallback of last resort, used only when the wall will not clear — normal
// sites keep the in-house capture. Without SCREENSHOTONE_ACCESS_KEY configured
// it is inert, and every caller keeps its existing wall behaviour.
import { put } from '@vercel/blob'
import sharp from 'sharp'

const ENDPOINT = 'https://api.screenshotone.com/take'
/** Their render timeout; the fetch gets a little more so their error can arrive. */
const SHOT_TIMEOUT_MS = 15_000

/**
 * A capture of a wall or an error page is a few KB of flat colour; a real
 * rendered page is far larger. Under this the shot is not worth filing.
 */
const MIN_SHOT_BYTES = 8000

export interface ExternalCapture {
  desktopUrl: string | null
  mobileUrl: string | null
  /** Dominant colours measured from the desktop capture itself. */
  palette: string[]
}

function accessKey(): string | null {
  return process.env.SCREENSHOTONE_ACCESS_KEY?.trim() || null
}

async function takeShot(siteUrl: string, params: Record<string, string>): Promise<Buffer | null> {
  const key = accessKey()
  if (!key) return null
  const qs = new URLSearchParams({
    access_key: key,
    url: siteUrl,
    timeout: String(Math.round(SHOT_TIMEOUT_MS / 1000)),
    format: 'jpg',
    block_ads: 'true',
    block_cookie_banners: 'true',
    block_trackers: 'true',
    ...params,
  })
  try {
    const res = await fetch(`${ENDPOINT}?${qs}`, { signal: AbortSignal.timeout(SHOT_TIMEOUT_MS + 10_000) })
    if (!res.ok) {
      console.warn(`[external] screenshot service refused ${siteUrl}: status ${res.status}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < MIN_SHOT_BYTES) {
      console.warn(`[external] screenshot for ${siteUrl} came back ${buf.length} bytes — discarding`)
      return null
    }
    return buf
  } catch (err) {
    console.warn(`[external] screenshot failed for ${siteUrl}:`, err)
    return null
  }
}

async function upload(buf: Buffer, name: string): Promise<string | null> {
  try {
    const blob = await put(`external/${name}`, buf, {
      access: 'public',
      contentType: 'image/jpeg',
    })
    return blob.url
  } catch (err) {
    console.error('[external] upload failed:', err)
    return null
  }
}

/**
 * Dominant colours measured from the rendered capture: pixels bucketed in
 * 4-bit RGB, ranked by area, near-duplicates of an already-picked colour
 * skipped. This is measurement, not guessing — the same principle the browser
 * extraction uses for area shares, applied to the only real render we have.
 */
export async function samplePalette(buf: Buffer, maxColors = 8): Promise<string[]> {
  try {
    const { data, info } = await sharp(buf)
      .resize(64, 64, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.r += r
        bucket.g += g
        bucket.b += b
        bucket.n++
      } else {
        buckets.set(key, { r, g, b, n: 1 })
      }
    }

    const picked: Array<{ r: number; g: number; b: number }> = []
    for (const bucket of [...buckets.values()].sort((a, b) => b.n - a.n)) {
      const avg = {
        r: Math.round(bucket.r / bucket.n),
        g: Math.round(bucket.g / bucket.n),
        b: Math.round(bucket.b / bucket.n),
      }
      const nearDuplicate = picked.some(
        p => Math.abs(p.r - avg.r) + Math.abs(p.g - avg.g) + Math.abs(p.b - avg.b) < 24,
      )
      if (nearDuplicate) continue
      picked.push(avg)
      if (picked.length >= maxColors) break
    }

    return picked.map(({ r, g, b }) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''))
  } catch (err) {
    console.warn('[external] palette sampling failed:', err)
    return []
  }
}

/**
 * Capture a walled site through the external renderer: a full-page desktop
 * shot, a phone-viewport mobile shot, and the palette measured off the
 * desktop frame. Any leg that fails returns null/empty — a partial capture
 * is still a capture.
 */
export async function captureExternally(siteUrl: string): Promise<ExternalCapture> {
  const nothing: ExternalCapture = { desktopUrl: null, mobileUrl: null, palette: [] }
  if (!accessKey()) return nothing

  const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
  const ts = Date.now()

  const [desktop, mobile] = await Promise.all([
    takeShot(siteUrl, {
      full_page: 'true',
      viewport_width: '1440',
      viewport_height: '900',
      device_scale_factor: '2',
    }),
    takeShot(siteUrl, { viewport_device: 'iphone_13_pro_max' }),
  ])

  const [desktopUrl, mobileUrl, palette] = await Promise.all([
    desktop ? upload(desktop, `${hostname}-${ts}-desktop.jpg`) : Promise.resolve(null),
    mobile ? upload(mobile, `${hostname}-${ts}-mobile.jpg`) : Promise.resolve(null),
    desktop ? samplePalette(desktop) : Promise.resolve([] as string[]),
  ])

  return { desktopUrl, mobileUrl, palette }
}
