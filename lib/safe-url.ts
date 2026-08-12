// lib/safe-url.ts
// Guards outbound fetches against SSRF.
//
// Anything that takes a caller-supplied URL and fetches it server-side must run
// through assertPublicUrl first. Checking the hostname string is not enough:
// a name like internal.example.com can resolve to 10.0.0.5, so we resolve DNS
// and validate the addresses we actually got back.
import { lookup } from 'node:dns/promises'
import net from 'node:net'

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlockedUrlError'
  }
}

/** Hostnames that never legitimately need to be proxied. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
])

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  const inRange = (cidrBase: string, bits: number) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (n & mask) === (ipv4ToInt(cidrBase) & mask)
  }
  return (
    inRange('0.0.0.0', 8) ||        // "this network"
    inRange('10.0.0.0', 8) ||       // private
    inRange('100.64.0.0', 10) ||    // carrier-grade NAT
    inRange('127.0.0.0', 8) ||      // loopback
    inRange('169.254.0.0', 16) ||   // link-local — includes cloud metadata at 169.254.169.254
    inRange('172.16.0.0', 12) ||    // private
    inRange('192.0.0.0', 24) ||     // IETF protocol assignments
    inRange('192.168.0.0', 16) ||   // private
    inRange('198.18.0.0', 15) ||    // benchmarking
    inRange('224.0.0.0', 4) ||      // multicast
    inRange('240.0.0.0', 4)         // reserved / broadcast
  )
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0]

  if (addr === '::' || addr === '::1') return true          // unspecified / loopback
  if (addr.startsWith('fe80')) return true                   // link-local
  if (/^f[cd]/.test(addr)) return true                       // unique local (fc00::/7)
  if (addr.startsWith('ff')) return true                     // multicast

  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms
  const mapped = addr.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped && (addr.includes('::ffff:') || addr.startsWith('::'))) {
    return isPrivateIPv4(mapped[1])
  }

  return false
}

export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip)
  if (version === 4) return isPrivateIPv4(ip)
  if (version === 6) return isPrivateIPv6(ip)
  return true // not a recognisable address — refuse rather than guess
}

/**
 * Validates that a URL is http(s), publicly routable, and not an internal host.
 * Throws BlockedUrlError otherwise. Returns the parsed URL.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new BlockedUrlError('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError('Only http and https URLs are allowed')
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    throw new BlockedUrlError('Host is not allowed')
  }

  // Literal IP — check directly, no DNS involved.
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new BlockedUrlError('Host resolves to a private address')
    return url
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new BlockedUrlError('Host could not be resolved')
  }

  if (!addresses.length) throw new BlockedUrlError('Host could not be resolved')
  if (addresses.some(a => isPrivateAddress(a.address))) {
    throw new BlockedUrlError('Host resolves to a private address')
  }

  return url
}

/**
 * fetch() that re-validates on every redirect hop, so a public URL cannot
 * bounce the request to an internal one.
 */
export async function safeFetch(
  raw: string,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = 5, ...rest } = init
  let current = raw

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current)

    const res = await fetch(current, { ...rest, redirect: 'manual' })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return res
      current = new URL(location, current).href
      continue
    }

    return res
  }

  throw new BlockedUrlError('Too many redirects')
}
