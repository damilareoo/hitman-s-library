import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer'
import type { Page } from 'puppeteer'
import { put } from '@vercel/blob'
import { existsSync, unlinkSync } from 'fs'
import { extractAssets } from './asset-extraction'
import { measureColorAreaShares } from './color-area.js'
import { recordMotionClip, extractMotionTags, resolveFfmpegPath, type MotionTags } from './motion-capture'

// For serverless environments, use the lightweight Chromium from Sparticuz
let browser: any = null
let browserInitPromise: Promise<any> | null = null

export async function getBrowser() {
  if (browser) {
    if (typeof browser.isConnected !== 'function' || browser.isConnected()) {
      return browser
    }
    browser = null
  }
  if (browserInitPromise) return browserInitPromise
  browserInitPromise = (async () => {
  try {
    const isServerless = process.platform === 'linux' && (
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV
    )

    if (isServerless) {
      // @sparticuz/chromium sets LD_LIBRARY_PATH at MODULE LOAD TIME only when
      // isRunningInAwsLambda() is true. On Vercel, AWS_EXECUTION_ENV is not set
      // by default, so that top-level setup was skipped. We must:
      //   1. Set AWS_EXECUTION_ENV before calling executablePath() so it extracts al2.tar.br
      //   2. Manually set LD_LIBRARY_PATH to the correct al2 lib path
      //   3. Explicitly pass env to puppeteer.launch() so Chrome subprocess inherits it

      // @sparticuz/chromium only knows about nodejs18.x (AL2 libs) and nodejs20.x (AL2023 libs).
      // Vercel sets AWS_EXECUTION_ENV internally (e.g. 'nodejs24.x') but the package doesn't
      // handle that — always override it to the closest supported value so the right shared
      // libs get extracted. AL2023 is required for Node 20+ (newer glibc on modern Linux).
      const nodeMajor = parseInt(process.version.slice(1), 10)
      process.env.AWS_EXECUTION_ENV = nodeMajor >= 20
        ? 'AWS_Lambda_nodejs20.x'
        : 'AWS_Lambda_nodejs18.x'

      // If /tmp/chromium is cached from a prior cold start that used the wrong libs,
      // delete it so executablePath() does a fresh extraction this time.
      const al2Dir = nodeMajor >= 20 ? '/tmp/al2023' : '/tmp/al2'
      const al2LibDir = `${al2Dir}/lib`
      if (existsSync('/tmp/chromium') && !existsSync(al2Dir)) {
        try { unlinkSync('/tmp/chromium') } catch {}
      }

      const executablePath = await chromium.executablePath()

      // Always prepend the correct lib dir. The module-level setup may have used the wrong
      // path (e.g. /tmp/al2/lib when we need /tmp/al2023/lib for Node 20+).
      const existingLibPath = process.env.LD_LIBRARY_PATH ?? ''
      process.env.LD_LIBRARY_PATH = existingLibPath.includes(al2LibDir)
        ? existingLibPath
        : `${al2LibDir}:${existingLibPath}`

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
        // Pass env explicitly so Chrome subprocess inherits LD_LIBRARY_PATH.
        env: { ...process.env },
      })
    } else {
      // Local dev (macOS/Windows): use puppeteer's own bundled Chrome.
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      })
    }

    console.log('[v0] Browser instance created successfully')
    browser.on?.('disconnected', () => {
      browser = null
    })
    return browser
  } catch (error) {
    console.error('[v0] Failed to launch browser:', error)
    return null
  } finally {
    browserInitPromise = null
  }
  })()
  return browserInitPromise
}

// Getting the document is what must succeed. Waiting for a quiet network is a
// courtesy we extend briefly and then withdraw.
const NAV_TIMEOUT = 20000
const IDLE_TIMEOUT = 8000

// Headless Chrome announces itself as "HeadlessChrome" in its default UA, which
// is the cheapest bot signal there is. Sites that would happily render for a
// browser turned us away on the strength of that string alone.
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * Navigate in a way that degrades instead of throwing.
 *
 * This used to be `page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })`
 * with nothing catching it. `networkidle2` never arrives on a site with
 * analytics polling or an open websocket, so the timeout fired, the throw
 * escaped `extractFullDesignData`, and the caller fell all the way back to
 * reading colours out of raw HTML — one unusable row and no typography at all.
 * A page that rendered but never went quiet is a page we can extract from.
 */
export async function gotoResilient(page: Page, url: string): Promise<'idle' | 'loaded' | 'partial'> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
  } catch (err) {
    // A timeout still usually leaves a rendered document behind. Only a
    // navigation that never committed is genuinely unusable, and that shows up
    // as a page still sitting on about:blank.
    const current = page.url()
    if (!current || current === 'about:blank') throw err
    console.warn(`[extract] navigation incomplete for ${url} — waiting for the document to settle`)
    // A timed-out goto does not stop the navigation. Everything read next used
    // to run against a frame that was still being replaced, so all three
    // extractors failed with "Attempted to use detached Frame" and the site
    // landed with an og:image and no palette or type. Wait for the document we
    // are going to read before reading it.
    await settleNavigation(page)
    return 'partial'
  }

  const idle = await page
    .waitForNetworkIdle({ idleTime: 500, timeout: IDLE_TIMEOUT })
    .then(() => 'idle' as const)
    .catch(() => 'loaded' as const)

  return idle
}

