import type { FullExtractionResult } from './browser-extraction'
import { extractTypographyEnhanced } from './typography-extraction'
import { safeFetch } from './safe-url'

export interface StaticDesignDetails {
  colors: string[]
  typography: FullExtractionResult['typography']
  typographyData: ReturnType<typeof extractTypographyEnhanced>
  source: string
}

export async function extractStaticDesignData(
  url: string,
  document?: string,
  baseUrl = url,
): Promise<StaticDesignDetails | null> {
  try {
    let html = document
    if (html === undefined) {
      const response = await safeFetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) {
        console.warn(`[extract] HTML fallback refused for ${url}: status ${response.status} type ${response.headers.get('content-type') ?? 'none'}`)
        return null
      }
      html = await response.text()
      baseUrl = response.url
    }

    const stylesheetUrls = Array.from(html.matchAll(/<link\b[^>]*>/gi))
      .filter(([tag]) => /\brel\s*=\s*["'][^"']*stylesheet/i.test(tag))
      .map(([tag]) => tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1])
      .filter((href): href is string => Boolean(href))
      .slice(0, 8)
      .map(href => new URL(href.replace(/&amp;/g, '&'), baseUrl).href)
    const stylesheets = await Promise.all(stylesheetUrls.map(async stylesheetUrl => {
      try {
        const stylesheet = await safeFetch(stylesheetUrl, {
          headers: { Accept: 'text/css,*/*;q=0.1' },
          signal: AbortSignal.timeout(6000),
        })
        if (!stylesheet.ok) {
          console.warn(`[extract] stylesheet fallback refused for ${stylesheetUrl}: status ${stylesheet.status} type ${stylesheet.headers.get('content-type') ?? 'none'}`)
          return ''
        }
        return await stylesheet.text()
      } catch (err) {
        console.warn(`[extract] stylesheet fallback failed for ${stylesheetUrl}:`, err)
        return ''
      }
    }))
    const source = [html, ...stylesheets].join('\n')
    const colors = Array.from(new Set(source.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) ?? []))
    const typographyData = extractTypographyEnhanced(source)
    const typography: FullExtractionResult['typography'] = []
    for (const [role, family] of [
      ['heading', typographyData.headingFonts[0]?.name],
      ['body', typographyData.bodyFonts[0]?.name],
      ['mono', typographyData.monoFonts[0]?.name],
    ] as const) {
      if (family) typography.push({
        fontFamily: family,
        role,
        googleFontsUrl: null,
        primaryWeight: 400,
        sampleSizePx: null,
        sampleLineHeight: null,
      })
    }
    return { colors, typography, typographyData, source }
  } catch (err) {
    console.warn(`[extract] HTML/CSS fallback failed for ${url}:`, err)
    return null
  }
}
