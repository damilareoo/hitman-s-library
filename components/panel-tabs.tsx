'use client'

import React from 'react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { MOVE_EASE, DUR } from '@/lib/motion'

/** History tab ships separately from drift data: badges and the history API
 *  keep working underneath while the tab stays out of the panel. */
export const HISTORY_TAB_ENABLED = true

export type PanelTab = 'preview' | 'mobile' | 'colors' | 'type' | 'history'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
  /** On a phone there is no second device to offer, so Mobile is not a tab. */
  variant?: 'desktop' | 'mobile'
  colorsCount?: number
  typeCount?: number
  /** Controls for the tab on screen, on the same row (the preview's device switch and reload). */
  trailing?: React.ReactNode
}

type TabDef = { key: PanelTab; label: string }

// Words only. Mobile is not a tab: it is the Preview tab's other device,
// switched beside the tabs, so 'mobile' still names a state (and a link).
// History sits beside Type; the whole tab vanishes with the flag.
const TABS_ALL: TabDef[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Type' },
  ...(HISTORY_TAB_ENABLED ? [{ key: 'history' as const, label: 'History' }] : []),
]

/**
 * One track, one thumb. The thumb is measured from the active button rather
 * than computed from a fraction of the track, so it stays exact when the panel
 * resizes and when the phone variant drops a tab. It is measured after layout,
 * so the first paint shows it already in place and only later movements
 * animate.
 */
export function PanelTabs({ active: current, onChange, colorsCount, typeCount, trailing }: PanelTabsProps) {
  const { playTabChange } = useSoundsContext()
  const TABS = TABS_ALL
  const active: PanelTab = current === 'mobile' ? 'preview' : current
  const activeIndex = TABS.findIndex(t => t.key === active)
  const trackRef = React.useRef<HTMLDivElement>(null)

  const [thumb, setThumb] = React.useState<{ left: number; width: number } | null>(null)
  const [settled, setSettled] = React.useState(false)
  const [reduceMotion, setReduceMotion] = React.useState(false)

  // Arrow-key tab changes are repeated far more than clicks, and animating a
  // keyboard action makes the whole panel feel like it lags behind the key.
  const viaKeyboard = React.useRef(false)

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const measure = React.useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const el = track.querySelector<HTMLElement>(`[data-tab="${active}"]`)
    if (!el) return
    // Rects rather than offsetWidth: flex tracks divide into fractional
    // widths, and the rounded integer leaves the thumb half a pixel off.
    const trackBox = track.getBoundingClientRect()
    const tabBox = el.getBoundingClientRect()
    setThumb({ left: tabBox.left - trackBox.left, width: tabBox.width })
  }, [active])

  React.useLayoutEffect(() => { measure() }, [measure, TABS.length, colorsCount, typeCount])

  React.useEffect(() => {
    if (!thumb || settled) return
    const id = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(id)
  }, [thumb, settled])

  // The track changes width when the panel does (window resize, split view),
  // and the measured offsets go stale without this.
  React.useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
  }, [measure])

  function move(delta: number) {
    const next = TABS[(activeIndex + delta + TABS.length) % TABS.length]
    viaKeyboard.current = true
    playTabChange()
    onChange(next.key)
    requestAnimationFrame(() => {
      trackRef.current?.querySelector<HTMLElement>(`[data-tab="${next.key}"]`)?.focus()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
    else if (e.key === 'Home') { e.preventDefault(); move(-activeIndex) }
    else if (e.key === 'End') { e.preventDefault(); move(TABS.length - 1 - activeIndex) }
  }

  const animate = settled && !reduceMotion && !viaKeyboard.current
  const transition = animate
    ? `transform ${DUR.move}s cubic-bezier(${MOVE_EASE.join(',')}), width ${DUR.move}s cubic-bezier(${MOVE_EASE.join(',')})`
    : 'none'

  return (
    <div className="h-12 px-3 flex items-center gap-2 flex-shrink-0 border-b border-edge-faint">
      <div
        ref={trackRef}
        role="tablist"
        aria-label="Site detail tabs"
        onKeyDown={handleKeyDown}
        className="relative inline-flex h-8 p-[3px] rounded-[10px] bg-foreground/[0.05] dark:bg-foreground/[0.07]"
      >
        <span
          aria-hidden="true"
          className="absolute top-[3px] left-0 h-[26px] rounded-[7px] bg-card pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] dark:bg-[rgba(var(--foreground-rgb),0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          style={{
            width: thumb?.width ?? 0,
            transform: `translateX(${thumb?.left ?? 0}px)`,
            opacity: thumb ? 1 : 0,
            transition,
          }}
        />
        {TABS.map(({ key, label }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              role="tab"
              data-tab={key}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => { viaKeyboard.current = false; if (!isActive) { playTabChange(); onChange(key) } }}
              className={[
                'relative z-[1] h-[26px] px-2.5 max-[380px]:px-2 rounded-[7px] text-[12.5px] leading-none whitespace-nowrap',
                'transition-colors duration-[var(--dur-2)] ease-[var(--ease-hover)]',
                isActive ? 'text-ink font-[600]' : 'text-ink-3 font-[500] hover:text-ink',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>
      {trailing && <div className="ml-auto flex items-center gap-0.5 -mr-1">{trailing}</div>}
    </div>
  )
}
