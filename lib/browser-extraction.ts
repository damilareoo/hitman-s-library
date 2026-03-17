import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer'
import type { Page } from 'puppeteer'
import { put } from '@vercel/blob'
import { existsSync, unlinkSync } from 'fs'
import { extractAssets } from './asset-extraction'

// For serverless environments, use the lightweight Chromium from Sparticuz
let browser: any = null

export async function getBrowser() {
  if (browser) return browser

  try {
    // On Vercel, AWS_EXECUTION_ENV is not set, so @sparticuz/chromium's
    // executablePath() skips extracting al2.tar.br — the shared-lib bundle
    // that provides libnss3.so (required by the Chromium binary).
    //
    // Strategy:
    // 1. If /tmp/chromium is cached from a prior invocation that ran without al2,
    //    delete it so the next executablePath() call does a full re-extraction.
    // 2. Set AWS_EXECUTION_ENV to make executablePath() include al2.tar.br.
    // 3. After extraction, add /tmp/al2 to LD_LIBRARY_PATH so the subprocess
    //    can resolve libnss3.so at launch.
    if (process.env.VERCEL) {
      if (existsSync('/tmp/chromium') && !existsSync('/tmp/al2')) {
        try { unlinkSync('/tmp/chromium') } catch {}
      }
      if (!process.env.AWS_EXECUTION_ENV) {
        process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs18.x'
      }
    }

    const executablePath = await chromium.executablePath()

    if (process.env.VERCEL) {
      const libPath = process.env.LD_LIBRARY_PATH ?? ''
      if (!libPath.includes('/tmp/al2')) {
        process.env.LD_LIBRARY_PATH = `/tmp/al2:${libPath}`
      }
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    })
    console.log('[v0] Browser instance created successfully')
    return browser
  } catch (error) {
    console.error('[v0] Failed to launch browser:', error)
    return null
  }
}

