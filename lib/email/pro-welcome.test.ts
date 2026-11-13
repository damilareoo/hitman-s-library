import { describe, expect, test } from 'bun:test'
import { proWelcomeEmail, proGifFor } from './pro-welcome'
const swatches: [string, string][] = ['#e8462f', '#ff8e00', '#d34d63', '#f05a28', '#c2410c', '#b91c1c'].map(c => [c, 'x.com'])

describe('proWelcomeEmail', () => {
  const mail = proWelcomeEmail({ name: '<b>Ada</b> Lovelace', memberNo: 7, swatches })
  test('subject and plain-text version', () => {
    expect(mail.subject).toBe("You're Pro")
    expect(mail.text).toContain('Manage your subscription: https://hitmanslibrary.xyz/pro')
  })
  test('shows the animated Pro in the hue nearest the member colours', () => {
    expect(mail.html).toContain('<img src="https://hitmanslibrary.xyz/email/pro-h000.gif"')
    expect(proGifFor([['#2b6cff', ''], ['#3b82f6', ''], ['#1d4ed8', ''], ['#2563eb', ''], ['#1e40af', ''], ['#3a5bd9', '']])).toBe('https://hitmanslibrary.xyz/email/pro-h210.gif')
  })
  test('escapes the name', () => {
    expect(mail.html).toContain('&lt;b&gt;Ada&lt;/b&gt;')
    expect(mail.html).not.toContain('<b>Ada')
  })
  test('stays well under the Gmail clip size', () => expect(mail.html.length).toBeLessThan(20_000))
  test('same member, same word: the colours are deterministic', () => {
    expect(proWelcomeEmail({ name: 'Ada', memberNo: 7, swatches }).html).toBe(proWelcomeEmail({ name: 'Ada', memberNo: 7, swatches }).html)
  })
  test('works with no colours (a warm default)', () => {
    expect(proWelcomeEmail({ name: '', memberNo: 1, swatches: [] }).html).toContain('/email/pro-h030.gif')
  })
})
