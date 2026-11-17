'use client'

import type { Design } from '@/components/design-card'
import { displayKind } from '@/lib/categories'
import { isSystemFont } from '@/lib/trends/compute'
import { isOwnMedia } from '@/lib/media'
import Image from 'next/image'
import { useState } from 'react'

interface IndexViewProps {
  designs: Design[]
  /** How many sites match, not how many are loaded. */
  total: number
  /** The site open in the panel, marked in its row. */
  selectedId: string | null
  /** A new result set is loading: the old rows step back. */
  busy?: boolean
  onKind: (name: string) => void
  onOpenDesign: (design: Design) => void
}

// One template for the header and every row, so the columns line up. Beside
// the panel every column stays and long names cut short, as in the mockup;
// only on a phone-wide table does it drop to the site and the date.
const ROW = [
  'grid items-center gap-4 px-2',
  'grid-cols-[minmax(0,1fr)_64px]',
  '@md:grid-cols-[44px_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_76px_64px]',
].join(' ')

// The rim is the page's own ink at a low alpha, laid inside the dot: it
// vanishes on a swatch close to the ink (white on dark, black on light) and
// shows on one close to the page, so a near-black swatch on the dark page
// still reads as a dot, and white ones don't get a heavier grey ring.
function Dot({ hex, size }: { hex?: string; size: string }) {
  return (
    <span
      aria-hidden
      className={size + ' shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(var(--foreground-rgb),0.16)]'}
      style={{ background: hex ?? 'transparent' }}
    />
  )
}

/** A slot the palette doesn't fill: keeps every row three wide. */
function EmptyDot() {
  return <span aria-hidden className="w-4 h-4 shrink-0 rounded-full border border-dashed border-edge" />
}

/**
 * The same screenshot the grid card shows, small: 48 by 30 (16:10), top of the
 * page. A broken screenshot tries the site's own preview image, then falls
 * back to its main colour, so a row never shows a broken image.
 */
function Thumb({ design }: { design: Design }) {
  const [src, setSrc] = useState<string | null>(design.thumbnail_url ?? design.fallback_thumbnail ?? null)
  function failed() {
    setSrc(s => (design.fallback_thumbnail && s !== design.fallback_thumbnail ? design.fallback_thumbnail : null))
  }
  return (
    <span className="relative w-12 h-[30px] shrink-0 overflow-hidden rounded-[4px] border border-edge-strong group-hover:border-foreground/25 transition-colors duration-[120ms]" style={{ background: design.colors[0] ?? undefined }}>
      {src && (
        <Image
          src={src}
          alt=""
          fill
          sizes="96px"
          loading="lazy"
          unoptimized={!isOwnMedia(src)}
          onError={failed}
          className="object-cover object-top"
        />
      )}
    </span>
  )
}

// What the font list holds that isn't the site's typeface: maths and icon
// fonts, stray CSS values, and a selector or two caught by the scraper.
const NOT_A_TYPEFACE = /^(katex|mathjax|font ?awesome|material (icons|symbols)|glyphicons|icomoon|swiper-icons|webflow-icons|bootstrap-icons|true|false|null|undefined|inherit|initial)(?![a-z])/i
const typefaceOf = (fonts?: (string | null)[]) => fonts?.find((f): f is string => {
  const name = f?.trim() ?? ''
  return name.length > 1 && !/^[.#]|[{}]/.test(name) && !NOT_A_TYPEFACE.test(name) && !isSystemFont(name)
})

/** The domain reads better than the page title in a column of names. */
function hostOf(design: Design) {
  try { return new URL(design.url).hostname.replace(/^www\./, '') } catch { return design.title }
}

function rgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}
/** 0 (black) to 1 (white), as the eye weighs the channels. */
const lightness = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
/** How far from grey, 0 to 255. */
const chroma = (c: number[]) => Math.max(...c) - Math.min(...c)

/**
 * Three swatches that say what the site looks like: the colour it is mostly
 * (first in the list), the colour that reads against it (its text), and its
 * loudest colour (the accent). The first three of the raw list are usually
 * near-black, white and grey, and the colour that gives a site its identity
 * sits further down.
 */
