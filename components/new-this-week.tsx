// components/new-this-week.tsx
//
// What arrived in the last seven days, as one slim row above the grid: a
// count and a chip per site (thumbnail, domain). Opening a chip opens the
// site. Closed with ×, it stays closed until something newer arrives (the
// newest id is the key). Shown only on the unfiltered library.
'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { getDomain } from '@/lib/get-domain'
import type { Design } from '@/components/design-card'
import { BTN } from '@/components/member-card'

const KEY = 'hl:new-seen'

export function NewThisWeek({ sites, onOpen }: { sites: Design[]; onOpen: (d: Design) => void }) {
  const newest = sites[0]?.id ?? ''
  // Hidden until we know it wasn't dismissed, so it never flashes in and out.
  const [hidden, setHidden] = useState(true)
  useEffect(() => {
    try { setHidden(localStorage.getItem(KEY) === newest) } catch { setHidden(false) }
  }, [newest])

  if (!sites.length || hidden) return null
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, newest) } catch { /* private mode */ } }

  return (
    <section aria-label="New this week" className="flex items-center gap-3 pb-4 -mt-1 min-w-0">
      <span className="shrink-0 text-[12px] font-[500] text-ink-3 whitespace-nowrap">
        New this week <span className="text-ink-4 tabular-nums">{sites.length >= 12 ? '12+' : sites.length}</span>
      </span>
      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar">
        {sites.map(d => (
          <button
            key={d.id}
            onClick={() => onOpen(d)}
            title={d.title}
            // The shared chip, with a round thumbnail 2px inside its round end.
            className={BTN.chip(false) + ' !pl-0.5 !pr-2.5'}
          >
            <span className="w-6 h-6 rounded-full overflow-hidden bg-muted border border-edge shrink-0">
              {d.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
              )}
            </span>
            {getDomain(d.url)}
          </button>
        ))}
      </div>
      <button
        onClick={dismiss}
        aria-label="Hide new this week"
        title="Hide until something new arrives"
        className={BTN.icon}
      >
        <X className="w-3.5 h-3.5" weight="bold" />
      </button>
    </section>
  )
}