/**
 * Wait until the main frame stops being replaced.
 *
 * Called after a navigation, and again after a read lost its frame. Two
 * consecutive reads of a non-loading document are the signal: one sample can
 * land on the outgoing document just before a redirect swaps it.
 */
export async function settleNavigation(page: Page, budgetMs = 8000): Promise<void> {
  const deadline = Date.now() + budgetMs
  let stable = 0

  while (Date.now() < deadline) {
    let ready: string | null = null
    try {
      ready = await page.evaluate(() => document.readyState)
    } catch {
      // Detached — the document was replaced mid-read. Start counting again
      // against the one that replaced it.
    }
    if (ready && ready !== 'loading') {
      stable++
      if (stable >= 2) {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 }).catch(() => {})
        return
      }
    } else {
      stable = 0
    }
    await new Promise(r => setTimeout(r, 400))
  }
}

/**
 * Errors that mean "the document under this read was replaced", not "this
 * site cannot be read". They are worth retrying; everything else is not.
 */
const FRAME_REPLACED = /detached Frame|Execution context was destroyed|Navigating frame was detached|Target closed|Session closed|Cannot find context/i

/**
 * Run a page read, retrying it against whatever document replaced the frame.
 *
 * The reads are pure functions of the DOM, so a retry is safe. Three attempts
 * is enough for a redirect chain; past that the page is still moving, and the
 * caller's fallback is the honest answer.
 */
export async function readPage<T>(
  page: Page,
  label: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await read()
    } catch (err) {
      const replaced = FRAME_REPLACED.test(String(err))
      if (!replaced || attempt === 3) {
        console.warn(`[extract] ${label} failed${attempt > 1 ? ` (attempt ${attempt})` : ''}:`, err)
        return fallback
      }
      console.warn(`[extract] ${label}: frame replaced mid-read — waiting and retrying`)
      await settleNavigation(page, 5000)
    }
  }
  return fallback
}

// Cloudflare "Just a moment", bot checkpoints and similar interstitials run a
// verification script and then redirect to the real page. Headless Chrome can
// clear some of them unaided, but only if we wait for the redirect instead of
// reading the interstitial as if it were the site.
const INTERSTITIAL_TITLE_MARKERS = [
  'just a moment',
  'checking your browser',
  'attention required',
  'verify you are human',
  'verification required',
]
const INTERSTITIAL_WAIT_MS = 20000

async function waitPastInterstitial(page: Page, siteUrl: string): Promise<void> {
  let title = ''
  try {
    title = await page.title()
  } catch {}
  if (!INTERSTITIAL_TITLE_MARKERS.some(m => title.toLowerCase().includes(m))) return

  const deadline = Date.now() + INTERSTITIAL_WAIT_MS
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1000))
    try {
      title = await page.title()
    } catch {}
    if (!INTERSTITIAL_TITLE_MARKERS.some(m => title.toLowerCase().includes(m))) return
    try {
      if (page.url() !== siteUrl && !page.url().includes('cloudflare.com')) return
    } catch {}
  }
}

/** One pass to the bottom and back, slow enough for lazy-loading observers to follow. */
async function autoScroll(page: Page, step = 400, maxMs = 15000): Promise<void> {
  await page
    .evaluate(async (step: number, maxMs: number) => {
      await new Promise<void>(resolve => {
        let y = 0
        const started = Date.now()
        const id = setInterval(() => {
          // A hard ceiling: an interstitial that keeps injecting content (or a
          // lazy page that never stops growing) must not scroll forever.
          if (Date.now() - started >= maxMs) {
            clearInterval(id)
            window.scrollTo(0, 0)
            resolve()
            return
          }
          // Recomputed each tick: a page that lazy-loads gets taller as we go,
          // and the original read the height once and stopped short of the new
          // bottom.
          const maxY = document.documentElement.scrollHeight
          y = Math.min(y + step, maxY)
          window.scrollTo(0, y)
          if (y >= maxY) {
            clearInterval(id)
            window.scrollTo(0, 0)
            resolve()
          }
        }, 80)
      })
    }, step, maxMs)
    .catch(() => {})
}

/**
 * Bring the page to the state every extractor should read, once, up front.
 *
 * Previously none of this was guaranteed: asset extraction sat inside a
 * `Promise.all` beside the screenshot capture, which scrolls. Assets were read
 * from a page moving underneath them — lazy images still at `naturalWidth === 0`
 * and the logo heuristic measuring `getBoundingClientRect().top <= 100` against
 * a viewport that had already left the header behind. Settling first is what
 * makes the reads deterministic.
 */
