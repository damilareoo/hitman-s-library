import { describe, expect, test } from 'bun:test'
import { pickField, cardHtml } from './link-card'

describe('link card', () => {
  test('the accent when it stands clear of the background', () => {
    expect(pickField([{ role: 'background', hex: '#ffffff' }, { role: 'accent', hex: '#030de9' }])).toBe('#030de9')
  })
  test('ink or paper when nothing does', () => {
    expect(pickField([{ role: 'background', hex: '#ffffff' }, { role: 'accent', hex: '#fafafa' }])).toBe('#0d0d0c')
    expect(pickField([{ role: 'background', hex: '#000000' }])).toBe('#f3f3f0')
  })
  test('urls are escaped into the html', () => {
    expect(cardHtml('https://a.com/x"y.png', '#fff')).toContain('x&quot;y.png')
  })
})
