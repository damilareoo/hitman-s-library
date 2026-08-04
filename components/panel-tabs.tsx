'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Monitor, Palette, TextT, Images } from '@phosphor-icons/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { EASE, DUR } from '@/lib/motion'

export type PanelTab = 'preview' | 'colors' | 'type' | 'assets'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
}

const TABS: { key: PanelTab; label: string; Icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }> }[] = [
  { key: 'preview', label: 'Preview', Icon: Monitor },
  { key: 'colors', label: 'Colors', Icon: Palette },
  { key: 'type',   label: 'Type',    Icon: TextT },
  { key: 'assets', label: 'Assets',  Icon: Images },
]

export function PanelTabs({ active, onChange }: PanelTabsProps) {
  const { playTabChange } = useSoundsContext()
  const activeIndex = TABS.findIndex(t => t.key === active)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      const prev = TABS[(activeIndex - 1 + TABS.length) % TABS.length]
      playTabChange(); onChange(prev.key)
    } else if (e.key === 'ArrowRight') {
      const next = TABS[(activeIndex + 1) % TABS.length]
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
            onClick={() => { playTabChange(); onChange(key) }}
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
                transition={{ duration: DUR.move, ease: EASE }}
                className="absolute -bottom-px left-4 right-4 h-[1.5px] bg-foreground/70"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
