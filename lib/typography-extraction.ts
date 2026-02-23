// Enhanced typography extraction utilities - AGGRESSIVE APPROACH
export interface TypographyInfo {
  name: string
  size?: string
  weight?: string
  lineHeight?: string
  letterSpacing?: string
  textTransform?: string
  source?: string
}

export interface ExtractedTypography {
  headingFonts: TypographyInfo[]
  bodyFonts: TypographyInfo[]
  monoFonts: TypographyInfo[]
  allFonts: string[]
  fontStack?: Record<string, string[]>
}

// AGGRESSIVE typography extraction from HTML - finds EVERYTHING
export function extractTypographyEnhanced(html: string): ExtractedTypography {
  const headingFonts = new Set<string>()
  const bodyFonts = new Set<string>()
  const monoFonts = new Set<string>()
  const allFonts = new Set<string>()
  const fontStack: Record<string, string[]> = {}
  
  try {
    console.log('[v0] Starting aggressive typography extraction')
    
    // 1. Extract from @font-face declarations (CRITICAL)
    const fontFacePattern = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'"\n;]+)['"]?[^}]*\}/gi
    let match
    let fontFaceCount = 0
    while ((match = fontFacePattern.exec(html)) !== null) {
      const font = cleanFontName(match[1])
      if (font) {
        allFonts.add(font)
        fontFaceCount++
      }
    }
    console.log('[v0] Found', fontFaceCount, '@font-face declarations')
    
    // 2. Extract from @import statements (Google Fonts, etc) - AGGRESSIVE
    const importPattern = /@import\s+(?:url\()?['"]?([^'"\)]+)['"]?\)?;?/gi
    let importCount = 0
    while ((match = importPattern.exec(html)) !== null) {
      const url = match[1]
      const fontNames = extractFontsFromUrl(url)
      fontNames.forEach(f => {
        allFonts.add(f)
        importCount++
      })
    }
    console.log('[v0] Found', importCount, 'fonts from @import statements')
    
    // 3. Extract from <link> tags with comprehensive patterns
    const linkPattern = /<link[^>]*href=["']([^"']*?)["'][^>]*>/gi
    let linkCount = 0
    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1]
      const fontNames = extractFontsFromUrl(href)
      fontNames.forEach(f => {
        allFonts.add(f)
        linkCount++
      })
    }
    console.log('[v0] Found', linkCount, 'fonts from <link> tags')
    
    // 4. Extract from style tags with FULL CSS parsing - NO SELECTOR FILTERING
    const stylePattern = /<style[^>]*>([^<]+)<\/style>/gi
    const styleMatches = html.match(stylePattern) || []
    
    let styleFontCount = 0
    styleMatches.forEach((styleTag) => {
      const styleContent = styleTag.replace(/<\/?style[^>]*>/gi, '')
      
      // Extract ALL font-family declarations - without filtering by selector
      const allFontPattern = /font-family\s*:\s*([^;]+)/gi
      while ((match = allFontPattern.exec(styleContent)) !== null) {
        const fontFamily = match[1].trim()
        const fonts = parseFontStack(fontFamily)
        
        fonts.forEach(font => {
          if (font) {
            allFonts.add(font)
            styleFontCount++
          }
        })
      }
    })
    console.log('[v0] Found', styleFontCount, 'fonts from <style> tags')
    
    // 5. Extract from inline styles - ALL of them
    const inlinePattern = /style=["']([^"']*?)["']/gi
    let inlineCount = 0
    while ((match = inlinePattern.exec(html)) !== null) {
      const styleAttr = match[1]
      const fontMatch = styleAttr.match(/font-family\s*:\s*([^;]+)/i)
      if (fontMatch) {
        const fonts = parseFontStack(fontMatch[1])
        fonts.forEach(f => {
          if (f) {
            allFonts.add(f)
            inlineCount++
          }
        })
      }
    }
    console.log('[v0] Found', inlineCount, 'fonts from inline styles')
    
    // 6. Extract from font-family attributes in HTML tags
    const fontAttrPattern = /face=["']([^"']+)["']/gi
    let faceAttrCount = 0
    while ((match = fontAttrPattern.exec(html)) !== null) {
      const font = cleanFontName(match[1])
      if (font) {
        allFonts.add(font)
        faceAttrCount++
      }
    }
    console.log('[v0] Found', faceAttrCount, 'fonts from face attributes')
    
    // 7. Extract from CSS variable definitions
    const cssVarPattern = /--[\w-]+\s*:\s*([^;]+font[^;]*)/gi
    let varCount = 0
    while ((match = cssVarPattern.exec(html)) !== null) {
      const fonts = parseFontStack(match[1])
      fonts.forEach(f => {
        if (f) {
          allFonts.add(f)
          varCount++
        }
      })
    }
    console.log('[v0] Found', varCount, 'fonts from CSS variables')
    
    // 8. Extract from Tailwind font classes
    const tailwindPattern = /font-\[([^\]]+)\]/gi
    let tailwindCount = 0
    while ((match = tailwindPattern.exec(html)) !== null) {
      const font = cleanFontName(match[1])
      if (font) {
        allFonts.add(font)
        tailwindCount++
      }
    }
    console.log('[v0] Found', tailwindCount, 'fonts from Tailwind classes')
    
    // 9. Extract from data attributes
    const dataAttrPattern = /data-[\w-]*font[\w-]*=["']([^"']+)["']/gi
    let dataAttrCount = 0
    while ((match = dataAttrPattern.exec(html)) !== null) {
      const font = cleanFontName(match[1])
      if (font) {
        allFonts.add(font)
        dataAttrCount++
      }
    }
    console.log('[v0] Found', dataAttrCount, 'fonts from data attributes')
    
    // 10. AGGRESSIVE: Extract font names from any quoted strings containing common font keywords
    const aggressivePattern = /["']([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Pro|Display|Text|Light|Regular|Bold|Medium|Italic))*?)["']\s*(?:[,;:\)]|font)/gi
    let aggressiveCount = 0
    while ((match = aggressivePattern.exec(html)) !== null) {
      const potential = cleanFontName(match[1])
      // Only add if it looks like a real font name (2-50 chars, has letters and spaces)
      if (potential && potential.length >= 3 && potential.length < 60 && /[a-zA-Z]/.test(potential)) {
        allFonts.add(potential)
        aggressiveCount++
      }
    }
    console.log('[v0] Found', aggressiveCount, 'fonts from aggressive pattern matching')
    
    // 11. Extract from font-family in ANY context (loose pattern)
    const loosePattern = /font-family\s*:\s*([^};,\n]+(?:[,][^};,\n]+)*)/gi
    let looseCount = 0
    while ((match = loosePattern.exec(html)) !== null) {
      const fonts = parseFontStack(match[1])
      fonts.forEach(f => {
        if (f) {
          allFonts.add(f)
          looseCount++
        }
      })
    }
    console.log('[v0] Found', looseCount, 'fonts from loose pattern matching')
    
    console.log('[v0] Total fonts before filtering:', allFonts.size)
    
    // Filter more intelligently - keep custom fonts but remove only system generics
    const filteredFonts = Array.from(allFonts)
      .filter(f => f && f.length > 0)
      .slice(0, 50) // Allow up to 50 fonts
    
    console.log('[v0] Final fonts after filtering:', filteredFonts.length)
    console.log('[v0] Final font list:', filteredFonts)
    
  } catch (error) {
    console.error('[v0] Typography extraction error:', error)
  }
  
  return {
    headingFonts: Array.from(headingFonts).map(f => ({ name: f })),
    bodyFonts: Array.from(bodyFonts).map(f => ({ name: f })),
    monoFonts: Array.from(monoFonts).map(f => ({ name: f })),
    allFonts: Array.from(allFonts),
    fontStack
  }
}

