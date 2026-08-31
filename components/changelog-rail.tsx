'use client'

import { useEffect, useState } from 'react'
import type { MonthGroup } from '@/data/changelog'

interface ChangelogRailProps {
  months: MonthGroup[]
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

/**
 * The whole changelog, one dot per release, pinned in the gutter.
 *
 * It is a minimap rather than a menu: the dots are the same vocabulary the
 * timeline itself uses, so the rail reads as the page zoomed out. That also
 * makes the shape of the project legible at a glance — thirteen releases in
 * August against two in February is a fact about the work, and a list of
 * month names would have thrown it away.
 *
 * Every dot is its own target, which is what buys release-level precision
 * without asking anyone to scan a list of thirty titles.
 */
export function ChangelogRail({ months }: ChangelogRailProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-release-index]'),
    )
    if (nodes.length === 0) return

    // Whichever release is nearest the top of the viewport is the one being
    // read. Tracking intersection ratio instead would hand the state to
    // whichever entry happened to be longest, not the one you are looking at.
    const observer = new IntersectionObserver(
      () => {
        let best = 0
        let bestDistance = Infinity
        for (const node of nodes) {
          const distance = Math.abs(node.getBoundingClientRect().top - 96)
          if (distance < bestDistance) {
            bestDistance = distance
            best = Number(node.dataset.releaseIndex)
          }
        }
        setActiveIndex(best)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 1] },
    )
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  function jumpTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const activeMonth = months.find(m =>
    m.releases.some(r => r.index === activeIndex),
  )

  return (
    <nav
      aria-label="Jump to a month"
      className="hidden xl:block fixed top-1/2 -translate-y-1/2 left-[max(1.5rem,calc(50%-490px))] w-[150px] z-40"
    >
      <p className="text-micro text-ink-4 mb-3">Jump to</p>

      <div className="space-y-2">
        {months.map(month => {
          const isActiveMonth = activeMonth?.id === month.id
          return (
            <div key={month.id} className="flex items-center gap-2">
              <button
                onClick={() => jumpTo(month.id)}
                className={[
                  'text-micro w-8 text-left shrink-0 transition-colors',
                  'duration-[var(--dur-2)] ease-[var(--ease-sig)]',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[3px]',
                  isActiveMonth ? 'text-ink' : 'text-ink-4 hover:text-ink-2',
                ].join(' ')}
              >
                {month.label}
              </button>

              <div className="flex items-center gap-[1px]">
                {month.releases.map(release => {
                  const isActive = release.index === activeIndex
                  return (
                    <button
                      key={release.index}
                      onClick={() => jumpTo(`rel-${release.index}`)}
                      title={`${formatDate(release.date)} — ${release.title}`}
                      aria-label={`${formatDate(release.date)}, ${release.title}`}
                      aria-current={isActive ? 'true' : undefined}
                      // A 5px dot is smaller than any finger or hurried
                      // cursor. The pseudo-element carries the hit area so the
                      // rail keeps its drawn size and gains a usable one.
                      className="relative w-[5px] h-[5px] grid place-items-center shrink-0 before:absolute before:-inset-y-[7px] before:-inset-x-[1px] before:content-[''] focus-visible:outline-none group"
                    >
                      <span
                        className={[
                          'rounded-full transition-all',
                          'duration-[var(--dur-2)] ease-[var(--ease-sig)]',
                          isActive
                            ? 'w-[5px] h-[5px] bg-foreground'
                            : 'w-[3px] h-[3px] bg-ink-4 group-hover:bg-ink-2',
                        ].join(' ')}
                      />
                    </button>
                  )
                })}
              </div>

              <span
                className={[
                  'text-micro tabular-nums ml-auto shrink-0 transition-colors',
                  'duration-[var(--dur-2)] ease-[var(--ease-sig)]',
                  isActiveMonth ? 'text-ink-3' : 'text-ink-4',
                ].join(' ')}
              >
                {month.releases.length}
              </span>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
