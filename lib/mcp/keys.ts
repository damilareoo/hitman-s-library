// lib/mcp/keys.ts
// Personal keys for AI tools. A key is "hl_" + 32 random bytes in base32; only
// its SHA-256 is stored, and the first characters (the prefix) are kept so a
// member can tell their keys apart. The key itself is shown once.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'

export function newKey(): { key: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  const key = `hl_${out}`
  return { key, prefix: key.slice(0, 9) }
}

export async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export const looksLikeKey = (s: string) => /^hl_[a-z2-7]{52}$/.test(s)
