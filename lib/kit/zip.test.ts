import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crc32, zipStore } from './zip'

const enc = new TextEncoder()

describe('zip', () => {
  test('crc32 check value', () => expect(crc32(enc.encode('123456789'))).toBe(0xCBF43926))
  test('a two-file archive passes unzip -t and round-trips', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kit-'))
    const file = join(dir, 'kit.zip')
    const png = new Uint8Array(3000).map((_, i) => i % 251)
    writeFileSync(file, zipStore([
      { name: 'kit-a/DESIGN.md', data: enc.encode('# A\n') },
      { name: 'kit-a/desktop.png', data: png },
    ]))
    const t = Bun.spawnSync(['unzip', '-t', file])
    expect(t.exitCode).toBe(0)
    expect(t.stdout.toString()).toContain('No errors detected')
    const out = join(dir, 'out')
    expect(Bun.spawnSync(['unzip', '-q', file, '-d', out]).exitCode).toBe(0)
    expect(readFileSync(join(out, 'kit-a/DESIGN.md'), 'utf8')).toBe('# A\n')
    expect(new Uint8Array(readFileSync(join(out, 'kit-a/desktop.png')))).toEqual(png)
  })
})
