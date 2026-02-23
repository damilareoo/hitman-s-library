import * as chromium from '@sparticuz/chromium'

// For serverless environments, use the lightweight Chromium from Sparticuz
let browser: any = null

async function getBrowser() {
  if (browser) return browser

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
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
