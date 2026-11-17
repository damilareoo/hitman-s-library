'use client'

import { GeistMono } from 'geist/font/mono'
import type { Design } from '@/components/design-card'
import { displayKind } from '@/lib/categories'
import { isSystemFont } from '@/lib/trends/compute'

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

// Numbers, column names and dates are set in a true monospace so the digits
// stack straight down the column.
const MONO = GeistMono.className

// One template for the header and every row, so the columns line up. Beside
// the panel every column stays and long names cut short, as in the mockup;
// only on a phone-wide table does it drop to the site and the date.
const ROW = [
  'grid items-center gap-4 px-2',
  'grid-cols-[minmax(0,1fr)_64px]',
  '@md:grid-cols-[44px_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_76px_64px]',
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
      className="@container text-[13.5px] transition-opacity duration-150 ease-[var(--ease-sig)] aria-busy:opacity-55"
    >
      {/* Sticks under the header (56px) and the gallery bar (55px). */}
      <div
        role="row"
        className={ROW + ' ' + MONO + ' sticky top-[111px] z-10 bg-background py-2.5 border-b border-edge-strong text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-4'}
      >
        <span role="columnheader" className="@max-md:hidden">#</span>
        <span role="columnheader">Site</span>
        <span role="columnheader" className="@max-md:hidden">Category</span>
        <span role="columnheader" className="@max-md:hidden">Type</span>
        <span role="columnheader" className="@max-md:hidden">Palette</span>
        <span role="columnheader" className="text-right">Added</span>
      </div>

      {designs.map((design, i) => {
        const font = design.typography?.find(f => f && !isSystemFont(f))
        const selected = design.id === selectedId
        return (
          <div
            key={design.id}
            role="row"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onOpenDesign(design)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDesign(design) } }}
            className={ROW + ' py-2.5 border-b border-edge cursor-pointer hover:bg-foreground/[0.035] aria-selected:bg-foreground/[0.05] transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pro'}
          >
            <span role="cell" className={MONO + ' @max-md:hidden text-[11.5px] text-ink-4 tabular-nums'}>
              {String(i + 1).padStart(3, '0')}
            </span>
            <span role="cell" className="flex items-center gap-2.5 min-w-0">
              <Dot hex={design.colors[0]} size="w-5 h-5" />
              <span className="truncate text-ink">{hostOf(design)}</span>
            </span>
            <span role="cell" className="@max-md:hidden min-w-0 flex">
              <button
                onClick={e => { e.stopPropagation(); onKind(design.kind) }}
                className="truncate text-ink-3 hover:text-ink transition-colors"
              >
                {displayKind(design.kind)}
              </button>
            </span>
            <span role="cell" className="@max-md:hidden truncate text-ink-3">
              {font ?? <span className="text-ink-4">—</span>}
            </span>
            <span role="cell" className="@max-md:hidden flex gap-[3px]">
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
  )
}
