import { describe, expect, test } from 'bun:test'
import { httpsRedirect } from './https'

describe('httpsRedirect', () => {
  test('plain http goes to https, path and query kept', () => {
    const r = httpsRedirect(new URL('http://hitmanslibrary.xyz/?site=goodside.studio'))!
    expect(r.status).toBe(308)
    expect(r.headers.get('location')).toBe('https://hitmanslibrary.xyz/?site=goodside.studio')
  })
  test('https and local development are left alone', () => {
    expect(httpsRedirect(new URL('https://hitmanslibrary.xyz/'))).toBeNull()
    expect(httpsRedirect(new URL('http://localhost:8799/'))).toBeNull()
    expect(httpsRedirect(new URL('http://127.0.0.1:8799/'))).toBeNull()
  })
})
