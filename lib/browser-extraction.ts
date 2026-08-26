import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer'
import type { Page } from 'puppeteer'
import { put } from '@vercel/blob'
import { existsSync, unlinkSync } from 'fs'
import { extractAssets } from './asset-extraction'

// For serverless environments, use the lightweight Chromium from Sparticuz
let browser: any = null
let browserInitPromise: Promise<any> | null = null

export async function getBrowser() {
  if (browser) return browser
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
    console.warn(`[extract] navigation incomplete for ${url} — continuing with what rendered`)
    return 'partial'
  }

  const idle = await page
    .waitForNetworkIdle({ idleTime: 500, timeout: IDLE_TIMEOUT })
    .then(() => 'idle' as const)
    .catch(() => 'loaded' as const)

  return idle
}

/** One pass to the bottom and back, slow enough for lazy-loading observers to follow. */
async function autoScroll(page: Page, step = 400): Promise<void> {
  await page
    .evaluate(async (step: number) => {
      await new Promise<void>(resolve => {
        let y = 0
        const id = setInterval(() => {
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
    }, step)
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

async function captureClamped(page: Page, quality: number): Promise<Buffer> {
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
  if (withinBudget && width === scrollWidth) {
    return await page.screenshot({ fullPage: true, type: 'webp', quality }) as Buffer
  }

  return await page.screenshot({
    type: 'webp',
    quality,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  }) as Buffer
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

    const buffer = await captureClamped(page, 92)

    // Chrome silently returns an empty buffer when a page is too tall to encode.
    // Uploading that produces a blob that serves 200 with no body, which the
    // image optimizer answers with a 502 and a broken card.
    if (!buffer || buffer.length === 0) {
      console.error(`[screenshot] empty buffer for ${siteUrl} — not uploading`)
      return null
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

    const buffer = await captureClamped(page, 92)

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

// Fetched once per server instance — avoids loading from inside the headless
// browser where CDN access may be blocked or unreliable.
let _captureScript: string | null = null
async function getCaptureScript(): Promise<string | null> {
  if (_captureScript) return _captureScript
  try {
    const res = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js', {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.error(`[figma-capture] capture.js fetch failed: ${res.status}`)
      return null
    }
    _captureScript = await res.text()
    return _captureScript
  } catch (err) {
    console.error('[figma-capture] could not fetch capture.js:', err)
    return null
  }
}

export async function captureFigmaLayers(
  page: Page,
  siteUrl: string
): Promise<string | null> {
  const captureScript = await getCaptureScript()
  if (!captureScript) {
    console.error('[figma-capture] capture.js unavailable — skipping')
    return null
  }

  try {
    // Restore clean desktop viewport
    await page.setViewport({ width: 1440, height: 900 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(() => document.fonts.ready)
    await new Promise(r => setTimeout(r, 1200))

    // Intercept clipboard.write before injecting the capture script so the
    // script's output is captured even in headless mode (no real clipboard).
    await page.evaluate(() => {
      (window as any).__figmaCapture = null
      navigator.clipboard.write = async (items: ClipboardItem[]) => {
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html')
            ;(window as any).__figmaCapture = await blob.text()
          }
        }
      }
    })

    // Inject capture.js as content — fetched server-side so this works even
    // when Puppeteer's browser context can't reach external CDNs.
    await page.addScriptTag({ content: captureScript })

    // Give the script time to register its hash listener, then trigger capture.
    // figmadelay=2000 tells the script to wait 2s before snapshotting the DOM.
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => {
      window.location.hash = '#figmacapture&figmadelay=2000'
    })

    // Wait up to 35s — large/complex pages can take 20–25s to serialise.
    await page.waitForFunction(
      '(window).__figmaCapture !== null',
      { timeout: 35000 }
    )

    const figmaHtml = await page.evaluate('(window).__figmaCapture') as string
    if (!figmaHtml || figmaHtml.length < 500) {
      console.error('[figma-capture] captured HTML too small or empty')
      return null
    }

    console.log(`[figma-capture] captured ${figmaHtml.length} bytes for ${siteUrl}`)

    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `figma/${hostname}-${Date.now()}.html`
    const blob = await put(filename, figmaHtml, {
      access: 'public',
      contentType: 'text/html',
    })

    return blob.url
  } catch (err) {
    console.error('[figma-capture] failed:', err)
    return null
  }
}

export async function extractTypographyWithRoles(page: Page): Promise<Array<{
  fontFamily: string
  role: 'heading' | 'body' | 'mono'
  googleFontsUrl: string | null
  primaryWeight: number
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

    function familyOf(el: Element): { family: string; weight: number; size: number } | null {
      const style = getComputedStyle(el)
      const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
      if (!family || GENERIC.has(family.toLowerCase())) return null
      return {
        family,
        weight: parseInt(style.fontWeight, 10) || 400,
        size: parseFloat(style.fontSize) || 0,
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
    let heading: { family: string; weight: number } | null = null
    let headingSize = 0
    const headingCandidates = document.querySelectorAll(
      'h1, h2, h3, [class*="title" i], [class*="heading" i], [class*="display" i], [class*="hero" i]',
    )
    for (const el of Array.from(headingCandidates).slice(0, 250)) {
      if (!isVisible(el)) continue
      const f = familyOf(el)
      if (f && f.size > headingSize) {
        heading = { family: f.family, weight: f.weight }
        headingSize = f.size
      }
    }

    // --- Body: the family covering the most rendered text area.
    // "Whatever the first <p> uses" was a guess that failed on any page whose
    // first paragraph happened to be a caption, a legal line, or absent.
    const areaByFamily = new Map<string, { area: number; weight: number }>()
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
      const entry = areaByFamily.get(f.family) ?? { area: 0, weight: f.weight }
      entry.area += r.width * r.height
      areaByFamily.set(f.family, entry)
    }

    let body: { family: string; weight: number } | null = null
    let bodyArea = 0
    for (const [family, entry] of areaByFamily) {
      if (entry.area > bodyArea) {
        body = { family, weight: entry.weight }
        bodyArea = entry.area
      }
    }
    if (!body) {
      const fallback = familyOf(document.body)
      if (fallback) body = { family: fallback.family, weight: fallback.weight }
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

    let mono: { family: string; weight: number } | null = null
    const monoCandidates = document.querySelectorAll('code, pre, kbd, samp, [class*="mono" i], [class*="code" i]')
    for (const el of Array.from(monoCandidates).slice(0, 60)) {
      const f = familyOf(el)
      if (f && isMonospaced(f.family)) {
        mono = { family: f.family, weight: f.weight }
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
  figmaCaptureUrl: string | null
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
  }>
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
    return { colors: [], screenshotUrl: null, mobileScreenshotUrl: null, figmaCaptureUrl: null, assets: [], typography: [] }
  }
  const page = await browser.newPage()

  try {
    await page.setBypassCSP(true)
    await page.setUserAgent(DESKTOP_UA)
    // 2× device pixel ratio — crisp on retina displays, equivalent to ~2880px effective width
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

    await gotoResilient(page, url)
    await settlePage(page)

    // Pure reads, so they are safe to run together — but only now that nothing
    // is scrolling the page underneath them. Each one is caught on its own:
    // a site whose assets throw should still yield its colours and its type,
    // where before any single failure took the whole extraction down with it.
    const [colors, assets, typography] = await Promise.all([
      extractBrandColors(page).catch(err => {
        console.warn(`[extract] colors failed for ${url}:`, err)
        return [] as string[]
      }),
      extractAssets(page, url).catch(err => {
        console.warn(`[extract] assets failed for ${url}:`, err)
        return [] as import('./asset-extraction').ExtractedAsset[]
      }),
      extractTypographyWithRoles(page).catch(err => {
        console.warn(`[extract] typography failed for ${url}:`, err)
        return [] as Awaited<ReturnType<typeof extractTypographyWithRoles>>
      }),
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
        figmaCaptureUrl: null,
        assets: [],
        typography: [],
        renderedNothing: true,
      }
    }

    // Captures scroll and resize the viewport, so they come after every read.
    const screenshotUrl = await captureFullPageScreenshot(page, url, { scroll: false })
    const mobileScreenshotUrl = await captureMobileScreenshot(page, url)

    // Figma layer capture is deliberately not run here. It waits up to 35s and
    // had produced a capture for 0 of 290 sources — it was the bulk of the ~50s
    // an add took, spent on something that never landed. It is still available
    // per-site through /api/design/[id]/figma-capture.
    return { colors, screenshotUrl, mobileScreenshotUrl, figmaCaptureUrl: null, assets, typography }
  } finally {
    await page.close().catch(() => {})
  }
}
