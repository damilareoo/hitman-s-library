import { NextRequest, NextResponse } from 'next/server'

// Simple font detection using FontAwesome and common web fonts
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL required' },
        { status: 400 }
      )
    }

    console.log('[v0] Detecting fonts for:', url)

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    }).catch(e => {
      console.error('[v0] Fetch error:', e)
      return null
    })

    if (!response) {
      return NextResponse.json({ fonts: [] })
    }

    const html = await response.text()
    const fonts = new Set<string>()

    // 1. Extract from Google Fonts links
    const googleFontsMatch = html.match(/fonts\.googleapis\.com\/css[^"']*/g)
    if (googleFontsMatch) {
      googleFontsMatch.forEach(link => {
        const familyMatch = link.match(/family=([^&]+)/)
        if (familyMatch) {
          const families = decodeURIComponent(familyMatch[1]).split('|')
          families.forEach(f => {
            const name = f.split(':')[0].trim()
            if (name) fonts.add(name)
          })
        }
      })
    }

    // 2. Extract from @font-face rules
    const fontFaceMatches = html.match(/@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'"\n;]+)['"]?/gi)
    if (fontFaceMatches) {
      fontFaceMatches.forEach(match => {
        const fontMatch = match.match(/font-family\s*:\s*['"]?([^'"\n;]+)['"]?/i)
        if (fontMatch && fontMatch[1]) {
          fonts.add(fontMatch[1].trim().replace(/['"]/g, ''))
        }
      })
    }

    // 3. Extract from CSS font-family declarations
    const cssMatches = html.match(/font-family\s*:\s*([^;}\n]+)/gi)
    if (cssMatches) {
      cssMatches.forEach(match => {
        const fonts_list = match.replace(/font-family\s*:\s*/i, '').split(',')
        fonts_list.forEach(f => {
          const cleaned = f.trim().replace(/['"]/g, '')
          if (cleaned && cleaned.length > 1) {
            // Filter out generic fallbacks
            if (!['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace'].includes(cleaned.toLowerCase())) {
              fonts.add(cleaned)
            }
          }
        })
      })
    }

    // 4. Extract from style attributes
    const styleAttrMatches = html.match(/style=["']([^"']*font-family[^"']*)["']/gi)
    if (styleAttrMatches) {
      styleAttrMatches.forEach(match => {
        const fontMatch = match.match(/font-family\s*:\s*([^;]+)/i)
        if (fontMatch && fontMatch[1]) {
          const fontsList = fontMatch[1].split(',')
          fontsList.forEach(f => {
            const cleaned = f.trim().replace(/['"]/g, '')
            if (cleaned && cleaned.length > 1 && !['serif', 'sans-serif', 'monospace'].includes(cleaned.toLowerCase())) {
              fonts.add(cleaned)
            }
          })
        }
      })
    }

    // 5. Extract from Adobe/Typekit
    const adobeMatch = html.match(/use\.typekit\.net\/([a-z0-9]+)\.css/)
    if (adobeMatch) {
      try {
        const kitCss = await fetch(`https://use.typekit.net/${adobeMatch[1]}.css`).then(r => r.text())
        const adobeFonts = kitCss.match(/font-family:\s*"([^"]+)"/g)
        if (adobeFonts) {
          adobeFonts.forEach(f => {
            const fontName = f.match(/font-family:\s*"([^"]+)"/)
            if (fontName && fontName[1]) {
              fonts.add(fontName[1])
            }
          })
        }
      } catch (e) {
        console.warn('[v0] Adobe font extraction failed:', e)
      }
    }

    // 6. Extract from link tags
    const linkMatches = html.match(/<link[^>]+href=["']([^"']+fonts[^"']*)["'][^>]*>/gi)
    if (linkMatches) {
      linkMatches.forEach(link => {
        // Already handled Google Fonts, but catch others
        const hrefMatch = link.match(/href=["']([^"']+)["']/)
        if (hrefMatch && hrefMatch[1].includes('font')) {
          const patterns = hrefMatch[1].match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g)
          if (patterns) {
            patterns.forEach(p => {
              if (p.length > 2 && p.length < 50) {
                fonts.add(p)
              }
            })
          }
        }
      })
    }

    const fontArray = Array.from(fonts)
      .filter(f => f && f.length > 0)
      .slice(0, 50)

    console.log('[v0] Detected fonts:', fontArray)

    return NextResponse.json({ 
      fonts: fontArray,
      count: fontArray.length
    })

  } catch (error) {
    console.error('[v0] Font detection error:', error)
    return NextResponse.json({ 
      fonts: [],
      error: 'Font detection failed'
    })
  }
}
