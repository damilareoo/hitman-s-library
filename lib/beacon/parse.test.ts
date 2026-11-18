import { describe, expect, test } from 'bun:test'
import { agentOf, cleanTeamName, isBot, sourceOf } from './parse'

describe('sourceOf', () => {
  test('groups referrers into platforms', () => {
    expect(sourceOf('t.co', null)).toBe('X')
    expect(sourceOf('www.linkedin.com', null)).toBe('LinkedIn')
    expect(sourceOf('lnkd.in', null)).toBe('LinkedIn')
    expect(sourceOf('www.google.co.uk', null)).toBe('Google')
    expect(sourceOf('chatgpt.com', null)).toBe('ChatGPT')
  })
  test('a campaign tag wins over the referrer', () => {
    expect(sourceOf('t.co', 'linkedin')).toBe('LinkedIn')
    expect(sourceOf(null, 'x')).toBe('X')
    expect(sourceOf(null, 'Sidebar')).toBe('sidebar')
  })
  test('our own host and no referrer are direct', () => {
    expect(sourceOf(null, null)).toBe('Direct')
    expect(sourceOf('hitmanslibrary.xyz', null)).toBe('Direct')
  })
  test('Android apps that report their package name', () => {
    expect(sourceOf('com.linkedin.android', null)).toBe('LinkedIn')
    expect(sourceOf('com.twitter.android', null)).toBe('X')
    expect(sourceOf('com.google.android.gm', null)).toBe('Email')
  })
  test('an in-app browser names the platform when nothing else does', () => {
    expect(sourceOf(null, null, undefined, 'LinkedIn app')).toBe('LinkedIn')
    expect(sourceOf(null, null, undefined, 'X app')).toBe('X')
    expect(sourceOf(null, null, undefined, 'Safari')).toBe('Direct')
    // A tag or a real referrer still wins.
    expect(sourceOf('google.com', null, undefined, 'X app')).toBe('Google')
    expect(sourceOf(null, 'newsletter', undefined, 'X app')).toBe('Email')
  })
  test('unknown hosts are kept as they are', () => {
    expect(sourceOf('sidebar.io', null)).toBe('sidebar.io')
  })
})

describe('agentOf', () => {
  test('iPhone in the X app', () => {
    const a = agentOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.0')
    expect(a).toEqual({ device: 'Mobile', browser: 'X app', os: 'iOS' })
  })
  test('Chrome on a Mac', () => {
    const a = agentOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    expect(a).toEqual({ device: 'Desktop', browser: 'Chrome', os: 'macOS' })
  })
  test('Safari on an iPad', () => {
    expect(agentOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1').device).toBe('Tablet')
  })
})

test('bots and scripts are not counted', () => {
  expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
  expect(isBot('Mozilla/5.0 HeadlessChrome/120.0')).toBe(true)
  expect(isBot(null)).toBe(true)
  expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')).toBe(false)
})

test('team names are short and plain', () => {
  expect(cleanTeamName('  Ada  Lovelace ')).toBe('Ada Lovelace')
  expect(cleanTeamName('<script>')).toBeNull()
  expect(cleanTeamName('x'.repeat(30))).toBeNull()
})
