import { describe, expect, test } from 'bun:test'
import { siteSlug, isSiteId } from './site-slug'

describe('siteSlug', () => {
  test('a home page is just its domain, without www', () => {
    expect(siteSlug('https://plastic.audio/')).toBe('plastic.audio')
    expect(siteSlug('https://www.amzora.co/')).toBe('amzora.co')
    expect(siteSlug('https://bellowsfilmlab.com')).toBe('bellowsfilmlab.com')
  })
  test('a deeper page keeps its path, so two pages on one host stay apart', () => {
    expect(siteSlug('https://vercel.com/design/guidelines')).toBe('vercel.com/design/guidelines')
    expect(siteSlug('https://vercel.com/font?ref=seesaw')).toBe('vercel.com/font')
    expect(siteSlug('https://money.x.com/en/')).toBe('money.x.com/en')
  })
  test('case and hash never matter', () => expect(siteSlug('https://Goodside.Studio/#top')).toBe('goodside.studio'))
  test('garbage gives an empty slug', () => expect(siteSlug('not a url')).toBe(''))
})

describe('isSiteId', () => {
  test('old numeric links still count as ids', () => {
    expect(isSiteId('801')).toBe(true)
    expect(isSiteId('plastic.audio')).toBe(false)
    expect(isSiteId('')).toBe(false)
  })
})