export function paletteOf(colors: string[]): string[] {
  const list = colors.map(hex => ({ hex, c: rgb(hex) })).filter((x): x is { hex: string; c: [number, number, number] } => x.c !== null)
  if (list.length === 0) return []
  const base = list[0]
  const picked = [base]
  const text = list.find(x => Math.abs(lightness(x.c) - lightness(base.c)) > 0.45)
  if (text) picked.push(text)
  const accent = list
    .filter(x => !picked.includes(x) && chroma(x.c) > 70)
    .sort((a, b) => chroma(b.c) - chroma(a.c))[0]
  if (accent) picked.push(accent)
  // A site with no strong text or no accent: fill from the list in order.
  for (const x of list) {
    if (picked.length >= 3) break
    if (!picked.some(p => p.hex.toLowerCase() === x.hex.toLowerCase())) picked.push(x)
  }
  return picked.map(x => x.hex)
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' })
function added(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d)
}

/**
 * The gallery as a table: one row per site with the kind, typeface, palette
 * and date a card only shows on hover. It sits where the card grid sits, under
 * the same bar and beside the same panel, and reads the same loaded list, so
 * filters, sort and infinite scroll carry over unchanged.
 */
export function IndexView({ designs, total, selectedId, busy = false, onKind, onOpenDesign }: IndexViewProps) {
  return (
    <div
      role="table"
      aria-label="Sites"
      aria-busy={busy}
      className="@container text-[13.5px] leading-[1.4] transition-opacity duration-150 ease-[var(--ease-sig)] aria-busy:opacity-55"
    >
      {/* Sticks under the header (56px) and the gallery bar (55px). The
          labels are text-micro at 10.5px, a step under the 11px floor, so
          six column names stay quieter than the rows they label. */}
      <div
        role="row"
        className={ROW + ' sticky top-[111px] z-10 bg-background py-2.5 border-b border-edge-strong text-micro !text-[10.5px] text-ink-4'}
      >
        <span role="columnheader" className="@max-md:hidden">#</span>
        <span role="columnheader">Site</span>
        <span role="columnheader" className="@max-md:hidden">Category</span>
        <span role="columnheader" className="@max-md:hidden">Type</span>
        <span role="columnheader" className="@max-md:hidden">Palette</span>
        <span role="columnheader" className="text-right">Added</span>
      </div>

      {designs.map((design, i) => {
        const font = typefaceOf(design.typography)
        const palette = paletteOf(design.colors)
        const selected = design.id === selectedId
        return (
          <div
            key={design.id}
            role="row"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onOpenDesign(design)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDesign(design) } }}
            className={ROW + ' group py-2.5 border-b border-edge cursor-pointer hover:bg-foreground/[0.035] aria-selected:bg-foreground/[0.05] transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pro'}
          >
            <span role="cell" className="@max-md:hidden text-meta text-ink-4 tabular-nums">
              {String(i + 1).padStart(3, '0')}
            </span>
            <span role="cell" className="flex items-center gap-3 min-w-0">
              <Thumb design={design} />
              {/* The domain, not the page title: titles are whatever the
                  site put in its tab, long and often not its name. The
                  full title is in the panel. */}
              <span className="truncate text-ink">{hostOf(design)}</span>
            </span>
            <span role="cell" className="@max-md:hidden min-w-0 flex">
              <button
                onClick={e => { e.stopPropagation(); onKind(design.kind) }}
                className="truncate text-ink-3 group-hover:text-ink-2 hover:!text-ink transition-colors duration-[120ms]"
              >
                {displayKind(design.kind)}
              </button>
            </span>
            <span role="cell" className="@max-md:hidden truncate text-ink-3 group-hover:text-ink-2 transition-colors duration-[120ms]">
              {font ?? <span className="text-ink-4">—</span>}
            </span>
            <span role="cell" className="@max-md:hidden flex gap-[3px]">
              {palette.map((hex, k) => <Dot key={k} hex={hex} size="w-4 h-4" />)}
              {Array.from({ length: Math.max(0, 3 - palette.length) }, (_, k) => <EmptyDot key={'e' + k} />)}
            </span>
            <span role="cell" className="text-right text-meta text-ink-4 tabular-nums whitespace-nowrap">
              {added(design.addedDate)}
            </span>
          </div>
        )
      })}

      {designs.length === 0 ? (
        <p className="py-10 px-2 text-meta text-ink-4">No sites match these filters.</p>
      ) : designs.length >= total && (
        <p className="py-5 px-2 text-meta text-ink-4">End of list · {total} sites</p>
      )}
    </div>
  )
}
