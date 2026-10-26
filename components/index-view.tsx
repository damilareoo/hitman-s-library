'use client'

import type { ReactNode } from 'react'
import type { Design } from '@/components/design-card'
import { displayKind } from '@/lib/categories'
import type { CollectionMap } from '@/lib/collections'
import { FILTER_TAGS } from '@/lib/tagging'

interface IndexViewProps {
  total: number
  categories: { name: string; count: number }[]
  collections: CollectionMap
  designs: Design[]
  favorites: number[]
  activeTags: string[]
  onKind: (name: string) => void
  onOpenSet: (name: string) => void
  onOpenDesign: (design: Design) => void
  onTag: (tag: string) => void
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

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-micro text-ink-4 font-normal mb-3">{children}</h3>
}

/**
 * The library seen from above: size, kinds, sets and the most recent arrivals.
 * No images, no fetch — it is built from what the gallery already holds, so
 * switching to it costs a render and nothing else.
 */
export function IndexView({
  total,
  categories,
  collections,
  designs,
  favorites,
  activeTags,
  onKind,
  onOpenSet,
  onOpenDesign,
  onTag,
}: IndexViewProps) {
  const setNames = Object.keys(collections)
  const recent = designs.slice(0, 8)

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 xl:px-8 pt-8 pb-28">

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 pb-10">
        <Stat value={total} label="Sites" />
        <Stat value={categories.length} label="Kinds" />
        <Stat value={setNames.length} label="Sets" />
        <Stat value={favorites.length} label="Favorites" />
      </div>

      <div className="border-t border-edge">
        {categories.map(({ name, count }) => (
          <button
            key={name}
            onClick={() => onKind(name)}
            className="w-full flex items-baseline justify-between gap-4 py-3.5 border-b border-edge text-left text-ink-2 hover:text-ink transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[2px]"
          >
            <span className="text-[22px] font-semibold tracking-[-0.03em] leading-none max-sm:text-[20px]">
              {displayKind(name)}
            </span>
            <span className="text-meta text-ink-4 tabular-nums shrink-0">{count} sites</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10 pt-10">
        <section>
          <SectionLabel>Sets</SectionLabel>
          {setNames.length === 0 ? (
            <p className="text-meta text-ink-4">
              No sets yet — open a site and save it to one.
            </p>
          ) : (
            <ul className="border-t border-edge" role="list">
              {setNames.map(name => (
                <li key={name}>
                  <button
                    onClick={() => onOpenSet(name)}
                    className="w-full flex items-baseline justify-between gap-4 py-2.5 border-b border-edge text-left text-bodytext text-ink-2 hover:text-ink transition-colors"
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-micro text-ink-4 tabular-nums shrink-0">
                      {collections[name].length} sites
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionLabel>Recently added</SectionLabel>
          <ul className="border-t border-edge" role="list">
            {recent.map(design => (
              <li key={design.id}>
                <button
                  onClick={() => onOpenDesign(design)}
                  className="w-full flex items-baseline justify-between gap-4 py-2.5 border-b border-edge text-left text-bodytext text-ink-2 hover:text-ink transition-colors"
                >
                  <span className="truncate">{design.title}</span>
                  <span className="text-micro text-ink-4 uppercase tracking-[0.08em] truncate max-w-[45%] shrink-0">
                    {displayKind(design.kind)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap gap-2 pt-10">
        {FILTER_TAGS.map(tag => {
          const active = activeTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => onTag(tag)}
              aria-pressed={active}
              className={[
                'h-8 px-3 rounded-[8px] text-meta border transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] active:scale-[0.98]',
                active
                  ? 'bg-muted text-ink border-transparent font-medium hover:bg-foreground/[0.09]'
                  : 'bg-foreground/[0.055] text-ink-2 border-transparent hover:text-ink hover:bg-foreground/[0.09]',
              ].join(' ')}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