export async function settlePage(page: Page): Promise<void> {
  // Before anything reads or photographs the page, let it finish arriving. A
  // preloader is a real page as far as the DOM is concerned, and everything
  // downstream — assets, the logo heuristic, the capture — would otherwise be
  // reading a splash screen.
  await waitForPaint(page)

  // Commit lazy images before the scroll rather than relying on it, so one pass
  // is enough even where the observer never fires.
  await page
    .evaluate(() => {
      document.querySelectorAll('img').forEach(img => {
        img.loading = 'eager'
        const lazySrc = img.dataset.src || img.getAttribute('data-lazy-src')
        if (lazySrc && !img.src) img.src = lazySrc
      })
    })
    .catch(() => {})

  await autoScroll(page)

  // Webfonts routinely land after first paint. Reading computed styles before
  // they do reports the fallback stack — which is how sites with real
  // typography were recorded as using Arial.
  await page
    .evaluate(
      () =>
        Promise.race([
          document.fonts.ready.then(() => undefined),
          new Promise<void>(r => setTimeout(r, 3000)),
        ]),
    )
    .catch(() => {})

  await new Promise(r => setTimeout(r, 500))
}

/**
 * How much of the page each colour covers, keyed by lowercase hex.
 *
 * The fourth pass of extractBrandColors already computes this and throws it
 * away, because all it needs from the number is a ranking. Keeping it lets the
 * palette be drawn at the proportions the site actually uses. Reported
 * separately rather than folded into that function's return, so nothing on the
 * extraction write path has to change shape.
 */
export async function extractColorAreaShares(page: Page): Promise<Record<string, number>> {
  return page.evaluate(measureColorAreaShares) as Promise<Record<string, number>>
}

/**
 * Extract brand/design-language colors only — CSS variables + structural UI elements.
 * Excludes content areas, near-transparent colors, and unresolved values.
 */
export async function extractBrandColors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const rawColors: string[] = []

    // --- Pass 1: CSS custom properties on :root ---
    try {
      const rootStyles = getComputedStyle(document.documentElement)
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (!(rule instanceof CSSStyleRule)) continue
            if (rule.selectorText !== ':root' && rule.selectorText !== 'html') continue
            for (const prop of Array.from(rule.style)) {
              if (!prop.startsWith('--')) continue
              const val = rootStyles.getPropertyValue(prop).trim()
              if (val && !val.includes('var(') && val !== 'transparent' && val !== '') {
                rawColors.push(val)
              }
            }
          }
        } catch { /* cross-origin stylesheet — skip */ }
      }
    } catch { /* getComputedStyle failed */ }

    // --- Pass 2: the brand's own declaration of its colour ---
    // A site that ships <meta name="theme-color"> has told us its brand colour
    // outright. It costs nothing to believe it, and it ranks above anything
    // inferred from computed styles.
    for (const meta of Array.from(document.querySelectorAll('meta[name="theme-color"]'))) {
      const val = (meta as HTMLMetaElement).content?.trim()
      if (val) rawColors.push(val)
    }

    // Chrome's own defaults for unstyled links. A site that never styled its
    // anchors reports these, and they were being filed as brand colours —
    // #0000EE ended up the single most common "brand" colour in the library.
    const UA_DEFAULTS = new Set(['rgb(0, 0, 238)', 'rgb(85, 26, 139)', 'rgb(238, 0, 0)', '#0000ee', '#551a8b', '#ee0000'])

    const isUsable = (val: string | undefined): val is string =>
      Boolean(
        val &&
        !UA_DEFAULTS.has(val.toLowerCase()) &&
        val !== 'transparent' &&
        val !== 'rgba(0, 0, 0, 0)' &&
        !val.includes('inherit') &&
        !val.includes('currentColor') &&
        !val.includes('initial') &&
        // Anything this close to invisible is a scrim or a hairline, not a
        // colour anyone wants to copy out of the palette.
        !/rgba\([^)]*,\s*0?\.0\d+\)$/.test(val),
      )

    // --- Pass 3: structural UI element colors ---
    const uiSelectors = ['header', 'nav', 'footer', 'button', '[role="button"]', 'a', 'h1', 'h2', 'body']
    const cssProps = ['color', 'backgroundColor', 'borderColor'] as const

    for (const selector of uiSelectors) {
      const els = Array.from(document.querySelectorAll(selector)).slice(0, 8)
      for (const el of els) {
        const style = getComputedStyle(el)
        for (const prop of cssProps) {
          const val = style[prop as keyof CSSStyleDeclaration] as string
          if (isUsable(val)) rawColors.push(val)
        }
      }
    }

    // --- Pass 4: the colours actually covering the page ---
    // Ranked by painted area, so a brand colour filling a hero outranks a
    // one-off border. Without this, a site whose palette lives in section
    // backgrounds rather than in :root variables read as almost colourless.
    const areaByColor = new Map<string, number>()
    for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 1200)) {
      const style = getComputedStyle(el)
      const bg = style.backgroundColor
      if (!isUsable(bg)) continue
      const r = el.getBoundingClientRect()
      const area = r.width * r.height
      if (area < 2500) continue
      areaByColor.set(bg, (areaByColor.get(bg) ?? 0) + area)
    }

    const byArea = Array.from(areaByColor.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([color]) => color)

    return [...rawColors, ...byArea]
  })
}

