'use client'

import React from 'react'
import { DeviceMobile, Monitor, Palette, TextT, ClockCounterClockwise } from '@phosphor-icons/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { MOVE_EASE, DUR } from '@/lib/motion'

/** History tab ships separately from drift data: badges and the history API
 *  keep working underneath while the tab stays out of the panel. */
export const HISTORY_TAB_ENABLED = false

export type PanelTab = 'preview' | 'mobile' | 'colors' | 'type' | 'history'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
  /** On a phone there is no second device to offer, so Mobile is not a tab. */
  variant?: 'desktop' | 'mobile'
  colorsCount?: number
  typeCount?: number
}

type TabDef = { key: PanelTab; label: string; Icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }> }

const BASE_TABS: TabDef[] = [
  { key: 'preview', label: 'Preview', Icon: Monitor },
  { key: 'mobile',  label: 'Mobile',  Icon: DeviceMobile },
  { key: 'colors', label: 'Colors', Icon: Palette },
  { key: 'type',   label: 'Type',    Icon: TextT },
]

// History sits beside Type; the whole tab vanishes with the flag.
const ALL_TABS: TabDef[] = HISTORY_TAB_ENABLED
  ? [...BASE_TABS, { key: 'history', label: 'History', Icon: ClockCounterClockwise }]
  : BASE_TABS

// Offering Mobile to someone already holding a phone is offering them the
// view they are in. Preview carries the mobile rendering there instead, and
// the tab keeps the name that describes what it is rather than which device.
const MOBILE_TABS: TabDef[] = ALL_TABS.filter(t => t.key !== 'mobile').map(t =>
  t.key === 'preview' ? { ...t, Icon: DeviceMobile } : t,
)

/**
 * One track, one thumb. The thumb is measured from the active button rather
 * than computed from a fraction of the track, so it stays exact when the panel
 * resizes and when the phone variant drops a tab. It is measured after layout,
 * so the first paint shows it already in place and only later movements
 * animate.
 */
export function PanelTabs({ active, onChange, variant = 'desktop', colorsCount, typeCount }: PanelTabsProps) {
  const { playTabChange } = useSoundsContext()
  const TABS = variant === 'mobile' ? MOBILE_TABS : ALL_TABS
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
    <div className="px-3 pt-2.5 pb-2 flex-shrink-0">
      <div
        ref={trackRef}
        role="tablist"
        aria-label="Site detail tabs"
        onKeyDown={handleKeyDown}
        className="relative flex w-full h-[38px] p-[3px] rounded-[10px] bg-foreground/[0.05] dark:bg-foreground/[0.07]"
      >
        <span
          aria-hidden="true"
          className="absolute top-[3px] left-0 h-8 rounded-[7px] bg-card pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] dark:bg-[color-mix(in_srgb,var(--foreground)_12%,var(--background))] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          style={{
            width: thumb?.width ?? 0,
            transform: `translateX(${thumb?.left ?? 0}px)`,
            opacity: thumb ? 1 : 0,
            transition,
          }}
        />
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          const count = key === 'colors' ? colorsCount : key === 'type' ? typeCount : undefined
          return (
            <button
              key={key}
              role="tab"
              data-tab={key}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => { viaKeyboard.current = false; playTabChange(); onChange(key) }}
              className={[
                'relative z-[1] flex-1 min-w-0 h-8 px-2 rounded-[7px]',
                'flex items-center justify-center gap-1.5',
                'transition-colors duration-[var(--dur-2)] ease-[var(--ease-hover)]',
                isActive ? 'text-ink' : 'text-ink-3 hover:text-ink',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" weight={isActive ? 'fill' : 'regular'} />
              <span className="flex items-center gap-1 text-[12px] font-medium leading-none whitespace-nowrap">
                {label}
                {typeof count === 'number' && (
                  <span className="text-[11px] text-ink-4 tabular-nums">{count}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
