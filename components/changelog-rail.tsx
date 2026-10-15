'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MonthGroup } from '@/data/changelog'

interface ChangelogRailProps {
  months: MonthGroup[]
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

/** Where in the viewport a release counts as the one being read. */
const READING_LINE = 96

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
 *
 * The rail is also a scrubber. Press anywhere on it and drag, and the page
 * follows the nearest dot continuously — the date beside the rail keeps up,
 * so you can read your way backwards through the months without letting go.
 * Tracking used to be an IntersectionObserver, which only reports at the
 * moment an element crosses a threshold: scroll back up through a run of
 * short releases and the rail would sit on a stale dot until the next
 * boundary happened to trip. Position is read from scroll directly now, once
 * per frame, so it is right in both directions and at any speed.
 */
export function ChangelogRail({ months }: ChangelogRailProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const scrubbingRef = useRef(false)
  const frameRef = useRef<number | null>(null)

  const releases = months.flatMap(m => m.releases)

  /** The release nearest the reading line — the one you are actually on. */
  const readActive = useCallback(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-release-index]')
    let best = 0
    let bestDistance = Infinity
    for (const node of nodes) {
      const distance = Math.abs(node.getBoundingClientRect().top - READING_LINE)
      if (distance < bestDistance) {
        bestDistance = distance
        best = Number(node.dataset.releaseIndex)
      }
    }
    setActiveIndex(best)
  }, [])

  useEffect(() => {
    readActive()
    function onScroll() {
      // A drag owns the state while it lasts: the scroll it causes must not
      // race the pointer and drag the rail back a dot.
      if (scrubbingRef.current) return
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        readActive()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [readActive])

  const scrollToRelease = useCallback((index: number, smooth: boolean) => {
    const el = document.getElementById(`rel-${index}`)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top = el.getBoundingClientRect().top + window.scrollY - READING_LINE
    window.scrollTo({ top, behavior: smooth && !reduced ? 'smooth' : 'auto' })
  }, [])

  /**
   * Dots sit in month rows, so a drag crosses two axes on the desktop rail and
   * one on the phone. Picking by plain distance to the pointer covers both
   * without the rail needing to know which shape it is currently in.
   */
  const scrubToPointer = useCallback((clientX: number, clientY: number, within: HTMLElement) => {
    // Scoped to the rail being dragged, not the document. Both rails are in
    // the DOM at every width and CSS hides one, so the hidden rail's dots all
    // report a rect at 0,0 — forty-six candidates sitting in the corner, close
    // enough to win a nearest-dot contest for a pointer near the top left.
    const dots = within.querySelectorAll<HTMLElement>('[data-dot-index]')
    let best: number | null = null
    let bestDistance = Infinity
    for (const dot of dots) {
      const r = dot.getBoundingClientRect()
      const dx = clientX - (r.left + r.width / 2)
      const dy = clientY - (r.top + r.height / 2)
      const distance = dx * dx + dy * dy
      if (distance < bestDistance) {
        bestDistance = distance
        best = Number(dot.dataset.dotIndex)
      }
    }
    if (best === null || best === activeIndex) return
    setActiveIndex(best)
    scrollToRelease(best, false)
  }, [activeIndex, scrollToRelease])

  function beginScrub(e: React.PointerEvent) {
    // Let a plain click through to the button; only a press that means to
    // drag takes the pointer.
    if (e.button !== 0) return
    scrubbingRef.current = true
    setIsScrubbing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubToPointer(e.clientX, e.clientY, e.currentTarget as HTMLElement)
  }

  function moveScrub(e: React.PointerEvent) {
    if (!scrubbingRef.current) return
    e.preventDefault()
    scrubToPointer(e.clientX, e.clientY, e.currentTarget as HTMLElement)
  }

  function endScrub(e: React.PointerEvent) {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false
    setIsScrubbing(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  /** Arrow keys step release by release, which is what the dots are for. */
  function onKeyDown(e: React.KeyboardEvent) {
    const step =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 :
      e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    const at = releases.findIndex(r => r.index === activeIndex)
    const next = releases[Math.min(Math.max(at + step, 0), releases.length - 1)]
    if (!next || next.index === activeIndex) return
    e.preventDefault()
    setActiveIndex(next.index)
    scrollToRelease(next.index, true)
  }

  const activeMonth = months.find(m => m.releases.some(r => r.index === activeIndex))
  const activeRelease = releases.find(r => r.index === activeIndex)

  // The sideways rail overflows on phones: without this the active month
  // scrolls out of sight and the map stops matching the territory.
  const mobileRailRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrubbingRef.current) return
    const rail = mobileRailRef.current
    const active = rail?.querySelector<HTMLElement>(`[data-month-id="${activeMonth?.id}"]`)
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex, activeMonth?.id])

  function Dot({ release }: { release: MonthGroup['releases'][number] }) {
    const isActive = release.index === activeIndex
    return (
      <button
        data-dot-index={release.index}
        onClick={() => scrollToRelease(release.index, true)}
        title={`${formatDate(release.date)} — ${release.title}`}
        aria-label={`${formatDate(release.date)}, ${release.title}`}
        aria-current={isActive ? 'true' : undefined}
        // A 5px dot is smaller than any finger or hurried cursor. The
        // pseudo-element carries the hit area so the rail keeps its drawn
        // size and gains a usable one.
        className="relative w-[5px] h-[5px] grid place-items-center shrink-0 before:absolute before:-inset-y-[9px] before:-inset-x-[2px] before:content-[''] focus-visible:outline-none group touch-none"
      >
        <span
          className={[
            'rounded-full transition-[width,height,background-color] duration-[var(--dur-2)] ease-[var(--ease-sig)]',
            isActive
              ? 'w-[5px] h-[5px] bg-foreground'
              : 'w-[3px] h-[3px] bg-ink-3 group-hover:bg-ink-2',
          ].join(' ')}
        />
      </button>
    )
  }

  function MonthLabel({ month, active }: { month: MonthGroup; active: boolean }) {
    return (
      <button
        onClick={() => scrollToRelease(month.releases[0].index, true)}
        className={[
          'relative text-micro shrink-0 transition-colors duration-[var(--dur-2)] ease-[var(--ease-sig)]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[3px]',
          // Ten-pixel type is a ten-pixel target. The overlay gives the label
          // the same reach the dots beside it already have, without changing
          // how tightly the rail is drawn.
          "after:absolute after:left-1/2 after:top-1/2 after:h-9 after:w-[calc(100%+12px)] after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
          active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
        ].join(' ')}
      >
        {month.label}
      </button>
    )
  }

  const scrubHandlers = {
    onPointerDown: beginScrub,
    onPointerMove: moveScrub,
    onPointerUp: endScrub,
    onPointerCancel: endScrub,
  }

  return (
    <>
    {/* Below xl there is no gutter to pin a column in, so the same rail lies
        on its side under the nav and scrolls sideways — the map is the same
        map, only turned ninety degrees. */}
    <nav
      aria-label="Jump to a release"
      className="xl:hidden sticky top-12 z-40 bg-background/95 backdrop-blur-sm border-b border-edge"
    >
      <div
        ref={mobileRailRef}
        {...scrubHandlers}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className={`flex items-center gap-4 overflow-x-auto no-scrollbar px-6 py-3 ${isScrubbing ? 'cursor-grabbing touch-none select-none' : ''}`}
      >
        {months.map(month => (
          <div key={month.id} data-month-id={month.id} className="flex items-center gap-2 shrink-0">
            <MonthLabel month={month} active={activeMonth?.id === month.id} />
            <div className="flex items-center gap-[3px]">
              {month.releases.map(r => <Dot key={r.index} release={r} />)}
            </div>
          </div>
        ))}
      </div>
    </nav>

    <nav
      aria-label="Jump to a release"
      className="hidden xl:block fixed top-1/2 -translate-y-1/2 left-[max(1.5rem,calc(50%-490px))] w-[150px] z-40"
    >
      {/* The label was "Jump to", which said what the rail does and nothing
          about where you are. It carries the date now: the one fact that
          changes as you scroll, and the thing you are steering by mid-drag.
          The title rides under it so the rail answers "which release" without
          a trip back to the page. */}
      <p
        className={[
          'text-micro tabular-nums mb-1 transition-colors duration-[var(--dur-2)] ease-[var(--ease-sig)]',
          isScrubbing ? 'text-ink' : 'text-ink-4',
        ].join(' ')}
      >
        {activeRelease ? formatDate(activeRelease.date) : 'Jump to'}
      </p>
      <p className="text-meta text-ink-3 mb-3 truncate" aria-hidden="true">
        {activeRelease?.title ?? ''}
      </p>

      <div
        {...scrubHandlers}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className={`space-y-2 ${isScrubbing ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
      >
        {months.map(month => {
          const isActiveMonth = activeMonth?.id === month.id
          return (
            <div key={month.id} className="flex items-center gap-2">
              <span className="w-8 text-left shrink-0">
                <MonthLabel month={month} active={isActiveMonth} />
              </span>

              <div className="flex items-center gap-[1px]">
                {month.releases.map(r => <Dot key={r.index} release={r} />)}
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
    </>
  )
}