// Chrome cannot encode a screenshot taller than roughly 16k pixels; past that it
// hands back an empty buffer rather than an error. Pages like linear.app scroll
// well beyond it, so clamp the capture instead of asking for the impossible.
//
// The limit is in *device* pixels, and these captures run at deviceScaleFactor
// 2 (desktop) and 3 (mobile). A flat 12000 CSS-pixel clamp therefore asked for
// 24000 and 36000 device pixels respectively — over the limit on every tall
// page, which is why sites kept coming back with no screenshot at all. Derive
// the ceiling from the ratio actually in force.
const MAX_CAPTURE_DEVICE_PIXELS = 15000

/**
 * How much is going on in a frame, in bytes of JPEG per megapixel.
 *
 * The encoder has already done the work: a flat colour costs almost nothing to
 * store, a painted page costs a great deal. Reading the buffer length is enough
 * to tell one from the other, and it needs no image decoding in a serverless
 * function — which is the whole reason for measuring it this way.
 */
async function frameComplexity(page: Page): Promise<number> {
  const buf = (await page.screenshot({ type: 'jpeg', quality: PAINT_SAMPLE_QUALITY })) as Buffer
  const { width, height, dpr } = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  }))
  const megapixels = (width * height * dpr * dpr) / 1e6
  return megapixels > 0 ? buf.length / megapixels : 0
}

const PAINT_SAMPLE_QUALITY = 35
const PAINT_SAMPLE_INTERVAL_MS = 500
/**
 * Adds run inside a 60s function and already take 30–50s, so this is a budget
 * rather than a target. Measured against the sites that needed it: the slowest
 * preloader in the library settles about three seconds after the first sample.
 */
const PAINT_MAX_WAIT_MS = 6000
/** A sample this much larger than the best so far means content is still arriving. */
const PAINT_RISE = 1.15
/** Two settled samples end the wait — but only above this, or a preloader qualifies. */
const PAINT_SETTLED_SAMPLES = 2
/** Below this the frame is a splash screen or an empty page, whatever it claims. */
const PAINT_FLOOR = 8000

/**
 * Wait for the page to finish painting itself, not merely to finish loading.
 *
 * Sites with intro animations were being photographed mid-preloader: joyco.studio
 * was a flat blue panel with a logo on it, therawmaterials.com a cream rectangle
 * and one hairline. Both had full colour, type and asset data in the database —
 * the DOM was there the whole time, sitting underneath a splash — so nothing that
 * reads the document could have caught this. Only the pixels show it.
 *
 * The test is whether the frame is still getting busier. Content arriving pushes
 * complexity up; a preloader holds it flat and low. Two samples without a rise,
 * above a floor, means the page has arrived. therawmaterials climbs 6k → 12k →
 * 20k over four seconds and settles; a static page is settled on arrival and
 * costs two samples to confirm.
 */
export async function waitForPaint(page: Page, budgetMs = PAINT_MAX_WAIT_MS): Promise<void> {
  const deadline = Date.now() + budgetMs
  let best = 0
  let settled = 0

  while (Date.now() < deadline) {
    let complexity: number
    try {
      complexity = await frameComplexity(page)
    } catch {
      return // A page we cannot photograph is not one to wait on.
    }

    if (complexity > best * PAINT_RISE) {
      best = complexity
      settled = 0
    } else {
      settled++
      if (complexity > best) best = complexity
    }

    if (settled >= PAINT_SETTLED_SAMPLES && best >= PAINT_FLOOR) return

    await new Promise(r => setTimeout(r, PAINT_SAMPLE_INTERVAL_MS))
  }
}

interface ClampedCapture {
  buffer: Buffer
  /** Device pixels actually captured, for judging how much is in the frame. */
  megapixels: number
}

async function captureClamped(page: Page, quality: number): Promise<ClampedCapture> {
  const { scrollWidth, scrollHeight, viewportWidth, dpr } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    dpr: window.devicePixelRatio || 1,
  }))

  const budget = Math.floor(MAX_CAPTURE_DEVICE_PIXELS / Math.max(dpr, 1))

  // Width has to be clamped as well as height. Chrome's ceiling applies to both
  // dimensions, and only the height was ever checked — so a page reporting a
  // scrollWidth of 11520 blew the budget at 23040 device pixels no matter how
  // short the clip was, and came back empty every time.
  //
  // A document much wider than its own viewport is overflow, not layout: a
  // rogue absolutely-positioned element, or a horizontal carousel measured at
  // full length. Capturing that is not what the page looks like, so fall back
  // to the viewport width, which is what a visitor actually sees.
  const width = scrollWidth > viewportWidth * 1.5
    ? viewportWidth
    : Math.min(scrollWidth, budget)

  const height = Math.min(scrollHeight, budget)

  const withinBudget = scrollWidth <= budget && scrollHeight <= budget
  const megapixels = (width * height * dpr * dpr) / 1e6

  if (withinBudget && width === scrollWidth) {
    const buffer = await page.screenshot({ fullPage: true, type: 'webp', quality }) as Buffer
    return { buffer, megapixels: (scrollWidth * scrollHeight * dpr * dpr) / 1e6 }
  }

  const buffer = await page.screenshot({
    type: 'webp',
    quality,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  }) as Buffer
  return { buffer, megapixels }
}

