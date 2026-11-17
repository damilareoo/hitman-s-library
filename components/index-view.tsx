'use client'

import type { Design } from '@/components/design-card'
import { displayKind } from '@/lib/categories'
import type { CollectionMap } from '@/lib/collections'
import { isSystemFont } from '@/lib/trends/compute'

interface IndexViewProps {
  total: number
  categories: { name: string; count: number }[]
  collections: CollectionMap
  designs: Design[]
  favorites: number[]
  onKind: (name: string) => void
  onOpenDesign: (design: Design) => void
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-[32px] font-semibold tracking-[-0.03em] leading-none tabular-nums max-sm:text-[26px]">
        {value}
      </div>
      <div className="text-micro text-ink-4 mt-1.5">{label}</div>
    </div>
  )
}

// One template for the header and every row, so the columns line up.
const ROW = 'grid items-center gap-4 px-2 border-b border-edge grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[40px_minmax(0,1fr)_64px_64px] md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1fr)_64px_64px] lg:grid-cols-[40px_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_64px_64px]'

function Dot({ hex, size }: { hex?: string; size: string }) {
  return <span aria-hidden className={size + ' shrink-0 rounded-full border border-edge'} style={{ background: hex ?? 'transparent' }} />
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
 * The library as a list: its size, then one row per site with the kind, type,
 * palette and date a card only shows on hover. No images and no fetch of its
 * own; it reads what the gallery already holds.
 */
export function IndexView({
  total,
  categories,
  collections,
  designs,
  favorites,
  onKind,
  onOpenDesign,
}: IndexViewProps) {
  const setNames = Object.keys(collections)

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 xl:px-8 pt-8 pb-28">

      <div className="flex flex-wrap gap-x-9 gap-y-6 pb-8">
        <Stat value={total} label="Sites" />
        <Stat value={categories.length} label="Kinds" />
        {/* Personal numbers stay out of the way until there are any. A fresh
            visitor reading "0 sets · 0 favorites" learns nothing and the page
            looks emptier than the library is. */}
        {setNames.length > 0 && <Stat value={setNames.length} label="Sets" />}
        {favorites.length > 0 && <Stat value={favorites.length} label="Favorites" />}
      </div>

      {/* Every site as a row: the details a card hides behind a hover, read
          down a column. It lists what the gallery has loaded, so the current
          filters and sort hold, and scrolling loads more like the grid does. */}
      <div role="table" aria-label="Sites" className="text-bodytext">
        <div role="row" className={ROW + ' sticky top-14 z-10 bg-background py-2.5 text-micro text-ink-4 uppercase tracking-[0.08em]'}>
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
              className={ROW + ' py-3 cursor-pointer text-ink-2 hover:text-ink hover:bg-foreground/[0.03] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pro'}
            >
              <span role="cell" className="max-sm:hidden font-mono text-micro text-ink-4 tabular-nums">{String(i + 1).padStart(3, '0')}</span>
              <span role="cell" className="flex items-center gap-3 min-w-0">
                <Dot hex={design.colors[0]} size="w-5 h-5" />
                <span className="truncate text-ink">{hostOf(design)}</span>
              </span>
              <span role="cell" className="max-md:hidden min-w-0">
                <button
                  onClick={e => { e.stopPropagation(); onKind(design.kind) }}
                  className="truncate max-w-full hover:text-ink hover:underline underline-offset-4"
                >
                  {displayKind(design.kind)}
                </button>
              </span>
              <span role="cell" className="max-lg:hidden truncate">{font ?? <span className="text-ink-4">—</span>}</span>
              <span role="cell" className="max-sm:hidden flex gap-1">
                {design.colors.slice(0, 3).map((hex, k) => <Dot key={k} hex={hex} size="w-4 h-4" />)}
              </span>
              <span role="cell" className="text-right font-mono text-micro text-ink-4 tabular-nums whitespace-nowrap">{added(design.addedDate)}</span>
            </div>
          )
        })}
        {designs.length === 0 && (
          <p className="py-10 text-meta text-ink-4">No sites match these filters.</p>
        )}
      </div>
    </div>
  )
}
