import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { mobbin_url } = await req.json()

    if (!mobbin_url || typeof mobbin_url !== 'string') {
      return NextResponse.json(
        { error: 'Mobbin URL required' },
        { status: 400 }
      )
    }

    console.log('[v0] Fetching Mobbin sites from:', mobbin_url)

    // Fetch the Mobbin discover page
    const response = await fetch(mobbin_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cookie': '', // Mobbin might require cookies for access
      },
      timeout: 15000,
      method: 'GET',
      // Follow redirects by default
      redirect: 'follow'
    })

    if (!response.ok) {
      console.error('[v0] Mobbin fetch failed:', response.status, response.statusText)
      return NextResponse.json(
        { 
          error: 'Failed to fetch Mobbin page',
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      )
    }

    const html = await response.text()
    console.log('[v0] Fetched HTML length:', html.length)

    // Parse the HTML to extract site links and metadata
    // Look for site cards/entries in the discover page
    const sites: Array<{
      url: string
      name: string
      category?: string
      description?: string
    }> = []

    // Pattern 1: Look for links with href="/sites/" pattern
    const siteRegex = /href="\/sites\/([^"]+)"[^>]*>([^<]+)<\/a>/g
    const linkRegex = /href="https?:\/\/([^"\/]+)[^"]*"[^>]*>([^<]+)<\/a>/g

    let match
    const seenUrls = new Set<string>()

    // Extract from href patterns
    while ((match = siteRegex.exec(html)) !== null) {
      const [, sitePath, text] = match
      if (sitePath && text && !seenUrls.has(sitePath)) {
        seenUrls.add(sitePath)
        sites.push({
          url: `https://mobbin.com/sites/${sitePath}`,
          name: text.trim(),
          category: 'Mobbin',
          description: 'Design from Mobbin'
        })
      }
    }

    // Also look for actual website links
    while ((match = linkRegex.exec(html)) !== null) {
      const [fullMatch, domain, text] = match
      if (domain && text && !domain.includes('mobbin.com') && !seenUrls.has(domain)) {
        seenUrls.add(domain)
        sites.push({
          url: `https://${domain}`,
          name: text.trim() || domain,
          category: 'Web',
          description: `Website: ${domain}`
        })
      }
    }

    // Pattern 2: Look for JSON data or script tags that might contain site data
    const jsonMatch = html.match(/window\.__data__\s*=\s*({[\s\S]*?});/i)
    const scriptMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)

    if (scriptMatch) {
      for (const script of scriptMatch) {
        try {
          const jsonStr = script.replace(/<script[^>]*>|<\/script>/g, '')
          const data = JSON.parse(jsonStr)
          
          // Try to extract sites from common data structures
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item.url && typeof item.url === 'string') {
                const domain = item.url.replace(/^https?:\/\/(www\.)?/, '')
                if (!seenUrls.has(domain)) {
                  seenUrls.add(domain)
                  sites.push({
                    url: item.url,
                    name: item.name || item.title || domain,
                    category: item.category || 'Web',
                    description: item.description || ''
                  })
                }
              }
            }
          }
        } catch (e) {
          // Skip JSON parse errors
        }
      }
    }

    console.log('[v0] Extracted sites count:', sites.length)

    if (sites.length === 0) {
      return NextResponse.json(
        {
          warning: 'No sites could be extracted from the Mobbin page. The page structure may have changed.',
          sites: [],
          htmlLength: html.length,
          htmlSample: html.substring(0, 500)
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      count: sites.length,
      sites: sites.slice(0, 50) // Limit to first 50 sites
    })
  } catch (error) {
    console.error('[v0] Error fetching Mobbin sites:', error)
    return NextResponse.json(
      {
        error: 'Error processing Mobbin URL',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