/**
 * Bytes of WebP per megapixel — the same measure `waitForPaint` uses, applied to
 * the finished capture.
 */
function density(capture: ClampedCapture): number {
  return capture.megapixels > 0 ? capture.buffer.length / capture.megapixels : 0
}

/**
 * Under this, a full-page capture is a picture of nothing much. Measured across
 * the library: the captures that turned out to be preloaders and blank frames
 * sat between 2,500 and 3,300, while the sparsest real page that belongs here —
 * a plain text site — came in at 7,800.
 */
const FLAT_FRAME_DENSITY = 5000

function flatFrame(capture: ClampedCapture): boolean {
  return density(capture) < FLAT_FRAME_DENSITY
}

/**
 * A capture can fail because the frame was replaced or the renderer was still
 * busy, neither of which is a property of the site. Retry those — after
 * letting the document settle — rather than returning no screenshot for a page
 * that had merely moved.
 */
async function captureWithRetry(
  page: Page,
  label: string,
  capture: () => Promise<ClampedCapture>,
): Promise<ClampedCapture | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await capture()
    } catch (err) {
      const transient = FRAME_REPLACED.test(String(err)) || /Unable to capture screenshot|Protocol error/i.test(String(err))
      if (!transient || attempt === 2) {
        console.error(`[screenshot] ${label}:`, err)
        return null
      }
      console.warn(`[screenshot] ${label}: frame moved mid-capture — retrying`)
      await settleNavigation(page, 5000)
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return null
}

export async function captureFullPageScreenshot(
  page: Page,
  siteUrl: string,
  // `settlePage` has already walked the page when this runs as part of a full
  // extraction. Walking it a second time costs 80ms per 400px — some 2.5s on a
  // tall page — to arrive exactly where we already are.
  opts: { scroll?: boolean } = {},
): Promise<string | null> {
  try {
    if (opts.scroll !== false) await autoScroll(page)
    await new Promise(r => setTimeout(r, 800))

    let capture = await captureWithRetry(page, `${siteUrl} full-page`, () => captureClamped(page, 92))

    // A capture with almost nothing in it means the page was not ready, whatever
    // it said. Walking a page can restart an intro, and a scroll-triggered
    // reveal may not have run at all — so give it a moment and take one more,
    // keeping whichever frame has more in it. One retry: past that, the site
    // genuinely is this sparse.
    if (capture?.buffer?.length && flatFrame(capture)) {
      console.warn(`[screenshot] ${siteUrl}: frame looks unpainted — one more attempt`)
      // Half the budget: the page has already had the full one before this.
      await waitForPaint(page, PAINT_MAX_WAIT_MS / 2)
      const second = await captureWithRetry(page, `${siteUrl} full-page (second)`, () => captureClamped(page, 92))
      if (second?.buffer?.length && density(second) > density(capture)) capture = second
    }

    let buffer = capture?.buffer

    // Chrome silently returns an empty buffer when a page is too tall to encode.
    // Uploading that produces a blob that serves 200 with no body, which the
    // image optimizer answers with a 502 and a broken card.
    if (!buffer || buffer.length === 0) {
      console.warn(`[screenshot] full-page capture empty for ${siteUrl}; retrying viewport capture`)
      buffer = await page.screenshot({ type: 'webp', quality: 92 }) as Buffer
      if (!buffer || buffer.length === 0) {
        console.error(`[screenshot] empty buffer for ${siteUrl} — not uploading`)
        return null
      }
    }

    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `screenshots/${hostname}-${Date.now()}.webp`

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/webp',
    })

    return blob.url
  } catch (err) {
    console.error('[screenshot] capture/upload failed:', err)
    return null
  }
}

export async function captureMobileScreenshot(
  page: Page,
  siteUrl: string
): Promise<string | null> {
  try {
    // 3× device pixel ratio matches iPhone retina — crisp at any display size
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
    await new Promise(r => setTimeout(r, 1200))

    // The mobile layout is a different document in all but name — its own lazy
    // boundaries, its own breakpoint content — so this pass is not a repeat of
    // the desktop one.
    await autoScroll(page, 300)
    await new Promise(r => setTimeout(r, 600))

    const capture = await captureWithRetry(page, `${siteUrl} mobile`, () => captureClamped(page, 92))
    const buffer = capture?.buffer

    if (!buffer || buffer.length === 0) {
      console.error(`[screenshot] empty mobile buffer for ${siteUrl} — not uploading`)
      await page.setViewport({ width: 1440, height: 900 })
      return null
    }

    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `screenshots/${hostname}-${Date.now()}-mobile.webp`

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/webp',
    })

    await page.setViewport({ width: 1440, height: 900 })
    return blob.url
  } catch (err) {
    console.error('[screenshot] mobile capture failed:', err)
    return null
  }
}

