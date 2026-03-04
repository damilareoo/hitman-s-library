import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // Fetch the HTML of the target website
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })

    const html = await response.text()

    // Extract OG image from meta tags
    let ogImage = extractMetaContent(html, 'og:image')
      || extractMetaContent(html, 'twitter:image')
      || extractMetaContent(html, 'twitter:image:src')

    if (!ogImage) {
      return NextResponse.json({ imageUrl: null }, {
        headers: { 'Cache-Control': 'public, max-age=86400' }
      })
    }

    // Resolve relative URLs
    if (ogImage.startsWith('/')) {
      const parsedUrl = new URL(url)
      ogImage = `${parsedUrl.origin}${ogImage}`
    } else if (!ogImage.startsWith('http')) {
      const parsedUrl = new URL(url)
      ogImage = `${parsedUrl.origin}/${ogImage}`
    }

    return NextResponse.json({ imageUrl: ogImage }, {
      headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400' }
    })
  } catch {
    return NextResponse.json({ imageUrl: null }, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    })
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // Match both property="og:image" and name="twitter:image" patterns
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return null
}
