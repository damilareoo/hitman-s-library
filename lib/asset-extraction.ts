// lib/asset-extraction.ts
import type { Page } from 'puppeteer'

export interface ExtractedAsset {
  type: 'logo' | 'icon' | 'illustration' | 'image'
  content: string
  width: number
  height: number
}

/**
 * Read every reusable graphic off a rendered page.
 *
 * Call this only on a settled page — `settlePage()` in browser-extraction.ts.
 * Everything here measures live geometry, so a page still scrolling or still
 * loading its images reports the wrong answers rather than no answer, which is
 * the harder kind of failure to notice.
 */
export async function extractAssets(
  page: Page,
  siteUrl: string
): Promise<ExtractedAsset[]> {
  const origin = new URL(siteUrl).origin

  return page.evaluate((origin: string) => {
    const assets: Array<{
      type: 'logo' | 'icon' | 'illustration' | 'image'
      content: string
      width: number
      height: number
    }> = []

    function stripIds(html: string): string {
      return html
        .replace(/\s+id="[^"]*"/g, '')
        .replace(/\s+id='[^']*'/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/href="javascript:[^"]*"/gi, '')
    }

    function resolveUrl(src: string): string {
      try { return new URL(src, location.href).href } catch { return src }
    }

    /**
     * Walk light and shadow DOM alike. Component libraries that render into
     * shadow roots — which is most design-system sites of the last few years —
     * were completely invisible to a plain `querySelectorAll`.
     */
    function queryDeep(selector: string, limit = 4000): Element[] {
      const found: Element[] = []
      const roots: (Document | ShadowRoot)[] = [document]

      while (roots.length > 0 && found.length < limit) {
        const root = roots.shift()!
        for (const el of Array.from(root.querySelectorAll(selector))) {
          found.push(el)
          if (found.length >= limit) break
        }
        for (const el of Array.from(root.querySelectorAll('*'))) {
          if ((el as HTMLElement).shadowRoot) roots.push((el as HTMLElement).shadowRoot!)
        }
      }

      return found
    }

    /**
     * The rendered `src` is not always the useful one. A browser picks from
     * `srcset` by viewport and pixel density, which at our 1440×900/2x capture
     * often means a mid-size variant when a larger one exists.
     */
    function bestImageSrc(img: HTMLImageElement): string {
      if (img.currentSrc) return resolveUrl(img.currentSrc)
      if (img.srcset) {
        const best = img.srcset
          .split(',')
          .map(part => {
            const [url, descriptor] = part.trim().split(/\s+/)
            const width = descriptor?.endsWith('w') ? parseInt(descriptor, 10) : 0
            return { url, width }
          })
          .filter(c => c.url)
          .sort((a, b) => b.width - a.width)[0]
        if (best) return resolveUrl(best.url)
      }
      return resolveUrl(img.src)
    }

    // --- Logo detection (first tier with results wins) ---
    let logoEls: Element[] = []

    // Tier 1: header/nav SVG or img linked to root
    for (const link of queryDeep('header a, nav a', 200)) {
      try {
        const href = (link as HTMLAnchorElement).href
        const u = new URL(href)
        if (u.origin !== origin) continue
        if (u.pathname !== '/' && u.pathname !== '') continue
        const svg = link.querySelector('svg')
        const img = link.querySelector('img')
        if (svg && !logoEls.includes(svg)) logoEls.push(svg)
        if (img && !logoEls.includes(img)) logoEls.push(img)
        if (logoEls.length >= 2) break
      } catch { /* invalid href */ }
    }

    // Tier 2: anything that calls itself a logo, or labels itself as the way home.
    // Plenty of sites never wrap their mark in an anchor to "/" at all.
    if (logoEls.length === 0) {
      logoEls = queryDeep(
        '[class*="logo" i], [id*="logo" i], [aria-label*="logo" i], [aria-label*="home" i]',
        50,
      )
        .map(el => el.querySelector('svg, img') ?? (el.tagName === 'SVG' || el.tagName === 'IMG' ? el : null))
        .filter((el): el is Element => el !== null)
        .slice(0, 2)
    }

    // Tier 3: img alt matches site title
    if (logoEls.length === 0) {
      const title = document.title.split(/[|\-–]/)[0].trim().toLowerCase()
      if (title.length > 2) {
        logoEls = queryDeep('img', 500).filter(el => {
          const img = el as HTMLImageElement
          return Boolean(img.alt && img.alt.toLowerCase().includes(title))
        }).slice(0, 2)
      }
    }

    // Tier 4: first SVG/img in top 120px of the document, 20–300px wide.
    // Measured against the document rather than the viewport — the page has
    // been scrolled by now and getBoundingClientRect() alone would be relative
    // to wherever it came to rest.
    if (logoEls.length === 0) {
      logoEls = queryDeep('svg, img', 400).filter(el => {
        const r = el.getBoundingClientRect()
        const documentTop = r.top + window.scrollY
        return documentTop <= 120 && r.width >= 20 && r.width <= 300
      }).slice(0, 2)
    }

    // Serialize logos (deduplicate)
    const logoDedupe = new Set<string>()
    for (const el of logoEls) {
      const r = el.getBoundingClientRect()
      if (el.tagName.toLowerCase() === 'svg') {
        const html = stripIds(el.outerHTML)
        if (html.length > 50000 || logoDedupe.has(html)) continue
        logoDedupe.add(html)
        assets.push({ type: 'logo', content: html, width: Math.round(r.width), height: Math.round(r.height) })
      } else if (el.tagName.toLowerCase() === 'img') {
        const src = bestImageSrc(el as HTMLImageElement)
        if (!src || (src.startsWith('data:') && src.length > 2048)) continue
        if (logoDedupe.has(src)) continue
        logoDedupe.add(src)
        assets.push({ type: 'logo', content: src, width: Math.round(r.width), height: Math.round(r.height) })
      }
    }

    // --- SVG extraction ---
    const svgDedupe = new Set<string>()
    let iconCount = 0
    let illustrationCount = 0

    for (const svg of queryDeep('svg', 600)) {
      const r = svg.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) continue
      const html = stripIds(svg.outerHTML)
      if (html.length > 50000 || svgDedupe.has(html)) continue
      svgDedupe.add(html)

      if (Math.max(r.width, r.height) >= 40) {
        if (illustrationCount < 20) {
          assets.push({ type: 'illustration', content: html, width: Math.round(r.width), height: Math.round(r.height) })
          illustrationCount++
        }
      } else {
        if (iconCount < 50) {
          assets.push({ type: 'icon', content: html, width: Math.round(r.width), height: Math.round(r.height) })
          iconCount++
        }
      }
    }

    // --- Image extraction ---
    const imgDedupe = new Set<string>()
    let imageCount = 0

    for (const el of queryDeep('img', 600)) {
      const img = el as HTMLImageElement
      // A lazy image that never entered the viewport reports 0×0 naturally, and
      // filtering on natural size alone discarded it as if it were a tracking
      // pixel. Fall back to how large the page actually draws it.
      const r = img.getBoundingClientRect()
      const width = img.naturalWidth || Math.round(r.width)
      const height = img.naturalHeight || Math.round(r.height)
      if (width < 100 || height < 100) continue

      const src = bestImageSrc(img)
      if (!src) continue
      if (src.startsWith('data:') && src.length > 2048) continue
      if (imgDedupe.has(src)) continue
      imgDedupe.add(src)
      if (imageCount < 20) {
        assets.push({ type: 'image', content: src, width, height })
        imageCount++
      }
    }

    // --- CSS background images ---
    // Whole categories of site — anything built on hero sections and CSS-driven
    // art direction — carry no <img> tags worth having. Those pages read as
    // having no imagery at all.
    for (const el of queryDeep('[style*="background"], section, header, div[class*="hero" i], div[class*="banner" i]', 400)) {
      if (imageCount >= 20) break
      const bg = getComputedStyle(el).backgroundImage
      if (!bg || bg === 'none') continue

      const match = bg.match(/url\((['"]?)(.*?)\1\)/)
      if (!match?.[2]) continue

      const src = resolveUrl(match[2])
      if (src.startsWith('data:') && src.length > 2048) continue
      if (imgDedupe.has(src)) continue

      const r = el.getBoundingClientRect()
      if (r.width < 100 || r.height < 100) continue

      imgDedupe.add(src)
      assets.push({ type: 'image', content: src, width: Math.round(r.width), height: Math.round(r.height) })
      imageCount++
    }

    return assets
  }, origin)
}