export async function extractTypographyWithRoles(page: Page): Promise<Array<{
  fontFamily: string
  role: 'heading' | 'body' | 'mono'
  googleFontsUrl: string | null
  primaryWeight: number
  sampleSizePx: number | null
  sampleLineHeight: string | null
}>> {
  const raw = await page.evaluate(() => {
    // A computed family that resolves to one of these tells us the site's own
    // font never loaded, or never existed. Recording it would put "Arial" in
    // the library under a site's name.
    const GENERIC = new Set([
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
      'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
      '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial', 'unset',
    ])

    function familyOf(el: Element): { family: string; weight: number; size: number; lineHeight: string | null } | null {
      const style = getComputedStyle(el)
      const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
      if (!family || GENERIC.has(family.toLowerCase())) return null
      // The measured sample, not the specimen's display size: what the role
      // actually renders at on the site. Stored per role for the Type tab.
      const lh = style.lineHeight && style.lineHeight !== 'normal' ? style.lineHeight : null
      return {
        family,
        weight: parseInt(style.fontWeight, 10) || 400,
        size: parseFloat(style.fontSize) || 0,
        lineHeight: lh,
      }
    }

    function isVisible(el: Element): boolean {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) return false
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none') return false
      return parseFloat(s.opacity || '1') > 0.05
    }

    // --- Heading: the largest visible text on the page, whatever tag carries it.
    // Reading `querySelector('h1')` missed every site that builds headings out
    // of divs, and every site that keeps a visually-hidden h1 for SEO in a
    // different font from the one you can actually see.
    let heading: { family: string; weight: number; size: number; lineHeight: string | null } | null = null
    let headingSize = 0
    const headingCandidates = document.querySelectorAll(
      'h1, h2, h3, [class*="title" i], [class*="heading" i], [class*="display" i], [class*="hero" i]',
    )
    for (const el of Array.from(headingCandidates).slice(0, 250)) {
      if (!isVisible(el)) continue
      const f = familyOf(el)
      if (f && f.size > headingSize) {
        heading = { family: f.family, weight: f.weight, size: f.size, lineHeight: f.lineHeight }
        headingSize = f.size
      }
    }

    // --- Body: the family covering the most rendered text area.
    // "Whatever the first <p> uses" was a guess that failed on any page whose
    // first paragraph happened to be a caption, a legal line, or absent.
    const areaByFamily = new Map<string, { area: number; weight: number; size: number; lineHeight: string | null }>()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node: Node | null
    let visited = 0
    while ((node = walker.nextNode()) !== null && visited < 1500) {
      const text = node.nodeValue?.trim()
      if (!text || text.length < 3) continue
      const el = node.parentElement
      if (!el || !isVisible(el)) continue
      visited++
      const f = familyOf(el)
      // Display sizes are not body text however much of them there is.
      if (!f || f.size > 32) continue
      const r = el.getBoundingClientRect()
      const entry = areaByFamily.get(f.family) ?? { area: 0, weight: f.weight, size: f.size, lineHeight: f.lineHeight }
      entry.area += r.width * r.height
      areaByFamily.set(f.family, entry)
    }

    let body: { family: string; weight: number; size: number; lineHeight: string | null } | null = null
    let bodyArea = 0
    for (const [family, entry] of areaByFamily) {
      if (entry.area > bodyArea) {
        body = { family, weight: entry.weight, size: entry.size, lineHeight: entry.lineHeight }
        bodyArea = entry.area
      }
    }
    if (!body) {
      const fallback = familyOf(document.body)
      if (fallback) body = { family: fallback.family, weight: fallback.weight, size: fallback.size, lineHeight: fallback.lineHeight }
    }

    // --- Mono
    // Selectors alone are not evidence. A <code> block styled in the body font,
    // or an element whose class merely contains "code", was enough to record a
    // proportional face as a site's monospace font — Stripe came back claiming
    // Söhne. Measure it instead: in a monospace face every glyph is the same
    // width, so 'iiii' and 'WWWW' render identically.
    function isMonospaced(family: string): boolean {
      const probe = document.createElement('span')
      probe.style.cssText =
        `position:absolute;visibility:hidden;white-space:pre;font-size:64px;font-family:'${family}',monospace`
      document.body.appendChild(probe)
      try {
        probe.textContent = 'iiiiiiiiii'
        const narrow = probe.getBoundingClientRect().width
        probe.textContent = 'WWWWWWWWWW'
        const wide = probe.getBoundingClientRect().width
        if (narrow === 0 || wide === 0) return false
        return Math.abs(wide - narrow) / wide < 0.02
      } finally {
        probe.remove()
      }
    }

    let mono: { family: string; weight: number; size: number; lineHeight: string | null } | null = null
    const monoCandidates = document.querySelectorAll('code, pre, kbd, samp, [class*="mono" i], [class*="code" i]')
    for (const el of Array.from(monoCandidates).slice(0, 60)) {
      const f = familyOf(el)
      if (f && isMonospaced(f.family)) {
        mono = { family: f.family, weight: f.weight, size: f.size, lineHeight: f.lineHeight }
        break
      }
    }

    const fontLinks = Array.from(
      document.querySelectorAll(
        'link[href*="fonts.googleapis.com"], link[href*="use.typekit"], link[href*="fonts.bunny.net"]',
      ),
    ).map(l => (l as HTMLLinkElement).href)

    return { heading, body, mono, fontLinks }
  })

  const results: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
    sampleSizePx: number | null
    sampleLineHeight: string | null
  }> = []

  /** Google encodes a family as "Space+Grotesk" or "Space%20Grotesk" depending on the API version. */
  function findFontUrl(family: string): string | null {
    const needle = family.toLowerCase()
    const variants = [
      needle.replace(/\s+/g, '+'),
      needle.replace(/\s+/g, '%20'),
      needle.replace(/\s+/g, '-'),
      needle.replace(/\s+/g, ''),
    ]
    return raw.fontLinks.find(url => variants.some(v => url.toLowerCase().includes(v))) ?? null
  }

  for (const [role, data] of [
    ['heading', raw.heading],
    ['body', raw.body],
    ['mono', raw.mono],
  ] as const) {
    if (!data) continue
    results.push({
      fontFamily: data.family,
      role,
      googleFontsUrl: findFontUrl(data.family),
      primaryWeight: data.weight,
      sampleSizePx: data.size > 0 ? Math.round(data.size * 10) / 10 : null,
      sampleLineHeight: data.lineHeight,
    })
  }

  return results
}