// Parse font stack from font-family value - AGGRESSIVE, keep all
function parseFontStack(fontFamilyValue: string): string[] {
  return fontFamilyValue
    .split(',')
    .map(f => cleanFontName(f))
    .filter(f => f && f.length > 0)
}

// Extract fonts from URLs - COMPREHENSIVE
function extractFontsFromUrl(url: string): string[] {
  const fonts: string[] = []
  
  try {
    // Google Fonts
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.google.com')) {
      const familyMatch = url.match(/family=([^&]+)/i)
      if (familyMatch) {
        const families = decodeURIComponent(familyMatch[1]).split('|')
        families.forEach(f => {
          const cleaned = f.split(':')[0] // Remove weights
          if (cleaned) fonts.push(cleanFontName(cleaned))
        })
      }
    }
    
    // Adobe Fonts
    if (url.includes('adobe.com') || url.includes('typekit.com')) {
      const scriptMatch = url.match(/fonts\/([^/]+)/)
      if (scriptMatch) fonts.push(scriptMatch[1])
    }
    
    // Other font services
    if (url.includes('fonts.') || url.includes('font') || url.includes('typeface')) {
      // Try to extract any font name patterns
      const matches = url.match(/([a-z]+-[a-z]+|[A-Z][a-z]+(?:[A-Z][a-z]+)*)/g) || []
      matches.forEach(m => {
        if (m.length > 2 && m.length < 50) fonts.push(m)
      })
    }
  } catch (error) {
    console.error('[v0] URL font extraction error:', error)
  }
  
  return fonts
}

// Clean and normalize font names - LESS aggressive filtering
function cleanFontName(fontName: string): string {
  if (!fontName) return ''
  
  return fontName
    .trim()
    .replace(/['"`]/g, '') // Remove quotes
    .replace(/\s*,\s*/g, ', ') // Clean up commas in fallback chains
    .split(',')[0] // Get first font in fallback chain
    .trim()
    .replace(/\s{2,}/g, ' ') // Remove extra spaces
    .split(':')[0] // Remove font weights/variants
    .trim()
}

// Get primary fonts (heading, body, mono)
export function getPrimaryFonts(typography: ExtractedTypography): {
  heading?: string
  body?: string
  mono?: string
} {
  return {
    heading: typography.headingFonts[0]?.name,
    body: typography.bodyFonts[0]?.name,
    mono: typography.monoFonts[0]?.name
  }
}

// Categorize fonts by purpose
export function categorizeFonts(fonts: string[]): Record<string, string[]> {
  const categories = {
    monospace: [] as string[],
    serif: [] as string[],
    sansSerif: [] as string[],
    display: [] as string[]
  }
  
  fonts.forEach(font => {
    const lower = font.toLowerCase()
    
    if (lower.includes('mono') || lower.includes('courier') || lower.includes('code') || lower.includes('console') || lower.includes('courier')) {
      categories.monospace.push(font)
    } else if (lower.includes('serif') || lower.includes('garamond') || lower.includes('georgia') || lower.includes('times')) {
      categories.serif.push(font)
    } else if (lower.includes('display') || lower.includes('headline') || lower.includes('script')) {
      categories.display.push(font)
    } else {
      categories.sansSerif.push(font)
    }
  })
  
  return categories
}
