// lib/kit/roles.ts
//
// What each colour does on the site, read from measurement rather than
// guessed: the largest light colour is the background, the darkest is the
// text, the most chromatic is the accent. The rest are named by hue family
// and a 50–950 lightness step, so a token says what it is (orange-300,
// neutral-700). Shared by the style kit and the Pro contrast filter.
import type { SiteColor } from '@/lib/read/site-detail'
import { hexToOklch, formatOklch, type Oklch } from './color'

export type ColorRole = 'background' | 'text' | 'accent' | 'support'

export interface NamedColor { name: string; role: ColorRole; hex: string; oklch: string; o: Oklch; share: number | null }

const FAMILIES: [number, string][] = [[20, 'red'], [70, 'orange'], [105, 'yellow'], [170, 'green'], [200, 'teal'], [260, 'blue'], [300, 'violet'], [345, 'pink'], [360, 'red']]

function family(o: Oklch): string {
  if (o.c < 0.03) return 'neutral'
  return FAMILIES.find(([max]) => o.h < max)![1]
}

// Lightness → the 50–950 steps people know from Tailwind, where 500 is a mid-tone.
const STEPS: [number, number][] = [[0.95, 50], [0.9, 100], [0.85, 200], [0.78, 300], [0.7, 400], [0.62, 500], [0.55, 600], [0.47, 700], [0.4, 800], [0.32, 900]]
function step(o: Oklch): number {
  return STEPS.find(([min]) => o.l >= min)?.[1] ?? 950
}

export function nameColors(colors: SiteColor[]): NamedColor[] {
  const rows = [...new Map(colors.filter(c => /^#?[0-9a-f]{6}$/i.test(c.hex_value.replace('#', '').slice(0, 6)))
    .map(c => [c.hex_value.toLowerCase(), c])).values()]
    .map(c => ({ hex: c.hex_value.toLowerCase(), share: c.area_share, o: hexToOklch(c.hex_value) }))
  if (!rows.length) return []
  const light = rows.filter(r => r.o.l >= 0.8)
  const bg = [...(light.length ? light : rows)].sort((a, b) => (b.share ?? 0) - (a.share ?? 0) || b.o.l - a.o.l)[0]
  const rest = rows.filter(r => r !== bg)
  const text = [...rest].sort((a, b) => a.o.l - b.o.l)[0]
  const accent = rest.filter(r => r !== text && r.o.c > 0.05).sort((a, b) => b.o.c - a.o.c)[0]

  const used = new Set<string>()
  const out: NamedColor[] = []
  for (const r of [...rows].sort((a, b) => b.o.l - a.o.l)) {
    const role: ColorRole = r === bg ? 'background' : r === text ? 'text' : r === accent ? 'accent' : 'support'
    let name: string = role === 'support' ? `${family(r.o)}-${step(r.o)}` : role
    for (let i = 2; used.has(name); i++) name = `${family(r.o)}-${step(r.o)}-${i}`
    used.add(name)
    out.push({ name, role, hex: r.hex, oklch: formatOklch(r.o), o: r.o, share: r.share })
  }
  return out
}

/** Back-compat for callers that only need hex → role. */
export function colorRoles(colors: SiteColor[]): Map<string, ColorRole> {
  return new Map(nameColors(colors).map(c => [c.hex, c.role]))
}