/**
 * Above this many colours, a page that yielded no type and no assets is treated
 * as an extraction failure rather than an empty document — the colours prove
 * there was something there to read.
 */
const EMPTY_PAGE_MAX_COLORS = 6

export interface FullExtractionResult {
  colors: string[]
  screenshotUrl: string | null
  mobileScreenshotUrl: string | null
  /**
   * The page loaded, but there was nothing on it to read — no type, no assets,
   * and at most one colour. Callers must not write this result over what they
   * already hold: an outage page that answers 200 is indistinguishable from a
   * site until you look at what came back, and the picture of one is a picture
   * of somebody's PHP error, filed as their design.
   */
  renderedNothing?: boolean
  assets: import('./asset-extraction').ExtractedAsset[]
  typography: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
    sampleSizePx: number | null
    sampleLineHeight: string | null
  }>
  /** Hover clip (Phase 3). Null when recording was impossible or failed. */
  motionClipUrl: string | null
  motionBytes: number | null
  /** Failure category for a failed capture — same vocabulary as extraction_error. */
  motionError: string | null
  motionTags: MotionTags
}

/**
 * Read assets out of same-origin child frames.
 *
 * Cross-origin frames are skipped: their document is unreachable by design, and
 * what they contain is almost always somebody else's advertising rather than
 * this site's design language.
 */
async function extractFromChildFrames(
  page: Page,
  siteUrl: string,
): Promise<import('./asset-extraction').ExtractedAsset[]> {
  const origin = new URL(siteUrl).origin
  const collected: import('./asset-extraction').ExtractedAsset[] = []

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue

    const frameUrl = frame.url()

    // An about:blank child frame inherits its parent's origin and is fully
    // reachable — script writes into it after load. Skipping those was wrong:
    // cameronsworld.net is exactly this shape, an <iframe src=""> that the page
    // then fills, and it read as a site with no imagery at all.
    const inheritsOrigin = !frameUrl || frameUrl === 'about:blank'
    if (!inheritsOrigin) {
      try {
        if (new URL(frameUrl).origin !== origin) continue
      } catch {
        continue
      }
    }

    try {
      // extractAssets takes a Page, but only ever calls evaluate on it — and a
      // Frame carries the same method with the same signature.
      const framed = await extractAssets(frame as unknown as Page, siteUrl)
      collected.push(...framed)
      if (collected.length >= 40) break
    } catch (err) {
      console.warn(`[extract] frame ${frameUrl} failed:`, err)
    }
  }

  return collected
}

