import { NextRequest, NextResponse } from 'next/server'
import { neon, Client } from '@neondatabase/serverless'
import { detectIndustry } from './detectIndustry'
import { extractTypographyEnhanced } from '@/lib/typography-extraction'
import { extractTypographyFromRenderedPage, extractAllDesignDataFromRenderedPage, extractBrandColors, getBrowser, extractFullDesignData } from '@/lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '@/lib/color-utils'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    let { url, industry, notes } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL required' }, { status: 400 })
    }

    // Normalize URL - add https:// if no protocol
    url = url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Validate URL format
    let validUrl: URL
    try {
      validUrl = new URL(url)
    } catch {
      return NextResponse.json({
        error: 'Invalid URL format',
        url,
        colors: [],
        typography: [],
        layout: 'Invalid URL',
        architecture: 'Invalid URL',
        quality: 0,
        tags: [],
        warning: 'Please enter a valid URL (e.g., stripe.com or https://stripe.com)'
      }, { status: 200 })
    }

    const hostname = validUrl.hostname

    // Fetch the webpage with robust redirect handling
    let html = ''
    let finalUrl = url
    let response: Response | null = null
    let redirectCount = 0
    const maxRedirects = 10
    let currentUrl = url

    try {
      // Follow redirects manually with proper handling
      while (redirectCount < maxRedirects) {
        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 8000,
          method: 'GET'
        })

        // Check if this is a redirect
        const isRedirect = response.status >= 300 && response.status < 400 && response.headers.get('location')
        
        if (isRedirect && redirectCount < maxRedirects) {
          const location = response.headers.get('location')
          if (location) {
            try {
              // Resolve relative URLs against the current URL
              currentUrl = new URL(location, currentUrl).toString()
              redirectCount++
              continue
            } catch (err) {
              console.error('[v0] Failed to parse redirect URL:', location)
              break
            }
          }
        }

        // Not a redirect or hit limit, use this response
        break
      }

      finalUrl = currentUrl

      // Rate limit or blocked
      if (response?.status === 429 || response?.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'Website blocked automated access (rate limited)',
          url,
          title: hostname,
          colors: [],
          typography: [],
          layout: 'Blocked by website',
          architecture: 'Unable to extract',
          quality: 0,
          tags: ['rate-limited'],
          warning: 'Try a different website or add it manually'
        }, { status: 200 })
      }

      // Check if we got a valid response
      if (!response || !response.ok) {
        return NextResponse.json({
          success: false,
          error: `Website returned error: ${response?.status}`,
          url,
          title: hostname,
          colors: [],
          typography: [],
          layout: 'Unable to extract',
          architecture: 'Unable to extract',
          quality: 0,
          tags: [],
          warning: 'Website did not respond with valid HTML'
        }, { status: 200 })
      }

      html = await response.text()
    } catch (fetchError: any) {
      // Network error or timeout
      return NextResponse.json({
        success: false,
        error: `Failed to fetch: ${fetchError.message}`,
        url,
        title: hostname,
        colors: [],
        typography: [],
        layout: 'Network error',
        architecture: 'Unable to extract',
        quality: 0,
        tags: [],
        warning: 'Could not connect to website. Check URL and try again.'
      }, { status: 200 })
    }

    // Check if we got valid HTML (not a security checkpoint or error page)
    if (!html || html.length < 500 || html.includes('Security Checkpoint') || html.includes('blocked')) {
      return NextResponse.json({
        success: false,
        error: 'Website security or invalid response',
        url,
        title: new URL(url).hostname,
        colors: [],
        typography: [],
        layout: 'Blocked or invalid',
        architecture: 'Unable to extract',
        quality: 0,
        tags: [],
        warning: 'Website blocked the request or returned invalid content'
      }, { status: 200 })
    }

    // Extract meta information
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
    const title = titleMatch?.[1] || new URL(url).hostname
    const descMatch = html.match(/<meta name="description" content="([^"]+)/)
    const description = descMatch?.[1] || ''

    // Extract design details — full extraction via rendered page (colors, screenshot, assets, typography)
    let colorFormats: { hex: string; oklch: string }[] = []
    let colors: string[] = []
    let extractionResult: Awaited<ReturnType<typeof extractFullDesignData>> | null = null
    try {
      extractionResult = await extractFullDesignData(url)
      colorFormats = deduplicateColors(extractionResult.colors)
        .map(c => toColorFormats(c))
        .filter((c): c is { hex: string; oklch: string } => c !== null)
        .slice(0, 16)
      colors = colorFormats.map(c => c.hex)
    } catch (colorErr) {
      console.warn('[v0] Full design extraction failed, falling back to regex:', colorErr)
      colors = extractColors(html)
    }
    const typographyData = extractTypographyEnhanced(html)
    let typography = typographyData.allFonts
    
    console.log('[v0] Initial HTML extraction found', typography.length, 'fonts')
    
    // If typography extraction from HTML was insufficient, try a more direct approach
    if (typography.length < 3) {
      console.log('[v0] Typography count low, attempting direct extraction for:', url)
      try {
        // Try direct fetch using the simpler detection
        const directFonts = extractFontsDirectly(html)
        if (directFonts.length > typography.length) {
          typography = directFonts
          console.log('[v0] Direct extraction found', typography.length, 'fonts')
        }
      } catch (error) {
        console.warn('[v0] Direct extraction failed:', error)
      }
    }
    
    const layout = extractLayout(html)
    const architecture = extractArchitecture(html)
    const tags = extractTags(html)

    // Calculate quality score
    const quality = Math.min(10, Math.max(1, Math.round((colors.length + typography.length) / 2)))

    // Check if URL already exists
    const existing = await sql`
      SELECT id FROM design_sources WHERE source_url = ${url} LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'This website has already been added to your collection',
        isDuplicate: true,
        url
      }, { status: 200 })
    }

    // Extract OG image from HTML
    let thumbnailUrl = ''
    try {
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i)
      if (ogImageMatch && ogImageMatch[1]) {
        thumbnailUrl = ogImageMatch[1]
        // Resolve relative URLs
        if (thumbnailUrl.startsWith('/')) {
          thumbnailUrl = `${validUrl.protocol}//${validUrl.hostname}${thumbnailUrl}`
        } else if (!thumbnailUrl.startsWith('http')) {
          thumbnailUrl = `${validUrl.protocol}//${validUrl.hostname}/${thumbnailUrl}`
        }
      }
    } catch (err) {
      console.warn('[v0] Failed to extract OG image:', err)
    }

    // Save to database
    try {
      const result = await sql`
        INSERT INTO design_sources (
          source_url,
          source_name,
          source_type,
          industry,
          metadata,
          tags,
          thumbnail_url,
          created_at,
          analyzed_at
        ) VALUES (
          ${url},
          ${title},
          ${'website'},
          ${industry || 'Uncategorized'},
          ${JSON.stringify({ description, quality, layout, architecture })},
          ${tags},
          ${thumbnailUrl},
          NOW(),
          NOW()
        )
        RETURNING id
      `

      const sourceId = result[0]?.id

      // Write changelog entry for new source
      if (sourceId) {
        await sql`
          INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
          VALUES (${sourceId}, ${url}, ${title}, 'added')
        `.catch(() => null)
      }

      // Save screenshot URL if captured
      if (sourceId && extractionResult?.screenshotUrl) {
        await sql`UPDATE design_sources SET screenshot_url = ${extractionResult.screenshotUrl}, mobile_screenshot_url = ${extractionResult.mobileScreenshotUrl} WHERE id = ${sourceId}`
      }

      // Save colors if extracted
      if (sourceId) {
        if (colorFormats.length > 0) {
          // New brand-signal extraction: save each color with hex_value and oklch
          for (const color of colorFormats) {
            await sql`
              INSERT INTO design_colors (source_id, hex_value, oklch)
              VALUES (${sourceId}, ${color.hex}, ${color.oklch})
              ON CONFLICT DO NOTHING
            `.catch(() => null)
          }
        } else if (colors.length > 0) {
          // Fallback: legacy insert with primary_color/secondary_color/all_colors
          await sql`
            INSERT INTO design_colors (
              source_id,
              primary_color,
              secondary_color,
              all_colors,
              created_at
            ) VALUES (
              ${sourceId},
              ${colors[0] || ''},
              ${colors[1] || ''},
              ${JSON.stringify(colors)},
              NOW()
            )
          `.catch(() => null)
        }
      }

      // Save typography if extracted
      if (typography.length > 0 && sourceId) {
        await sql`
          INSERT INTO design_typography (
            source_id,
            heading_font,
            body_font,
            mono_font,
            all_fonts,
            created_at
          ) VALUES (
            ${sourceId},
            ${typographyData.headingFonts[0]?.name || ''},
            ${typographyData.bodyFonts[0]?.name || ''},
            ${typographyData.monoFonts[0]?.name || ''},
            ${JSON.stringify(typography)},
            NOW()
          )
        `.catch(() => null)
      }

      // Save assets transactionally
      const validAssets = (extractionResult?.assets ?? []).filter(a => a != null && a.type)
      if (validAssets.length > 0 && sourceId) {
        const assets = validAssets
        const client = new Client(process.env.DATABASE_URL!)
        await client.connect()
        try {
          await client.query('BEGIN')
          await client.query('DELETE FROM design_assets WHERE source_id = $1', [sourceId])
          for (const asset of assets) {
            await client.query(
              'INSERT INTO design_assets (source_id, type, content, width, height) VALUES ($1, $2, $3, $4, $5)',
              [sourceId, asset.type, asset.content, asset.width, asset.height]
            )
          }
          await client.query('COMMIT')
        } catch (err) {
          await client.query('ROLLBACK')
          console.error('[assets] Transaction rolled back:', err)
        } finally {
          await client.end()
        }
      }

      // Save typography roles transactionally (after getting sourceId)
      const { typography: typographyRoles } = extractionResult ?? {}
      if (typographyRoles && typographyRoles.length > 0 && sourceId) {
        const typClient = new Client(process.env.DATABASE_URL!)
        await typClient.connect()
        try {
          await typClient.query('BEGIN')
          await typClient.query(
            "DELETE FROM design_typography WHERE source_id = $1 AND role != 'legacy'",
            [sourceId]
          )
          for (const t of typographyRoles) {
            await typClient.query(
              `INSERT INTO design_typography (source_id, font_family, role, google_fonts_url, primary_weight)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (source_id, role) DO UPDATE SET
                 font_family = EXCLUDED.font_family,
                 google_fonts_url = EXCLUDED.google_fonts_url,
                 primary_weight = EXCLUDED.primary_weight`,
              [sourceId, t.fontFamily, t.role, t.googleFontsUrl, t.primaryWeight]
            )
          }
          await typClient.query('COMMIT')
        } catch (err) {
          await typClient.query('ROLLBACK')
          console.error('[typography] Transaction rolled back:', err)
        } finally {
          await typClient.end()
        }
      }

      // Auto-categorize based on extracted design data
      const autoCategory = detectIndustry(title, url, {
        architecture,
        colors,
        typography,
        layout,
        tags,
        description
      })

      // Update with auto-detected industry if not provided
      if (!industry || industry === 'Uncategorized') {
        try {
          await sql`
            UPDATE design_sources 
            SET industry = ${autoCategory},
                updated_at = NOW()
            WHERE id = ${sourceId}
          `
        } catch (err) {
          console.error('[v0] Failed to update industry:', err)
        }
      }

      return NextResponse.json({
        success: true,
        id: sourceId,
        title,
        url,
        colors,
        typography,
        typography_detailed: typographyData,
        layout,
        architecture,
        quality,
        tags,
        description,
        industry: autoCategory
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Return data even if DB fails
      return NextResponse.json({
        success: false,
        title,
        url,
        colors,
        typography,
        layout,
        architecture,
        quality,
        tags,
        description,
        warning: 'Extracted but may not have saved to database'
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Design extraction error:', error)
    return NextResponse.json({ 
      error: 'Failed to extract design details'
    }, { status: 500 })
  }
}

function extractColors(html: string): string[] {
  const colors = new Set<string>()
  const hexPattern = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g
  const hexMatches = html.match(hexPattern) || []
  hexMatches.slice(0, 8).forEach(c => colors.add(c))
  return Array.from(colors)
}

function extractLayout(html: string): string {
  const hasGrid = /grid|flexbox|flex|layout/.test(html.toLowerCase())
  const hasSidebar = /sidebar|aside/.test(html.toLowerCase())
  const hasHero = /hero|banner|masthead/.test(html.toLowerCase())
  
  const features = []
  if (hasHero) features.push('Hero Section')
  if (hasGrid) features.push('Grid/Flex Layout')
  if (hasSidebar) features.push('Sidebar Navigation')
  
  return features.join(' • ') || 'Standard Layout'
}

function extractArchitecture(html: string): string {
  const hasReact = /react|jsx|next/i.test(html)
  const hasVue = /vue/i.test(html)
  const hasTailwind = /tailwind|@tailwind/i.test(html)
  const hasBootstrap = /bootstrap/i.test(html)
  
  const techs = []
  if (hasReact) techs.push('React/Next.js')
  if (hasVue) techs.push('Vue')
  if (hasTailwind) techs.push('Tailwind CSS')
  if (hasBootstrap) techs.push('Bootstrap')
  
  return techs.join(' • ') || 'Custom CSS'
}

function extractTags(html: string): string[] {
  const tags = new Set<string>()
  if (/dark/i.test(html)) tags.add('dark-mode')
  if (/responsive|mobile/i.test(html)) tags.add('responsive')
  if (/animate|transition/i.test(html)) tags.add('animated')
  if (/glass|blur/i.test(html)) tags.add('glassmorphism')
  return Array.from(tags)
}

function extractFontsDirectly(html: string): string[] {
  const fonts = new Set<string>()
  
  // Extract from Google Fonts links
  const googleFontsMatch = html.match(/fonts\.googleapis\.com\/css[^"']*/g)
  if (googleFontsMatch) {
    googleFontsMatch.forEach(link => {
      const familyMatch = link.match(/family=([^&]+)/)
      if (familyMatch) {
        const families = decodeURIComponent(familyMatch[1]).split('|')
        families.forEach(f => {
          const name = f.split(':')[0].trim()
          if (name && name.length > 0) fonts.add(name)
        })
      }
    })
  }
  
  // Extract from @font-face rules
  const fontFaceMatches = html.match(/@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'"\n;]+)['"]?/gi)
  if (fontFaceMatches) {
    fontFaceMatches.forEach(match => {
      const fontMatch = match.match(/font-family\s*:\s*['"]?([^'"\n;]+)['"]?/i)
      if (fontMatch && fontMatch[1]) {
        const cleaned = fontMatch[1].trim().replace(/['"]/g, '')
        if (cleaned && cleaned.length > 0) fonts.add(cleaned)
      }
    })
  }
  
  // Extract from CSS font-family declarations
  const cssMatches = html.match(/font-family\s*:\s*([^;}\n]+)/gi)
  if (cssMatches) {
    cssMatches.forEach(match => {
      const fonts_list = match.replace(/font-family\s*:\s*/i, '').split(',')
      fonts_list.forEach(f => {
        const cleaned = f.trim().replace(/['"]/g, '')
        if (cleaned && cleaned.length > 1 && !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace'].includes(cleaned.toLowerCase())) {
          fonts.add(cleaned)
        }
      })
    })
  }
  
  return Array.from(fonts).slice(0, 50)
}
