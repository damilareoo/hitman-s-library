// app/api/kit/[id]/capture/[which]/route.ts
// A site's stored capture, passed through for the style kit zip. Captures are
// public already; routing them through here makes them same-origin, so the
// browser can pack any of them whatever host they live on. Signed-in only,
// and only ever the URL stored for that site — never a URL from the request.
import { currentUser, problem } from '@/lib/auth/request'
import { getSql } from '@/lib/db'
import { parseId } from '@/lib/parse-id'
import { safeFetch } from '@/lib/safe-url'
import { passCapture } from '@/lib/kit/capture-proxy'

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
    // Streamed straight through (no buffering, next to no CPU), raster only,
    // sandboxed, and capped even when no length was declared.
    return passCapture(upstream, MAX_BYTES) ?? problem(502, 'capture-unavailable')
  } catch {
    return problem(502, 'capture-unavailable')
  }
}
