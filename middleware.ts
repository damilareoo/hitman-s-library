import { NextRequest, NextResponse } from 'next/server'

/**
 * The preview host exists to run other people's JavaScript, so it serves the
 * proxy and nothing else. Same deployment, same code — a request for /admin or
 * /api/admin/* simply does not exist when it arrives on that hostname.
 *
 * The isolation that matters is the browser's: the admin cookie is host-only
 * and never reaches this host, and storage is per-origin. This is the belt to
 * that pair of braces, so a proxied page cannot so much as see the surface.
 */
const PREVIEW_PREFIX = 'preview.'
const PREVIEW_ROUTES = ['/api/proxy', '/api/proxy-asset']

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  if (!host.startsWith(PREVIEW_PREFIX)) return siteAddress(req) ?? NextResponse.next()

  if (PREVIEW_ROUTES.includes(req.nextUrl.pathname)) return NextResponse.next()
  return new NextResponse('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  })
}

/**
 * One address per site. /?site=plastic.audio (the old form, still in emails
 * and shared links) and /site/PLASTIC.AUDIO both move to /site/plastic.audio
 * with a 308, before any HTML streams. Numeric ids need the database, so they
 * render and the page rewrites the address once it knows the name.
 */
function siteAddress(req: NextRequest): NextResponse | null {
  const url = req.nextUrl
  if (url.pathname === '/') {
    const keys = [...new Set(url.searchParams.keys())]
    const site = url.searchParams.get('site')
    if (keys.length !== 1 || !site || /^\d+$/.test(site)) return null
    const to = url.clone()
    to.search = ''
    to.pathname = `/site/${site.trim().toLowerCase()}`
    return NextResponse.redirect(to, 308)
  }
  if (url.pathname.startsWith('/site/') && url.pathname !== url.pathname.toLowerCase()) {
    const to = url.clone()
    to.pathname = url.pathname.toLowerCase()
    return NextResponse.redirect(to, 308)
  }
  return null
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
