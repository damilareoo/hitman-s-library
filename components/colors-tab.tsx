// components/colors-tab.tsx
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { parse, oklch as toOklch, clampChroma } from 'culori'
import { useSoundsContext } from '@/contexts/sounds-context'
import { TabEmptyState } from './tab-empty-state'
import { useCopied } from '@/lib/use-copied'

interface ColorRow {
  hex_value: string
  oklch: string | null
  /** Share of the page's painted area, 0..1. Null on rows extracted before it
   *  was measured, in which case the palette falls back to equal bands. */
  area_share: number | null
}

type Oklch = { l: number; c: number; h: number }

function parseStoredOklch(s: string): Oklch | null {
  const m = s.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.e+\-]+)\s+([\d.]+|none)/)
  if (!m) return null
  const l = parseFloat(m[1])
  return {
    l: Math.round(m[2] ? l : l * 100),
    c: parseFloat(m[3]),
    h: m[4] === 'none' ? 0 : Math.round(parseFloat(m[4])),
  }
}

/**
 * OKLCH for a row that never stored one. Rows extracted before OKLCH was
 * recorded still have a hex, and the format toggle has to mean something for
 * them — falling back to hex made the control look broken on half the library.
 */
function deriveOklch(hex: string): Oklch | null {
  try {
    const parsed = parse(hex)
    if (!parsed) return null
    const converted = clampChroma(toOklch(parsed), 'oklch')
    if (!converted) return null
    const c = converted.c ?? 0
    // culori leaves hue undefined (or a meaningless 180) on achromatic
    // colours; a hue of 0 is the honest value there.
    const h = c < 0.0005 || !Number.isFinite(converted.h) ? 0 : Math.round(converted.h as number)
    return { l: Math.round((converted.l ?? 0) * 100), c, h }
  } catch {
    return null
  }
}

function oklchOf(c: ColorRow): Oklch | null {
  return (c.oklch ? parseStoredOklch(c.oklch) : null) ?? deriveOklch(c.hex_value)
}

function lightness(c: ColorRow): number {
  return oklchOf(c)?.l ?? 50
}

/** Readable text on a given band, judged by the band's own lightness. */
function inkOn(c: ColorRow): string {
  return lightness(c) > 62 ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.86)'
}

/**
 * Every band is legible and no band swamps the panel. A site whose background
 * is 94% of its painted area is the normal case, not the exception, and drawn
 * literally it leaves eight colours sharing a sliver.
 */
const MIN_BAND = 34
const MAX_BAND = 132

