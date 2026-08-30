'use client'

import React from 'react'
import { motion } from 'motion/react'
import { DeviceMobile, Monitor, Palette, TextT } from '@phosphor-icons/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { MOVE_EASE, DUR } from '@/lib/motion'

export type PanelTab = 'preview' | 'mobile' | 'colors' | 'type'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
}

const TABS: { key: PanelTab; label: string; Icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }> }[] = [
  { key: 'preview', label: 'Preview', Icon: Monitor },
  { key: 'mobile',  label: 'Mobile',  Icon: DeviceMobile },
  { key: 'colors', label: 'Colors', Icon: Palette },
  { key: 'type',   label: 'Type',    Icon: TextT },
]

export function PanelTabs({ active, onChange }: PanelTabsProps) {
  const { playTabChange } = useSoundsContext()
  const activeIndex = TABS.findIndex(t => t.key === active)

  // Arrow-key tab changes are repeated far more than clicks, and animating a
  // keyboard action makes the whole panel feel like it lags behind the key.
  const viaKeyboard = React.useRef(false)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      const prev = TABS[(activeIndex - 1 + TABS.length) % TABS.length]
      viaKeyboard.current = true
      playTabChange(); onChange(prev.key)
    } else if (e.key === 'ArrowRight') {
      const next = TABS[(activeIndex + 1) % TABS.length]
      viaKeyboard.current = true
      playTabChange(); onChange(next.key)
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Site detail tabs"
      className="flex border-b border-edge-strong"
      onKeyDown={handleKeyDown}
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => { viaKeyboard.current = false; playTabChange(); onChange(key) }}
            className={[
              'relative flex-1 py-3 transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[44px]',
              isActive ? 'text-ink' : 'text-ink-4 hover:text-ink-3',
            ].join(' ')}
          >
            <Icon className="w-4 h-4 shrink-0" weight={isActive ? 'fill' : 'regular'} />
            <span className="text-micro">{label}</span>
            {isActive && (
              <motion.div
                layoutId="panel-tab-underline"
                transition={
                  viaKeyboard.current
                    ? { duration: 0 }
                    : { duration: DUR.color, ease: MOVE_EASE }
                }
                className="absolute -bottom-px left-4 right-4 h-[1.5px] bg-foreground/70"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
