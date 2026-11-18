import { expect, test } from 'bun:test'
import { TEAM_COOKIE, teamCookieValue, teamFromCookie } from './team'

process.env.ADMIN_SESSION_SECRET = 'test-secret'

test('a signed team cookie names its teammate', async () => {
  const value = await teamCookieValue('Ada')
  expect(await teamFromCookie(`a=1; ${TEAM_COOKIE}=${encodeURIComponent(value!)}`)).toBe('Ada')
})

test('a forged or edited cookie names nobody', async () => {
  const value = (await teamCookieValue('Ada'))!
  expect(await teamFromCookie(`${TEAM_COOKIE}=${encodeURIComponent(value.replace('Ada', 'Bob'))}`)).toBeNull()
  expect(await teamFromCookie(`${TEAM_COOKIE}=Ada.deadbeef`)).toBeNull()
  expect(await teamFromCookie(null)).toBeNull()
})
