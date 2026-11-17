import { describe, expect, test } from 'bun:test'
import { composeDailyPost, prettyFont, weightedLength, type Candidate } from './compose'
import { oauthHeader, pct } from './client'

const site = (id: number, over: Partial<Candidate> = {}): Candidate => ({
  id, name: `Site${id}`, slug: `site${id}.com`, addedAt: '2026-01-01T00:00:00Z', lastPostedAt: null,
  colors: [{ role: 'background', hex: '#ffffff' }, { role: 'text', hex: '#000000' }, { role: 'accent', hex: '#030de9' }, { role: 'neutral', hex: '#888888' }],
  fonts: [{ role: 'heading', family: 'moderatSerif' }, { role: 'body', family: 'suisseIntl' }],
  ...over,
})

describe('daily post', () => {
  const mon = new Date('2026-11-16T14:00:00Z'), tue = new Date('2026-11-17T14:00:00Z'), sun = new Date('2026-11-22T14:00:00Z')

  test('a fresh arrival goes first', () => {
    const p = composeDailyPost([site(1), site(2, { addedAt: '2026-11-16T09:00:00Z' })], tue)!
    expect(p.kind).toBe('new')
    expect(p.sourceId).toBe(2)
    expect(p.text).toContain('https://hitmanslibrary.xyz/site/site2.com')
    expect(p.text).toContain('Set in Moderat Serif and Suisse Intl.')
  })
  test('weekdays rotate palette and type', () => {
    expect(composeDailyPost([site(1)], mon)!.kind).toBe('palette')
    expect(composeDailyPost([site(1)], tue)!.kind).toBe('type')
  })
  test('Sunday counts the week when enough arrived', () => {
    const week = [1, 2, 3].map(i => site(i, { addedAt: '2026-11-19T00:00:00Z', lastPostedAt: '2026-11-20T00:00:00Z' }))
    expect(composeDailyPost([...week, site(9)], sun)!.kind).toBe('week')
  })
  test('recently featured sites rest', () => {
    const p = composeDailyPost([site(1, { lastPostedAt: '2026-11-10T00:00:00Z' }), site(2)], mon)!
    expect(p.sourceId).toBe(2)
    expect(composeDailyPost([site(1, { lastPostedAt: '2026-11-10T00:00:00Z' })], mon)).toBeNull()
  })
  test('posts fit in 280 weighted characters', () => {
    const long = site(1, { name: 'A'.repeat(120) })
    for (const d of [mon, tue]) { const p = composeDailyPost([long, site(2)], d); if (p) expect(weightedLength(p.text)).toBeLessThanOrEqual(280) }
  })
  test('font names read like names', () => {
    expect(prettyFont('suisseIntl')).toBe('Suisse Intl')
    expect(prettyFont('GT-America')).toBe('GT-America')
    expect(prettyFont('inter')).toBe('Inter')
  })
})

describe('oauth', () => {
  test('percent-encoding follows RFC 3986', () => {
    expect(pct("Ladies + Gentlemen!*'()")).toBe('Ladies%20%2B%20Gentlemen%21%2A%27%28%29')
  })
  test('header is deterministic and complete', async () => {
    const c = { apiKey: 'k', apiSecret: 's', accessToken: 't', accessSecret: 'ts' }
    const a = await oauthHeader('POST', 'https://api.x.com/2/tweets', c, 'n', '1')
    expect(a).toBe(await oauthHeader('POST', 'https://api.x.com/2/tweets', c, 'n', '1'))
    for (const k of ['oauth_consumer_key', 'oauth_nonce', 'oauth_signature', 'oauth_signature_method="HMAC-SHA1"', 'oauth_timestamp', 'oauth_token', 'oauth_version="1.0"']) expect(a).toContain(k)
  })
})
test('a CSS "font" prefix is dropped', () => { expect(prettyFont('fontSeasonSans')).toBe('Season Sans') })

import { pickField } from './card'
describe('card field', () => {
  test('the accent when it stands clear of the background', () => {
    expect(pickField([{ role: 'background', hex: '#ffffff' }, { role: 'accent', hex: '#030de9' }])).toBe('#030de9')
  })
  test('ink or paper when nothing does', () => {
    expect(pickField([{ role: 'background', hex: '#ffffff' }, { role: 'accent', hex: '#fafafa' }])).toBe('#0d0d0c')
    expect(pickField([{ role: 'background', hex: '#000000' }])).toBe('#f3f3f0')
  })
})
