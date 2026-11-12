import { describe, expect, test } from 'bun:test'
import { profileFromClaims, linkOrCreateUser } from './google'

describe('profileFromClaims', () => {
  test('a verified Google account becomes a profile', () => {
    expect(profileFromClaims({ sub: '123', email: 'A@gmail.com', email_verified: true, name: 'Ada', picture: 'https://x/p.jpg' }))
      .toEqual({ sub: '123', email: 'a@gmail.com', name: 'Ada', avatar: 'https://x/p.jpg', authoritative: true })
  })
  test('Google is only authoritative for gmail.com and Workspace (hd) addresses', () => {
    expect(profileFromClaims({ sub: '1', email: 'a@co.com', email_verified: true })!.authoritative).toBe(false)
    expect(profileFromClaims({ sub: '1', email: 'a@co.com', email_verified: true, hd: 'co.com' })!.authoritative).toBe(true)
  })
  test('an unverified email is refused', () => {
    expect(profileFromClaims({ sub: '1', email: 'a@b.co', email_verified: false })).toBeNull()
    expect(profileFromClaims({ sub: '1' })).toBeNull()
  })
})

describe('linkOrCreateUser', () => {
  function fake(rows: { byGoogle?: any; byEmail?: any }) {
    const calls: string[] = []
    const sql: any = (strings: TemplateStringsArray, ...v: any[]) => {
      const q = strings.join('?').trim()
      calls.push(q.split(/\s+/).slice(0, 3).join(' '))
      if (q.startsWith('SELECT id FROM users WHERE google_sub')) return Promise.resolve(rows.byGoogle ? [rows.byGoogle] : [])
      if (q.startsWith('UPDATE users')) return Promise.resolve(rows.byEmail ? [rows.byEmail] : [])
      if (q.startsWith('INSERT INTO users')) return Promise.resolve([{ id: 'new' }])
      throw new Error('unexpected ' + q)
    }
    return { sql, calls }
  }
  const profile = { sub: 'g1', email: 'a@b.co', name: 'Ada', avatar: null, authoritative: true }
  test('a returning Google user is found by their Google id, and their photo and name refresh', async () => {
    const f = fake({ byGoogle: { id: 'u1' } })
    expect(await linkOrCreateUser({ ...profile, avatar: 'https://lh3.googleusercontent.com/a/new' }, f.sql)).toBe('u1')
    expect(f.calls).toContain('UPDATE users SET')
  })
  test('an existing email account is linked to Google rather than duplicated', async () => {
    const f = fake({ byEmail: { id: 'u2' } })
    expect(await linkOrCreateUser(profile, f.sql)).toBe('u2')
    expect(f.calls).not.toContain('INSERT INTO users')
  })
  test('a non-authoritative Google email never takes over an existing account', async () => {
    const f = fake({})
    const existing: any = (strings: TemplateStringsArray, ...v: any[]) => {
      const q = strings.join('?').trim()
      if (q.startsWith('SELECT id FROM users WHERE google_sub')) return Promise.resolve([])
      if (q.startsWith('SELECT id FROM users WHERE email')) return Promise.resolve([{ id: 'u9' }])
      return f.sql(strings, ...v)
    }
    expect(await linkOrCreateUser({ ...profile, authoritative: false }, existing)).toBe('needs-email-link')
  })
  test('a new person gets a new account', async () => {
    const f = fake({})
    expect(await linkOrCreateUser(profile, f.sql)).toBe('new')
  })
})
