import { describe, expect, test } from 'bun:test'
import { paramsFromLocation, urlForParams } from './use-url-params'
import { shortName } from './read/site-page'
import { sitePath, sourceComment } from './site-slug'

describe('site addresses', () => {
  test('a site on its own gets its own path', () => {
    expect(urlForParams(new URLSearchParams('site=plastic.audio'))).toBe('/site/plastic.audio')
    expect(urlForParams(new URLSearchParams('site=vercel.com/design/guidelines'))).toBe('/site/vercel.com/design/guidelines')
  })
  test('anything more stays a query on /', () => {
    expect(urlForParams(new URLSearchParams('site=plastic.audio&tab=colors'))).toBe('/?site=plastic.audio&tab=colors')
    expect(urlForParams(new URLSearchParams('site=801'))).toBe('/?site=801')
    expect(urlForParams(new URLSearchParams())).toBe('/')
  })
  test('the path reads back as the same params', () => {
    expect(paramsFromLocation({ pathname: '/site/vercel.com/design/guidelines', search: '' }).get('site')).toBe('vercel.com/design/guidelines')
    expect(paramsFromLocation({ pathname: '/', search: '?q=bank' }).get('q')).toBe('bank')
  })
  test('names drop their taglines', () => {
    expect(shortName('Cotool — AI SOC and Agent-Native SIEM')).toBe('Cotool')
    expect(shortName('Linear: plan and build')).toBe('Linear')
    expect(shortName('Plastic')).toBe('Plastic')
  })
  test('exports carry their source', () => {
    expect(sitePath('https://www.linear.app/')).toBe('/site/linear.app')
    expect(sourceComment('https://linear.app')).toContain('hitmanslibrary.xyz/site/linear.app')
  })
})

import { siteName } from './read/site-page'
describe('site names', () => {
  test('a name that matches the address is kept', () => {
    expect(siteName('Cotool — AI SOC', 'https://www.cotool.ai/')).toBe('Cotool')
    expect(siteName('Studio K95 | Brand studio', 'https://k95.it/en')).toBe('Studio K95')
  })
  test('taglines and pages fall back to the domain', () => {
    expect(siteName('Selected work', 'https://andreaperato.com/portfolio')).toBe('andreaperato.com')
    expect(siteName('Build AI that works.', 'https://muni.gallery/braintrust-works')).toBe('muni.gallery')
    expect(siteName('Home - The Quaker School', 'https://www.quakerschool.org/')).toBe('quakerschool.org')
  })
})
