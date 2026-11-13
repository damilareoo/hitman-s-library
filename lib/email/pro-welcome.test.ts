import { describe, expect, test } from 'bun:test'
import { proWelcomeEmail } from './pro-welcome'
import { PRO_MASK } from '@/lib/pro/word-mask'

const squares = PRO_MASK.join('').split('#').length - 1
const swatches: [string, string][] = ['#e8462f', '#ff8e00', '#d34d63', '#f05a28', '#c2410c', '#b91c1c'].map(c => [c, 'x.com'])

describe('proWelcomeEmail', () => {
  const mail = proWelcomeEmail({ name: '<b>Ada</b> Lovelace', memberNo: 7, swatches })
  test('subject and plain-text version', () => {
    expect(mail.subject).toBe("You're Pro")
    expect(mail.text).toContain('Manage your subscription: https://hitmanslibrary.xyz/pro')
  })
  test('draws the word with one coloured cell per square', () => {
    expect(mail.html.match(/bgcolor="#/g)?.length).toBe(squares)
  })
  test('uses only the member colours, light enough to read on white', () => {
    const used = new Set([...mail.html.matchAll(/bgcolor="(#[0-9a-f]{6})"/g)].map(m => m[1]))
    for (const c of used) expect(swatches.map(s => s[0])).toContain(c)
  })
  test('escapes the name', () => {
    expect(mail.html).toContain('&lt;b&gt;Ada&lt;/b&gt;')
    expect(mail.html).not.toContain('<b>Ada')
  })
  test('stays well under the Gmail clip size', () => expect(mail.html.length).toBeLessThan(90_000))
  test('same member, same word: the colours are deterministic', () => {
    expect(proWelcomeEmail({ name: 'Ada', memberNo: 7, swatches }).html).toBe(proWelcomeEmail({ name: 'Ada', memberNo: 7, swatches }).html)
  })
  test('works with no colours (falls back to a neutral word)', () => {
    expect(proWelcomeEmail({ name: '', memberNo: 1, swatches: [] }).html.match(/bgcolor="#/g)?.length).toBe(squares)
  })
})
