import { describe, expect, test } from 'bun:test'
import { inCidrs, parseIpList } from './ips'

describe('Paddle IP allowlist', () => {
  const list = ['34.237.3.244/32', '10.1.0.0/16']
  test('an exact /32 matches only that address', () => {
    expect(inCidrs('34.237.3.244', list)).toBe(true)
    expect(inCidrs('34.237.3.245', list)).toBe(false)
  })
  test('wider ranges match inside, not outside', () => {
    expect(inCidrs('10.1.200.3', list)).toBe(true)
    expect(inCidrs('10.2.0.1', list)).toBe(false)
  })
  test('junk and IPv6 never match', () => {
    for (const ip of ['', 'abc', '999.1.1.1', '::1', '2001:db8::1']) expect(inCidrs(ip, list)).toBe(false)
  })
  test('reads data.ipv4_cidrs and drops anything malformed', () => {
    expect(parseIpList({ data: { ipv4_cidrs: ['34.237.3.244/32', 'nope', '1.2.3.4/40'] } })).toEqual(['34.237.3.244/32'])
    expect(parseIpList(null)).toEqual([])
  })
})
