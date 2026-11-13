// lib/kit/handle-kit.ts
//
// POST /api/kit/:id. Order matters: the origin check, then the session, then
// the site; the kit is claimed only once we know the site exists, so a bad id
// never uses up one of the free three. The browser fetches the captures from
// the capture route and zips everything itself.
import type { SiteDetail } from '@/lib/read/site-detail'
import type { Entitlement, KitClaim } from '@/lib/pro/entitlement'
import { NO_STORE, problem, sameOriginWrite } from '@/lib/auth/request'
import { parseId } from '@/lib/parse-id'
import { buildKitFiles } from './kit'

export interface KitDeps {
  user: (req: Request) => Promise<{ id: string; cookies: string[] } | null>
  site: (id: number) => Promise<SiteDetail | null>
  claim: (userId: string, siteId: number) => Promise<KitClaim>
  entitlement: (userId: string) => Promise<Entitlement>
}

export async function handleKit(req: Request, rawId: string, deps: KitDeps): Promise<Response> {
  const refused = sameOriginWrite(req)
  if (refused) return refused
  const me = await deps.user(req)
  if (!me) return problem(401, 'signed-out')
  const id = parseId(rawId)
  const site = id == null ? null : await deps.site(id)
  if (!site) return problem(404, 'not-found', me.cookies)

  const claim = await deps.claim(me.id, site.id)
  const ent = await deps.entitlement(me.id)
  const meter = { pro: ent.pro, kitsUsed: claim.kitsUsed, kitsLimit: ent.kitsLimit }
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of me.cookies) headers.append('Set-Cookie', c)
  if (!claim.ok) return new Response(JSON.stringify({ error: 'limit', meter }), { status: 402, headers })

  // Same-origin paths: the capture route streams each stored image through,
  // so the browser can pack it whatever host it lives on.
  const captures = [
    site.screenshot_url ? { name: 'desktop.png', url: `/api/kit/${site.id}/capture/desktop` } : null,
    site.mobile_screenshot_url ? { name: 'mobile.png', url: `/api/kit/${site.id}/capture/mobile` } : null,
  ].filter((c): c is { name: string; url: string } => c !== null)
  return new Response(JSON.stringify({ title: site.title, files: buildKitFiles(site), captures, meter }), { headers })
}
