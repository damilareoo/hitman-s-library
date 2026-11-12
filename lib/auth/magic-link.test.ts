import { describe, expect, test } from 'bun:test'
import { safeNext, isEmail, requestLink, consumeLink, type MagicDeps } from './magic-link'
import { hashToken } from './session'

describe('safeNext', () => {
  test('same-origin paths pass; anything that could leave the site becomes /', () => {
    expect(safeNext('/?site=798')).toBe('/?site=798')
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '', undefined]) expect(safeNext(bad as any)).toBe('/')
  })
})

describe('isEmail', () => {
  test('plain addresses only', () => {
    expect(isEmail('a@b.co')).toBe(true)
    for (const bad of ['', 'a@b', 'a b@c.co', 'a@b.co\nBcc: x@y.z', 'x'.repeat(250) + '@b.co']) expect(isEmail(bad)).toBe(false)
  })
})

function fakeDeps(now = 0) {
  const tokens = new Map<string, any>()
  const users = new Map<string, { id: string; email: string }>()
  const sent: { to: string; url: string }[] = []
  const sql: any = (strings: TemplateStringsArray, ...v: any[]) => {
    const q = strings.join('?').trim()
    if (q.startsWith('INSERT INTO login_tokens')) { tokens.set(v[0], { id: v[0], email: v[1], next: v[2], expires_at: v[3], used_at: null }); return Promise.resolve([]) }
    if (q.startsWith('UPDATE login_tokens')) {
      const t = tokens.get(v[1]); if (!t || t.used_at || new Date(t.expires_at).getTime() <= v[2].getTime()) return Promise.resolve([])
      t.used_at = v[0]; return Promise.resolve([{ email: t.email, next: t.next }])
    }
    if (q.startsWith('SELECT used_at')) { const t = tokens.get(v[0]); return Promise.resolve(t ? [t] : []) }
    if (q.startsWith('INSERT INTO users')) {
      const u = users.get(v[0]) ?? { id: 'u' + (users.size + 1), email: v[0] }; users.set(v[0], u); return Promise.resolve([{ id: u.id }])
    }
    throw new Error('unexpected ' + q)
  }
  const deps: MagicDeps = {
    sql, now: () => now, origin: 'https://hitmanslibrary.xyz',
    allow: async () => true,
    send: async (to, url) => { sent.push({ to, url }) },
  }
  return { deps, tokens, users, sent }
}

describe('requestLink', () => {
  test('stores only the hash and emails a link carrying the token', async () => {
    const f = fakeDeps()
    expect(await requestLink('A@B.co', '/?site=1', f.deps)).toEqual({ ok: true })
    expect(f.sent).toHaveLength(1)
    expect(f.sent[0].to).toBe('a@b.co')
    const token = new URL(f.sent[0].url).searchParams.get('token')!
    expect(f.tokens.has(token)).toBe(false)
    expect(f.tokens.has(await hashToken(token))).toBe(true)
  })
  test('an invalid address sends nothing', async () => {
    const f = fakeDeps()
    expect(await requestLink('nope', '/', f.deps)).toEqual({ ok: false, error: 'invalid-email' })
    expect(f.sent).toHaveLength(0)
  })
  test('rate limits refuse without sending', async () => {
    const f = fakeDeps(); f.deps.allow = async () => false
    expect(await requestLink('a@b.co', '/', f.deps)).toEqual({ ok: false, error: 'rate-limited' })
    expect(f.sent).toHaveLength(0)
  })
})

describe('consumeLink', () => {
  async function linkFor(f: ReturnType<typeof fakeDeps>) {
    await requestLink('a@b.co', '/?site=9', f.deps)
    return new URL(f.sent[0].url).searchParams.get('token')!
  }
  test('a fresh link signs in once and returns where to go', async () => {
    const f = fakeDeps()
    const token = await linkFor(f)
    expect(await consumeLink(token, f.deps)).toEqual({ userId: 'u1', next: '/?site=9' })
    expect(await consumeLink(token, f.deps)).toEqual({ error: 'used' })
  })
  test('an expired link is refused', async () => {
    const f = fakeDeps()
    const token = await linkFor(f)
    f.deps.now = () => 16 * 60_000
    expect(await consumeLink(token, f.deps)).toEqual({ error: 'expired' })
  })
  test('an unknown link is invalid', async () => {
    const f = fakeDeps()
    expect(await consumeLink('zzzz', f.deps)).toEqual({ error: 'invalid' })
  })
})
