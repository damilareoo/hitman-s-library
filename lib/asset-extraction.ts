// lib/asset-extraction.ts
import type { Page } from 'puppeteer'

export interface ExtractedAsset {
  type: 'logo' | 'icon' | 'illustration' | 'image'
  content: string
  width: number
  height: number
}

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

    // --- Logo detection (first tier with results wins) ---
    let logoEls: Element[] = []

    // Tier 1: header/nav SVG or img linked to root
    for (const link of Array.from(document.querySelectorAll('header a, nav a'))) {
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

    // Tier 2: img alt matches site title
    if (logoEls.length === 0) {
      const title = document.title.split(/[|\-–]/)[0].trim().toLowerCase()
      if (title.length > 2) {
        logoEls = Array.from(document.querySelectorAll('img')).filter(img =>
          img.alt && img.alt.toLowerCase().includes(title)
        ).slice(0, 2)
      }
    }

    // Tier 3: first SVG/img in top 100px viewport, 20–300px wide
    if (logoEls.length === 0) {
      logoEls = Array.from(document.querySelectorAll('svg, img')).filter(el => {
        const r = el.getBoundingClientRect()
        return r.top <= 100 && r.width >= 20 && r.width <= 300
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
        const src = resolveUrl((el as HTMLImageElement).src)
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

    for (const svg of Array.from(document.querySelectorAll('svg'))) {
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

    for (const img of Array.from(document.querySelectorAll('img'))) {
      if (img.naturalWidth < 100 || img.naturalHeight < 100) continue
      const src = resolveUrl(img.src)
      if (!src) continue
      if (src.startsWith('data:') && src.length > 2048) continue
      if (imgDedupe.has(src)) continue
      imgDedupe.add(src)
      if (imageCount < 20) {
        assets.push({ type: 'image', content: src, width: img.naturalWidth, height: img.naturalHeight })
        imageCount++
      }
    }

    return assets
  }, origin)
}
