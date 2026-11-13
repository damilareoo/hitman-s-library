// lib/kit/zip.ts
//
// A minimal zip writer: stored entries (no compression), UTF-8 names. The kit
// is mostly PNGs, which don't compress further, so storing keeps this tiny and
// dependency-free. Runs in the browser; the Worker never builds archives.

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

export function zipStore(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const e of entries) {
    const name = enc.encode(e.name)
    const crc = crc32(e.data)
    const local = new Uint8Array(30 + name.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true)          // version needed
    l.setUint16(6, 0x0800, true)      // UTF-8 names
    l.setUint16(8, 0, true)           // stored
    l.setUint16(10, 0, true); l.setUint16(12, 0x21, true) // 1980-01-01
    l.setUint32(14, crc, true)
    l.setUint32(18, e.data.length, true)
    l.setUint32(22, e.data.length, true)
    l.setUint16(26, name.length, true)
    local.set(name, 30)

    const central = new Uint8Array(46 + name.length)
    const c = new DataView(central.buffer)
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true); c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(10, 0, true)
    c.setUint16(12, 0, true); c.setUint16(14, 0x21, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, e.data.length, true)
    c.setUint32(24, e.data.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, offset, true)
    central.set(name, 46)

    locals.push(local, e.data)
    centrals.push(central)
    offset += local.length + e.data.length
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const d = new DataView(end.buffer)
  d.setUint32(0, 0x06054b50, true)
  d.setUint16(8, entries.length, true)
  d.setUint16(10, entries.length, true)
  d.setUint32(12, centralSize, true)
  d.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + end.length)
  let at = 0
  for (const part of [...locals, ...centrals, end]) { out.set(part, at); at += part.length }
  return out
}
