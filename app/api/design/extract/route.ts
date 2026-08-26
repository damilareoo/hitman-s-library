import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { neon, Client } from '@neondatabase/serverless'
import { detectIndustry } from './detectIndustry'
import { extractTypographyEnhanced } from '@/lib/typography-extraction'
import { extractFullDesignData } from '@/lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '@/lib/color-utils'
import { requireAdmin } from '@/lib/admin-auth'
import { assertPublicUrl, BlockedUrlError } from '@/lib/safe-url'

const sql = neon(process.env.DATABASE_URL!)

// This route drives a headless browser, same as every other capture route.
// Without it the function inherits the platform default while doing the
// heaviest work in the app.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

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

    // Validate URL format, and refuse anything that resolves somewhere private —
    // this route drives both a fetch and a headless browser.
    let validUrl: URL
    try {
      validUrl = await assertPublicUrl(url)
    } catch (err) {
      const reason = err instanceof BlockedUrlError ? err.message : 'Invalid URL format'
      return NextResponse.json({
        error: reason,
        url,
        colors: [],
        typography: [],
        layout: 'Invalid URL',
        architecture: 'Invalid URL',
        quality: 0,
        tags: [],
        warning: `${reason}. Enter a public site address (e.g. stripe.com or https://stripe.com).`
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
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        try {
        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          signal: controller.signal,
          method: 'GET'
        })
        } finally {
          clearTimeout(timeoutId)
        }

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

      if (response?.ok) {
        html = await response.text()
      } else {
        // This fetch supplies the title, description and og:image — nothing
        // more. It used to end the request on a 403 or 429, which meant every
        // Cloudflare-fronted site was written off without the browser being
        // asked, even though a real browser renders them fine.
        console.warn(`[extract] metadata fetch returned ${response?.status} for ${url} — continuing to the browser`)
      }
    } catch (fetchError: any) {
      console.warn(`[extract] metadata fetch failed for ${url}: ${fetchError.message} — continuing to the browser`)
    }

    // A challenge page is real HTML, so length alone cannot identify it. The
    // previous test rejected any document containing the word "blocked"
    // anywhere in its source — a CSS class, a variable name, a sentence of
    // marketing copy — and took perfectly good sites out with it.
    if (html && looksLikeChallengePage(html)) {
      console.warn(`[extract] ${url} served a challenge page — continuing to the browser`)
      html = ''
    }

    // Extract meta information. `html` is empty whenever the metadata fetch was
    // refused or served a challenge — the browser is still the real source.
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
    const title = titleMatch?.[1] || new URL(url).hostname
    const descMatch = html.match(/<meta name="description" content="([^"]+)/)
    const description = descMatch?.[1] || ''

    // Extract design details — full extraction via rendered page (colors, screenshot, assets, typography)
    let colorFormats: { hex: string; oklch: string }[] = []
    let colors: string[] = []
    let extractionResult: Awaited<ReturnType<typeof extractFullDesignData>> | null = null
    let extractionError: string | null = null
    try {
      extractionResult = await extractFullDesignData(url)
      colorFormats = deduplicateColors(extractionResult.colors)
        .map(c => toColorFormats(c))
        .filter((c): c is { hex: string; oklch: string } => c !== null)
        .slice(0, 16)
      colors = colorFormats.map(c => c.hex)
    } catch (colorErr) {
      console.warn('[v0] Full design extraction failed, falling back to regex:', colorErr)
      extractionError = colorErr instanceof Error ? colorErr.message : String(colorErr)
      colors = extractColors(html)
    }

    // Extraction can also return without throwing and still have captured
    // nothing — an empty screenshot buffer is dropped rather than uploaded.
    // That used to pass silently and land a source with no image.
    if (!extractionError && !extractionResult?.screenshotUrl) {
      // Distinguish the two ways this happens. A page that rendered nothing
      // never got as far as a capture, and saying the picture came back empty
      // sends whoever reads it looking at the wrong end of the pipeline.
      extractionError = extractionResult?.renderedNothing
        ? 'The page rendered nothing readable — the site may be down or serving a challenge'
        : 'Screenshot capture returned an empty image'
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

    // A capture is best, the site's own og:image is an acceptable stand-in, and
    // only with neither is the source genuinely unusable. Recording which one we
    // got is what lets the admin distinguish "fine" from "salvaged" from "broken"
    // instead of leaving every failure looking identical.
    const capturedScreenshot = extractionResult?.screenshotUrl || null
    const effectiveScreenshot = capturedScreenshot || thumbnailUrl || null
    const screenshotSource = capturedScreenshot ? 'capture' : (thumbnailUrl ? 'og' : null)
    const unrecoverableError = effectiveScreenshot ? null : (extractionError ?? 'Extraction produced no image')

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
          ${JSON.stringify({
            description, quality, layout, architecture,
            // Recorded so the admin can say what happened rather than showing a
            // row that is neither finished nor failed.
            ...(screenshotSource ? { screenshot_source: screenshotSource } : {}),
            ...(unrecoverableError ? { extraction_error: unrecoverableError } : {}),
          })},
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

      // Save whichever image we ended up with. Falling back to the og:image
      // keeps the card showing something real instead of a bare domain name.
      if (sourceId && effectiveScreenshot) {
        await sql`UPDATE design_sources SET screenshot_url = ${effectiveScreenshot}, mobile_screenshot_url = ${extractionResult?.mobileScreenshotUrl ?? null}, figma_capture_url = ${extractionResult?.figmaCaptureUrl ?? null} WHERE id = ${sourceId}`
      }

      // Save colors. Every path writes hex_value/oklch, because that is the only
      // shape anything reads — the detail API selects those two columns and the
      // gallery query filters on `hex_value IS NOT NULL`. The old fallback wrote
      // primary_color/all_colors instead, so 55 sites hold colours that have
      // never once been rendered.
      if (sourceId && colorFormats.length > 0) {
        for (const color of colorFormats) {
          await sql`
            INSERT INTO design_colors (source_id, hex_value, oklch)
            VALUES (${sourceId}, ${color.hex}, ${color.oklch})
            ON CONFLICT DO NOTHING
          `.catch(err => {
            console.error(`[extract] color insert failed for ${url}:`, err)
            return null
          })
        }
      }

      // Typography from the rendered page is authoritative. Where it found
      // nothing, fall back to what the HTML declared — but write it as
      // role-tagged rows, which is the only form the detail API will return.
      //
      // What stood here inserted into an `all_fonts` column that does not exist
      // on this table. Postgres raised, `.catch(() => null)` swallowed it, and
      // typography was silently dropped for every site that reached this path.
      // That is 78 of 281 sources with no type at all.
      const browserRoles = extractionResult?.typography ?? []
      if (sourceId && browserRoles.length === 0) {
        const htmlRoles: Array<[string, string | undefined]> = [
          ['heading', typographyData.headingFonts[0]?.name],
          ['body', typographyData.bodyFonts[0]?.name],
          ['mono', typographyData.monoFonts[0]?.name],
        ]

        for (const [role, family] of htmlRoles) {
          if (!family) continue
          await sql`
            INSERT INTO design_typography (source_id, font_family, role, primary_weight)
            VALUES (${sourceId}, ${family}, ${role}, ${400})
            ON CONFLICT (source_id, role) DO UPDATE SET font_family = EXCLUDED.font_family
          `.catch(err => {
            console.error(`[extract] typography fallback insert failed for ${url}:`, err)
            return null
          })
        }
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
            // `role != 'legacy'` is NULL for the legacy rows, whose role is NULL,
          // so it never matched them and they outlived every re-extraction.
          // Nothing reads them — clear the source outright and rewrite.
          'DELETE FROM design_typography WHERE source_id = $1',
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

      // The category counts and the crawlable index are cached; a site nobody
      // can see until the cache expires has not really been added.
      revalidateTag('designs', 'max')

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
        // A source with no image is not a success, however far the rest of the
        // extraction got. Reporting it as one is what filled the admin with
        // rows that were neither done nor failed.
        success: !unrecoverableError,
        error: unrecoverableError ?? undefined,
        screenshotSource,
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

/**
 * Identify an interstitial served in place of the real page.
 *
 * These are short documents whose whole job is to run a script and redirect, so
 * they are recognised by their machinery rather than by their prose. The test
 * this replaces was `html.includes('blocked')`, which fired on any page that
 * used the word anywhere — including sites merely describing what they block.
 */
function looksLikeChallengePage(html: string): boolean {
  if (html.length < 500) return true

  const markers = [
    'cf-browser-verification',
    'cf_chl_opt',
    '__cf_chl',
    'Checking your browser before accessing',
    'Just a moment...',
    'Security Checkpoint',
    'Please enable JS and disable any ad blocker',
    'Attention Required! | Cloudflare',
    'ddos-guard',
    'Access denied | ',
    '/_Incapsula_Resource',
  ]

  return markers.some(marker => html.includes(marker))
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
