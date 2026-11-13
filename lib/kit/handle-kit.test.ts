import { describe, expect, test } from 'bun:test'
import { handleKit, type KitDeps } from './handle-kit'

const SITE: any = {
  id: 7, url: 'https://a.studio/', title: 'A', screenshot_url: 'https://cdn/a.png', mobile_screenshot_url: 'http://cdn/m.png',
  colors: [{ hex_value: '#ffffff', oklch: 'oklch(100% 0 0)', area_share: 0.8 }, { hex_value: '#000000', oklch: 'oklch(0% 0 0)', area_share: 0.2 }],
  typography: [{ font_family: 'Inter', role: 'body', google_fonts_url: null, primary_weight: 400, sample_size_px: 16, sample_line_height: 1.5 }],
}
const ORIGIN = 'https://hitmanslibrary.xyz'
const req = (origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}/api/kit/7`, { method: 'POST', headers: origin ? { origin } : {} })

function deps(over: Partial<KitDeps> & { claims?: string[] } = {}): KitDeps & { claims: string[] } {
  const claims: string[] = []
  return {
    claims,
    user: async () => ({ id: 'u1', cookies: [] }),
    site: async id => (id === 7 ? SITE : null),
    claim: async (u, s) => { claims.push(`${u}:${s}`); return { ok: true, counted: true, kitsUsed: 1 } },
    entitlement: async () => ({ pro: false, kitsUsed: 1, kitsLimit: 3 }),
    ...over,
  }
}

describe('handleKit', () => {
  test('cross-site requests are refused', async () => {
    expect((await handleKit(req('https://evil.example'), '7', deps())).status).toBe(403)
    expect((await handleKit(req(null), '7', deps())).status).toBe(403)
  })
  test('signed out → 401', async () => {
    expect((await handleKit(req(), '7', deps({ user: async () => null }))).status).toBe(401)
  })
  test('a bad or unknown id is 404 and claims nothing', async () => {
    const d = deps()
    expect((await handleKit(req(), '12abc', d)).status).toBe(404)
    expect((await handleKit(req(), '999', d)).status).toBe(404)
    expect(d.claims).toEqual([])
  })
  test('over the limit → 402 with the meter', async () => {
    const r = await handleKit(req(), '7', deps({ claim: async () => ({ ok: false, reason: 'limit', kitsUsed: 3 }) }))
    expect(r.status).toBe(402)
    expect(await r.json()).toEqual({ error: 'limit', meter: { pro: false, kitsUsed: 3, kitsLimit: 3 } })
  })
  test('success: five files, https captures only, never cached', async () => {
    const r = await handleKit(req(), '7', deps())
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    const body = await r.json()
    expect(body.files).toHaveLength(5)
    expect(body.captures).toEqual([{ name: 'desktop.png', url: 'https://cdn/a.png' }])
    expect(body.meter).toEqual({ pro: false, kitsUsed: 1, kitsLimit: 3 })
  })
})
