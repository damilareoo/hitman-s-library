// app/api/kit/[id]/capture/[which]/route.ts
// A site's stored capture, passed through for the style kit zip. Captures are
// public already; routing them through here makes them same-origin, so the
// browser can pack any of them whatever host they live on. Signed-in only,
// and only ever the URL stored for that site — never a URL from the request.
import { currentUser, problem, NO_STORE } from '@/lib/auth/request'
import { getSql } from '@/lib/db'
import { parseId } from '@/lib/parse-id'
import { safeFetch } from '@/lib/safe-url'

const MAX_BYTES = 15 * 1024 * 1024

export async function GET(req: Request, { params }: { params: Promise<{ id: string; which: string }> }) {
  const { id: raw, which } = await params
  const id = parseId(raw)
  if (id == null || (which !== 'desktop' && which !== 'mobile')) return problem(404, 'not-found')
  if (!(await currentUser(req))) return problem(401, 'signed-out')
  const [row] = await getSql()`SELECT screenshot_url, mobile_screenshot_url FROM design_sources WHERE id = ${id}`
  const url: string | null = row ? (which === 'desktop' ? row.screenshot_url : row.mobile_screenshot_url) : null
  if (!url) return problem(404, 'not-found')
  try {
    const upstream = await safeFetch(url, { signal: AbortSignal.timeout(10000) })
    const type = upstream.headers.get('content-type') ?? ''
    const size = Number(upstream.headers.get('content-length') ?? 0)
    if (!upstream.ok || !type.startsWith('image/') || size > MAX_BYTES) return problem(502, 'capture-unavailable')
    // Streamed straight through: no buffering, next to no CPU.
    return new Response(upstream.body, { headers: { 'content-type': type, ...NO_STORE } })
  } catch {
    return problem(502, 'capture-unavailable')
  }
}
