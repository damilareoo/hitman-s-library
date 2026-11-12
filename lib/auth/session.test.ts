import { describe, expect, test } from 'bun:test'
import { createSession, generateToken, hashToken, validateSession, sessionCookie, blankSessionCookie, SESSION_COOKIE, type SessionDeps } from './session'

const DAY = 86_400_000

function fakeDb(now: number) {
  const sessions = new Map<string, { id: string; user_id: string; expires_at: Date }>()
  const users = new Map([['u1', { id: 'u1', email: 'a@b.co', name: null, avatar_url: null, member_no: 42 }]])
  const sql: any = (strings: TemplateStringsArray, ...v: any[]) => {
    const q = strings.join('?')
    if (q.startsWith('INSERT INTO sessions')) { sessions.set(v[0], { id: v[0], user_id: v[1], expires_at: v[2] }); return Promise.resolve([]) }
    if (q.startsWith('DELETE FROM sessions')) { sessions.delete(v[0]); return Promise.resolve([]) }
    if (q.includes('FROM sessions')) {
      const s = sessions.get(v[0]); if (!s) return Promise.resolve([])
      const u = users.get(s.user_id)!
      return Promise.resolve([{ ...s, ...u, session_id: s.id, user_id: u.id }])
    }
    if (q.startsWith('UPDATE sessions')) { const s = sessions.get(v[1])!; s.expires_at = v[0]; return Promise.resolve([]) }
    throw new Error('unexpected ' + q)
  }
  const deps: SessionDeps = { sql, now: () => now }
  return { deps, sessions }
}

describe('tokens', () => {
  test('tokens are long and random, hashes are hex sha-256', async () => {
    const a = generateToken(), b = generateToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(await hashToken('x')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('sessions', () => {
  test('only the hash of the token is stored', async () => {
    const { deps, sessions } = fakeDb(0)
    const { token } = await createSession('u1', deps)
    expect(sessions.has(token)).toBe(false)
    expect(sessions.has(await hashToken(token))).toBe(true)
  })
  test('a valid token returns the user', async () => {
    const { deps } = fakeDb(0)
    const { token } = await createSession('u1', deps)
    const r = await validateSession(token, deps)
    expect(r?.user.email).toBe('a@b.co')
    expect(r?.user.member_no).toBe(42)
  })
  test('an expired session is rejected and deleted', async () => {
    const db = fakeDb(0)
    const { token } = await createSession('u1', db.deps)
    const later = { ...db.deps, now: () => 31 * DAY }
    expect(await validateSession(token, later)).toBeNull()
    expect(db.sessions.size).toBe(0)
  })
  test('a session with under 15 days left is renewed to 30', async () => {
    const db = fakeDb(0)
    const { token } = await createSession('u1', db.deps)
    const r = await validateSession(token, { ...db.deps, now: () => 20 * DAY })
    expect(r!.session.expiresAt.getTime()).toBe(50 * DAY)
    expect(r!.fresh).toBe(true)
  })
  test('an unknown token is null', async () => {
    const { deps } = fakeDb(0)
    expect(await validateSession('nope', deps)).toBeNull()
  })
})

test('cookies are httpOnly, secure, lax, site-wide', () => {
  const c = sessionCookie('tok', new Date(30 * DAY))
  expect(c).toContain(`${SESSION_COOKIE}=tok`)
  for (const part of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(c).toContain(part)
  expect(blankSessionCookie()).toContain('Max-Age=0')
})