export function ColorsTab({ colors, extractionError }: { colors: ColorRow[]; extractionError?: string | null }) {
  const [format, setFormat] = useState<'hex' | 'oklch'>('hex')
  const rowCopy = useCopied()
  const exportCopy = useCopied()
  const { playCopy } = useSoundsContext()

  // One track, one thumb — the same control as the panel tabs, at the size of
  // a secondary choice. Measured so the thumb follows the label widths.
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null)
  const [settled, setSettled] = useState(false)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const el = track.querySelector<HTMLElement>(`[data-format="${format}"]`)
    if (!el) return
    const trackBox = track.getBoundingClientRect()
    const tabBox = el.getBoundingClientRect()
    setThumb({ left: tabBox.left - trackBox.left, width: tabBox.width })
  }, [format])

  useLayoutEffect(() => { measure() }, [measure])

  useEffect(() => {
    if (!thumb || settled) return
    const id = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(id)
  }, [thumb, settled])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
  }, [measure])

  if (!colors.length) {
    return <TabEmptyState message="No colors extracted" extractionError={extractionError} />
  }

  // Darkest to lightest. A palette sorted by usage jumps around the spectrum
  // and stops reading as a palette; sorted by lightness it reads as one object
  // and the proportions still show in the band heights.
  const sorted = [...colors].sort((a, b) => lightness(a) - lightness(b))
  const measured = sorted.some(c => typeof c.area_share === 'number')
  const total = sorted.reduce((sum, c) => sum + (c.area_share ?? 0), 0)

  /**
   * Square-rooted, not linear. A page is mostly its background — 85% to one
   * colour is the ordinary case — and drawn literally every accent collapses
   * onto the floor and a 6% colour is indistinguishable from an unused one.
   * The compression keeps the ranking and the dominant colour obvious while
   * leaving the small shares legible. The percentage beside each band is the
   * real number, so nothing here is hiding the measurement.
   */
  function bandHeight(c: ColorRow): number {
    if (!measured || total <= 0) return 60
    const share = (c.area_share ?? 0) / total
    return Math.round(MIN_BAND + Math.sqrt(share) * (MAX_BAND - MIN_BAND))
  }

  function valueOf(c: ColorRow): string {
    const oklch = format === 'oklch' ? oklchOf(c) : null
    return oklch ? `oklch(${oklch.l}% ${oklch.c.toFixed(3)} ${oklch.h}°)` : c.hex_value
  }

  function buildCssVars(): string {
    return sorted.map((c, i) => `  --color-${i + 1}: ${c.hex_value};`).join('\n')
  }

  function buildTailwind(): string {
    const entries = sorted.map((c, i) => `      '${i + 1}': '${c.hex_value}',`).join('\n')
    return `extend: {\n  colors: {\n    brand: {\n${entries}\n    },\n  },\n}`
  }

  async function copy(text: string, mark: () => void) {
    try {
      await navigator.clipboard.writeText(text)
      playCopy()
      mark()
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>

      <div className="sticky top-0 bg-background border-b border-edge px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-10">
        <div
          ref={trackRef}
          role="group"
          aria-label="Color format"
          className="relative inline-flex items-center h-7 p-[3px] rounded-[7px] bg-foreground/[0.05] dark:bg-foreground/[0.07]"
        >
          <span
            aria-hidden="true"
            className={[
              'absolute top-[3px] left-0 h-[22px] rounded-[5px] bg-card pointer-events-none',
              'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]',
              'dark:bg-[color-mix(in_srgb,var(--foreground)_12%,var(--background))] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
              settled ? 'transition-[transform,width] duration-[var(--dur-2)] ease-[var(--ease-sig)] motion-reduce:transition-none' : '',
            ].join(' ')}
            style={{
              width: thumb?.width ?? 0,
              transform: `translateX(${thumb?.left ?? 0}px)`,
              opacity: thumb ? 1 : 0,
            }}
          />
          {(['hex', 'oklch'] as const).map(f => (
            <button
              key={f}
              data-format={f}
              aria-pressed={format === f}
              onClick={() => setFormat(f)}
              className={[
                'relative z-[1] h-[22px] px-2 rounded-[5px] text-[11px] font-medium leading-none transition-colors',
                format === f ? 'text-ink' : 'text-ink-3 hover:text-ink',
              ].join(' ')}
            >
              {f === 'hex' ? 'Hex' : 'OKLCH'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-px">
          {(['css', 'tailwind'] as const).map(type => (
            <button
              key={type}
              onClick={() => copy(
                type === 'css' ? `:root {\n${buildCssVars()}\n}` : buildTailwind(),
                () => exportCopy.markCopied(type),
              )}
              className={[
                'w-9 py-0.5 rounded-[4px] text-micro flex items-center justify-center transition-colors',
                exportCopy.copiedId === type ? 'text-ink' : 'text-ink-4 hover:text-ink-2',
              ].join(' ')}
            >
              {exportCopy.copiedId === type
                ? <Check className="w-3 h-3" weight="bold" />
                : (type === 'css' ? 'CSS' : 'TW')}
            </button>
          ))}
          <span className="text-meta text-ink-4 ml-1 tabular-nums">{colors.length}</span>
        </div>
      </div>

      {/* One object, not a list of rows: the bands meet with no gap and the
          palette is read as a whole, the way it is on the site itself. */}
      <div className="p-3">
        <div className="overflow-hidden rounded-[5px] border border-edge">
          {sorted.map((color, i) => {
            const value = valueOf(color)
            const copied = rowCopy.copiedId === i
            const share = measured && total > 0 ? (color.area_share ?? 0) / total : null
            return (
              <button
                key={`${color.hex_value}-${i}`}
                onClick={() => copy(value, () => rowCopy.markCopied(i))}
                title={`Copy ${value}`}
                style={{ background: color.hex_value, height: bandHeight(color), color: inkOn(color) }}
                className="group relative w-full flex items-center justify-between px-3.5 text-left transition-[filter] duration-[var(--dur-2)] ease-[var(--ease-sig)] hover:brightness-[1.06] focus-visible:outline-none focus-visible:brightness-[1.06]"
              >
                <span className="text-meta tabular-nums opacity-90">{value}</span>
                <span className="flex items-center gap-2.5">
                  {share !== null && share >= 0.01 && (
                    <span className="text-micro tabular-nums opacity-55">
                      {Math.round(share * 100)}%
                    </span>
                  )}
                  <span className={[
                    'text-micro transition-opacity duration-150',
                    copied ? 'opacity-90' : 'opacity-0 group-hover:opacity-70',
                  ].join(' ')}>
                    {copied ? 'copied' : 'copy'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {!measured && (
          <p className="text-micro text-ink-4 mt-2.5 px-0.5">
            Shown at equal weight — this site&rsquo;s colours were read before coverage was measured.
          </p>
        )}
      </div>
    </div>
  )
}