export async function extractFullDesignData(url: string): Promise<FullExtractionResult> {
  const browser = await getBrowser()
  if (!browser) {
    console.error('[extractFullDesignData] Browser unavailable for:', url)
    return { colors: [], screenshotUrl: null, mobileScreenshotUrl: null, assets: [], typography: [], motionClipUrl: null, motionBytes: null, motionError: 'unknown', motionTags: { hasTransitions: false, hasAnimations: false, easings: [] } }
  }
  const page = await browser.newPage()

  try {
    await page.setBypassCSP(true)
    await page.setUserAgent(DESKTOP_UA)
    // 2× device pixel ratio — crisp on retina displays, equivalent to ~2880px effective width
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

    await gotoResilient(page, url)
    await waitPastInterstitial(page, url)
    await settleNavigation(page)
    await settlePage(page)

    // Pure reads, so they are safe to run together — but only now that nothing
    // is scrolling the page underneath them. Each one is caught and retried on
    // its own: a site whose assets throw should still yield its colours and its
    // type, and a redirect that replaces the document mid-read no longer costs
    // the whole extraction.
    const [colors, assets, typography] = await Promise.all([
      readPage(page, `colors for ${url}`, () => extractBrandColors(page), [] as string[]),
      readPage(
        page,
        `assets for ${url}`,
        () => extractAssets(page, url),
        [] as import('./asset-extraction').ExtractedAsset[],
      ),
      readPage(
        page,
        `typography for ${url}`,
        () => extractTypographyWithRoles(page),
        [] as Awaited<ReturnType<typeof extractTypographyWithRoles>>,
      ),
    ])

    // Some sites put their whole document inside a frame — cameronsworld.net is
    // nothing but one — and everything above reads the top document only. Going
    // looking is reserved for the case where the main document came up thin, so
    // the sites that already work keep exactly the behaviour they have, and ad
    // and analytics frames on ordinary pages are never trawled for "assets".
    if (assets.length < 3) {
      const framed = await extractFromChildFrames(page, url)
      if (framed.length > 0) {
        console.log(`[extract] ${url}: recovered ${framed.length} assets from child frames`)
        assets.push(...framed)
      }
    }

    // Nothing to read means nothing to photograph. Three empty extractors is
    // not a site with an unusual design — it is a page that did not render:
    // an outage notice served with a 200, a challenge wall, a domain that has
    // lapsed into a parking page. newterritory.studio went down behind a Kirby
    // PHP error and a backfill run captured that error as the studio's card.
    // Returning early keeps the previous capture, and saves the two captures.
    // No text worth reading and no images at all. Type is the load-bearing half:
    // anything with words on it yields a family, and even the canvas games in the
    // library — which legitimately have no assets — still report their type. The
    // colour bound only separates "the page was empty" from "both extractors
    // threw"; an outage notice yields a handful, a rendered page yields dozens.
    if (typography.length === 0 && assets.length === 0 && colors.length <= EMPTY_PAGE_MAX_COLORS) {
      console.warn(`[extract] ${url}: page rendered nothing readable — leaving existing data alone`)
      return {
        colors: [],
        screenshotUrl: null,
        mobileScreenshotUrl: null,
        assets: [],
        typography: [],
        renderedNothing: true,
        motionClipUrl: null,
        motionBytes: null,
        motionError: null,
        motionTags: { hasTransitions: false, hasAnimations: false, easings: [] },
      }
    }

    // Motion vocabulary is pure DOM reads — no ffmpeg needed, recorded on
    // every run for later filtering.
    const motionTags = await extractMotionTags(page)

    // Captures scroll and resize the viewport, so they come after every read.
    const screenshotUrl = await captureFullPageScreenshot(page, url, { scroll: false })
    const mobileScreenshotUrl = await captureMobileScreenshot(page, url)

    // The take runs last: it scrolls, resizes, and leaves a hover behind,
    // and nothing downstream may read the page after it. ~8s against the
    // function's 60s budget; any failure keeps the screenshots.
    let motionClipUrl: string | null = null
    let motionBytes: number | null = null
    let motionError: string | null = null
    const ffmpegPath = resolveFfmpegPath()
    if (ffmpegPath) {
      const { existsSync: exists, readFileSync, unlinkSync } = await import('node:fs')
      const outcome = await recordMotionClip(page, url, ffmpegPath)
      if ('clip' in outcome && exists(outcome.clip.tmpPath)) {
        try {
          const hostname = new URL(url).hostname.replace(/\./g, '-')
          const filename = `motion/${hostname}-${Date.now()}.webm`
          const blob = await put(filename, readFileSync(outcome.clip.tmpPath), {
            access: 'public',
            contentType: 'video/webm',
          })
          motionClipUrl = blob.url
          motionBytes = outcome.clip.bytes
        } catch (err) {
          console.error('[motion] upload failed:', err)
        } finally {
          try { unlinkSync(outcome.clip.tmpPath) } catch {}
        }
      } else if ('failed' in outcome) {
        // The oversize cap is enforced by discarding, not by erroring: only
        // genuine capture failures are recorded, in the shared vocabulary.
        const known = ['bot_protection', 'login_required', 'timeout', 'not_found', 'unknown']
        if (known.includes(outcome.failed)) motionError = outcome.failed
      }
    }

    return { colors, screenshotUrl, mobileScreenshotUrl, assets, typography, motionClipUrl, motionBytes, motionError, motionTags }
  } finally {
    await page.close().catch(() => {})
  }
}
