// lib/paddle/ips.ts
//
// Webhooks are accepted only from Paddle's own servers. The list comes from
// Paddle's /ips endpoint (sandbox or live, matching the API in use), cached
// for an hour, never hard-coded: Paddle can change it. This sits in front of
// the signature check, which stays the real proof a delivery is Paddle's.
import { PADDLE_API } from './config'

const CIDR = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/

function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some(p => p > 255)) return null
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

export function parseIpList(body: unknown): string[] {
  const list = (body as { data?: { ipv4_cidrs?: unknown } } | null)?.data?.ipv4_cidrs
  if (!Array.isArray(list)) return []
  return list.filter((c): c is string => {
    if (typeof c !== 'string') return false
    const m = CIDR.exec(c)
    return !!m && Number(m[5]) <= 32 && ipToInt(c.split('/')[0]) !== null
  })
}

export function inCidrs(ip: string, cidrs: string[]): boolean {
  const n = ipToInt(ip.trim())
  if (n === null) return false
  return cidrs.some(c => {
    const [base, bitsRaw] = c.split('/')
    const b = ipToInt(base), bits = Number(bitsRaw)
    if (b === null) return false
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return ((n & mask) >>> 0) === ((b & mask) >>> 0)
  })
}

let cached: { at: number; cidrs: string[] } | null = null
const TTL_MS = 60 * 60 * 1000

/** Paddle's current webhook source addresses. An empty list means "couldn't tell". */
export async function paddleIps(): Promise<string[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.cidrs
  try {
    const res = await fetch(`${PADDLE_API}/ips`, { signal: AbortSignal.timeout(5000) })
    const cidrs = parseIpList(await res.json())
    if (cidrs.length) cached = { at: Date.now(), cidrs }
    return cidrs.length ? cidrs : cached?.cidrs ?? []
  } catch {
    return cached?.cidrs ?? []
  }
}
