'use client'

import type { ReactNode } from 'react'
import { GeistMono } from 'geist/font/mono'
import type { Design } from '@/components/design-card'
import { displayKind } from '@/lib/categories'
import { isSystemFont } from '@/lib/trends/compute'

interface IndexViewProps {
  /** "All sites", or the name of the current filter. */
  heading: string
  /** How many sites match, not how many are loaded. */
  total: number
  designs: Design[]
  /** The sort control, the same one the grid uses. */
  toolbar?: ReactNode
  onKind: (name: string) => void
  onOpenDesign: (design: Design) => void
}

// Numbers, column names and dates are set in a true monospace so the digits
// stack straight down the column.
const MONO = GeistMono.className

// One template for the header and every row, so the columns line up. Columns
// drop from the right of the reading order as the screen narrows: type first,
// then category, then the number and palette.
const ROW = [
  'grid items-center gap-4 px-2',
  'grid-cols-[minmax(0,1fr)_64px]',
  'sm:grid-cols-[44px_minmax(0,1fr)_76px_64px]',
  'md:grid-cols-[44px_minmax(0,2.2fr)_minmax(0,1.2fr)_76px_64px]',
  'lg:grid-cols-[44px_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_76px_64px]',
].join(' ')

function Dot({ hex, size }: { hex?: string; size: string }) {
  return (
    <span
      aria-hidden
      className={size + ' shrink-0 rounded-full border border-edge'}
      style={{ background: hex ?? 'transparent' }}
    />
  )
}

/** The domain reads better than the page title in a column of names. */
function hostOf(design: Design) {
  try { return new URL(design.url).hostname.replace(/^www\./, '') } catch { return design.title }
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' })
function added(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d)
}

/**
 * The library as a table: one row per site with the kind, typeface, palette
 * and date a card only shows on hover. No images and no fetch of its own; it
 * reads what the gallery has loaded, so filters and sort hold, and the
 * gallery's scroll sentinel keeps adding rows.
 */
export function IndexView({ heading, total, designs, toolbar, onKind, onOpenDesign }: IndexViewProps) {
  return (
    <div className="w-full px-5 xl:px-6 pt-5 pb-28">
      <div className="flex items-center justify-between gap-3 mb-4 min-h-8">
        <h2 className="text-[14px] font-medium text-ink whitespace-nowrap">
          {heading} <span className="text-ink-4 tabular-nums">{total}</span>
        </h2>
        {toolbar}
      </div>

      <div role="table" aria-label="Sites" className="text-[13.5px]">
        <div
          role="row"
          className={ROW + ' ' + MONO + ' sticky top-14 z-10 bg-background py-2.5 border-b border-edge-strong text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-4'}
        >
          <span role="columnheader" className="max-sm:hidden">#</span>
          <span role="columnheader">Site</span>
          <span role="columnheader" className="max-md:hidden">Category</span>
          <span role="columnheader" className="max-lg:hidden">Type</span>
          <span role="columnheader" className="max-sm:hidden">Palette</span>
          <span role="columnheader" className="text-right">Added</span>
        </div>

        {designs.map((design, i) => {
          const font = design.typography?.find(f => f && !isSystemFont(f))
          return (
            <div
              key={design.id}
              role="row"
              tabIndex={0}
              onClick={() => onOpenDesign(design)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDesign(design) } }}
              className={ROW + ' py-2.5 border-b border-edge cursor-pointer hover:bg-foreground/[0.035] transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pro'}
            >
              <span role="cell" className={MONO + ' max-sm:hidden text-[11.5px] text-ink-4 tabular-nums'}>
                {String(i + 1).padStart(3, '0')}
              </span>
              <span role="cell" className="flex items-center gap-2.5 min-w-0">
                <Dot hex={design.colors[0]} size="w-5 h-5" />
                <span className="truncate text-ink">{hostOf(design)}</span>
              </span>
              <span role="cell" className="max-md:hidden min-w-0 flex">
                <button
                  onClick={e => { e.stopPropagation(); onKind(design.kind) }}
                  className="truncate text-ink-3 hover:text-ink transition-colors"
                >
                  {displayKind(design.kind)}
                </button>
              </span>
              <span role="cell" className="max-lg:hidden truncate text-ink-3">
                {font ?? <span className="text-ink-4">—</span>}
              </span>
              <span role="cell" className="max-sm:hidden flex gap-[3px]">
                {design.colors.slice(0, 3).map((hex, k) => <Dot key={k} hex={hex} size="w-4 h-4" />)}
              </span>
              <span role="cell" className={MONO + ' text-right text-[12px] text-ink-4 tabular-nums whitespace-nowrap'}>
                {added(design.addedDate)}
              </span>
            </div>
          )
        })}

        {designs.length === 0 ? (
          <p className="py-10 px-2 text-meta text-ink-4">No sites match these filters.</p>
        ) : designs.length >= total && (
          <p className="py-5 px-2 text-[12.5px] text-ink-4">End of list · {total} sites</p>
        )}
      </div>
    </div>
  )
}