export async function extractTypographyFromRenderedPage(url: string): Promise<string[]> {
  const fonts: Set<string> = new Set()

  try {
    const browser = await getBrowser()
    if (!browser) {
      console.warn('[v0] Browser not available, falling back to HTML parsing')
      return []
    }

    const page = await browser.newPage()
    
    // Set viewport
    await page.setViewport({ width: 1440, height: 900 })

    // Navigate to page with timeout
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      })
    } catch (navigationError) {
      console.warn('[v0] Navigation timeout, proceeding with partial content:', navigationError)
      // Continue anyway with what we have
    }

    // Wait for fonts to load and JavaScript to execute
    await page.waitForTimeout(3000)

    // COMPREHENSIVE EXTRACTION STRATEGY 1: Extract all computed styles
    const computedFonts = await page.evaluate(() => {
      const fonts: Set<string> = new Set()
      
      // Get ALL elements on page (including shadow DOM if accessible)
      const elements = document.querySelectorAll('*')
      console.log('[v0 BROWSER] Total elements:', elements.length)
      
      let foundCount = 0
      elements.forEach((element, idx) => {
        try {
          const styles = window.getComputedStyle(element)
          const fontFamily = styles.fontFamily

          if (fontFamily && fontFamily.trim() && fontFamily !== 'initial') {
            // Parse all fonts in the stack, don't filter
            const fontList = fontFamily.split(',').map(f => {
              let cleaned = f.trim().replace(/^["']|["']$/g, '')
              return cleaned
            })
            
            fontList.forEach(f => {
              if (f && f.length > 0 && f.length < 200) {
                fonts.add(f)
                foundCount++
              }
            })
          }
        } catch (e) {
          // Ignore
        }
      })
      
      console.log('[v0 BROWSER] Found computed fonts:', fonts.size, 'in', foundCount, 'element references')
      return Array.from(fonts)
    })

    computedFonts.forEach(f => {
      if (f) fonts.add(f)
    })
    console.log('[v0] Computed fonts extracted:', fonts.size)

    // EXTRACTION STRATEGY 2: Check ALL stylesheets for @font-face rules
    const fontFaceRules = await page.evaluate(() => {
      const fonts: string[] = []
      
      try {
        const sheets = document.styleSheets
        console.log('[v0 BROWSER] Total stylesheets:', sheets.length)
        
        for (let i = 0; i < sheets.length; i++) {
          try {
            const rules = sheets[i].cssRules
            if (!rules) continue
            
            for (let j = 0; j < rules.length; j++) {
              try {
                const rule = rules[j]
                // Check for @font-face
                if (rule.type === 5 || rule instanceof CSSFontFaceRule) {
                  const fontFamily = (rule as any).style?.fontFamily || (rule as CSSFontFaceRule).style?.fontFamily
                  if (fontFamily) {
                    const cleaned = fontFamily.replace(/^["']|["']$/g, '').trim()
                    if (cleaned) {
                      fonts.push(cleaned)
                      console.log('[v0 BROWSER] Found @font-face:', cleaned)
                    }
                  }
                }
              } catch (e) {
                // Skip individual rule errors
              }
            }
          } catch (e) {
            // Skip cross-origin or access errors
          }
        }
      } catch (e) {
        console.error('[v0 BROWSER] Error checking stylesheets:', e)
      }
      
      return fonts
    })

    fontFaceRules.forEach(f => {
      if (f) fonts.add(f)
    })
    console.log('[v0] Font-face rules extracted:', fontFaceRules.length)

    // EXTRACTION STRATEGY 3: Check link tags for font imports
    const linkFonts = await page.evaluate(() => {
      const fonts: string[] = []
      const links = document.querySelectorAll('link[href*="font"], link[href*="googleapis"]')
      
      links.forEach(link => {
        const href = link.getAttribute('href') || ''
        
        // Google Fonts
        if (href.includes('fonts.googleapis.com')) {
          const match = href.match(/family=([^&]+)/)
          if (match) {
            try {
              const families = decodeURIComponent(match[1]).split('|')
              families.forEach(f => {
                const name = f.split(':')[0].trim()
                if (name) fonts.push(name)
              })
            } catch (e) {}
          }
        }
      })
      
      return fonts
    })

    linkFonts.forEach(f => {
      if (f) fonts.add(f)
    })
    console.log('[v0] Link fonts extracted:', linkFonts.length)

    // EXTRACTION STRATEGY 4: Check for CSS text with font-family declarations
    const cssTextFonts = await page.evaluate(() => {
      const fonts: string[] = []
      
      try {
        // Get all style elements
        const styles = document.querySelectorAll('style')
        styles.forEach((style) => {
          const cssText = style.textContent || ''
          // Look for all font-family declarations
          const matches = cssText.match(/font-family\s*:\s*([^;}\n]+)/gi)
          if (matches) {
            matches.forEach(match => {
              const value = match.replace(/font-family\s*:\s*/i, '').trim()
              const fontList = value.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''))
              fontList.forEach(f => {
                if (f && f.length > 0) fonts.push(f)
              })
            })
          }
        })
      } catch (e) {
        console.error('[v0 BROWSER] Error parsing CSS text:', e)
      }
      
      return fonts
    })

    cssTextFonts.forEach(f => {
      if (f) fonts.add(f)
    })
    console.log('[v0] CSS text fonts extracted:', cssTextFonts.length)

    // EXTRACTION STRATEGY 5: Parse inline styles
    const inlineFonts = await page.evaluate(() => {
      const fonts: string[] = []
      
      const elements = document.querySelectorAll('[style*="font"]')
      elements.forEach(el => {
        const style = el.getAttribute('style') || ''
        const matches = style.match(/font-family\s*:\s*([^;]+)/i)
        if (matches) {
          const value = matches[1].trim()
          const fontList = value.split(',').map(f => f.trim().replace(/^["']|["']$/g, ''))
          fontList.forEach(f => {
            if (f && f.length > 0) fonts.push(f)
          })
        }
      })
      
      return fonts
    })

    inlineFonts.forEach(f => {
      if (f) fonts.add(f)
    })
    console.log('[v0] Inline fonts extracted:', inlineFonts.length)

    await page.close()
    
    const result = Array.from(fonts)
    console.log('[v0] Total unique fonts found:', result.length)
    console.log('[v0] Fonts:', result.slice(0, 30))
    
    return result.slice(0, 50) // Allow up to 50 fonts
  } catch (error) {
    console.error('[v0] Error extracting typography from rendered page:', error)
    return []
  }
}

export async function extractAllDesignDataFromRenderedPage(url: string): Promise<{
  fonts: string[]
  colors: string[]
  computedStyles: Record<string, any>
}> {
  try {
    const browser = await getBrowser()
    if (!browser) {
      return { fonts: [], colors: [], computedStyles: {} }
    }

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      })
    } catch (error) {
      console.warn('[v0] Navigation timeout, proceeding:', error)
    }

    await page.waitForTimeout(3000)

    const data = await page.evaluate(() => {
      const fonts = new Set<string>()
      const colors = new Set<string>()
      const computedStyles: Record<string, any> = {}

      // Extract all unique fonts and colors from computed styles
      document.querySelectorAll('*').forEach((el, index) => {
        if (index < 500) { // Increased from 200
          const styles = window.getComputedStyle(el)
          
          // Fonts - NO filtering
          if (styles.fontFamily && styles.fontFamily !== 'initial') {
            styles.fontFamily.split(',').forEach(f => {
              const cleaned = f.trim().replace(/^["']|["']$/g, '')
              if (cleaned && cleaned.length > 0) fonts.add(cleaned)
            })
          }

          // Colors
          ['color', 'backgroundColor', 'borderColor', 'outlineColor'].forEach(prop => {
            const value = styles[prop as any]
            if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
              colors.add(value)
            }
          })
        }
      })

      // Check for @font-face rules
      for (let sheet of document.styleSheets) {
        try {
          if (sheet.cssRules) {
            for (let rule of sheet.cssRules) {
              if (rule.type === 5 || rule instanceof CSSFontFaceRule) {
                const fontFamily = (rule as any).style?.fontFamily
                if (fontFamily) {
                  fonts.add(fontFamily.replace(/^["']|["']$/g, ''))
                }
              }
            }
          }
        } catch (e) {
          // Skip
        }
      }

      return {
        fonts: Array.from(fonts).slice(0, 50),
        colors: Array.from(colors).slice(0, 30),
        computedStyles: {}
      }
    })

    await page.close()
    return data
  } catch (error) {
    console.error('[v0] Error extracting all design data:', error)
    return { fonts: [], colors: [], computedStyles: {} }
  }
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

    // --- Pass 2: Structural UI element colors ---
    const uiSelectors = ['header', 'nav', 'footer', 'button', '[role="button"]', 'a', 'h1', 'h2', 'body']
    const cssProps = ['color', 'backgroundColor', 'borderColor'] as const

    for (const selector of uiSelectors) {
      const els = Array.from(document.querySelectorAll(selector)).slice(0, 8)
      for (const el of els) {
        const style = getComputedStyle(el)
        for (const prop of cssProps) {
          const val = style[prop as keyof CSSStyleDeclaration] as string
          if (
            val &&
            val !== 'transparent' &&
            val !== 'rgba(0, 0, 0, 0)' &&
            !val.includes('inherit') &&
            !val.includes('currentColor') &&
            !val.includes('initial')
          ) {
            rawColors.push(val)
          }
        }
      }
    }

    return rawColors
  })
}

export async function captureFullPageScreenshot(
  page: Page,
  siteUrl: string
): Promise<string | null> {
  try {
    const buffer = await page.screenshot({
      fullPage: true,
      type: 'webp',
      quality: 85,
    }) as Buffer

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

export async function extractTypographyWithRoles(page: Page): Promise<Array<{
  fontFamily: string
  role: 'heading' | 'body' | 'mono'
  googleFontsUrl: string | null
  primaryWeight: number
}>> {
  const raw = await page.evaluate(() => {
    function fontFrom(el: Element | null): { family: string; weight: number } | null {
      if (!el) return null
      const style = getComputedStyle(el)
      const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
      const weight = parseInt(style.fontWeight, 10) || 400
      if (!family || family === 'serif' || family === 'sans-serif' || family === 'monospace') return null
      return { family, weight }
    }

    const gfLinks = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'))
      .map(l => (l as HTMLLinkElement).href)

    return {
      heading: fontFrom(document.querySelector('h1')),
      body: fontFrom(document.querySelector('p') ?? document.body),
      mono: fontFrom(document.querySelector('code, pre')),
      gfLinks,
    }
  })

  const results: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
  }> = []

  for (const [role, data] of [
    ['heading', raw.heading],
    ['body', raw.body],
    ['mono', raw.mono],
  ] as const) {
    if (!data) continue
    const googleFontsUrl = raw.gfLinks.find(url =>
      url.toLowerCase().includes(data.family.toLowerCase().replace(/\s+/g, '+'))
    ) ?? null

    results.push({
      fontFamily: data.family,
      role,
      googleFontsUrl,
      primaryWeight: data.weight,
    })
  }

  return results
}

export interface FullExtractionResult {
  colors: string[]
  screenshotUrl: string | null
  assets: import('./asset-extraction').ExtractedAsset[]
  typography: Array<{
    fontFamily: string
    role: 'heading' | 'body' | 'mono'
    googleFontsUrl: string | null
    primaryWeight: number
  }>
}

export async function extractFullDesignData(url: string): Promise<FullExtractionResult> {
  const browser = await getBrowser()
  if (!browser) {
    console.error('[extractFullDesignData] Browser unavailable for:', url)
    return { colors: [], screenshotUrl: null, assets: [], typography: [] }
  }
  const page = await browser.newPage()

  try {
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 3000))

    const [colors, screenshotUrl, assets, typography] = await Promise.all([
      extractBrandColors(page),
      captureFullPageScreenshot(page, url),
      extractAssets(page, url),
      extractTypographyWithRoles(page),
    ])

    return { colors, screenshotUrl, assets, typography }
  } finally {
    await page.close()
  }
}
