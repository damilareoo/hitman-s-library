'use client'

import React from 'react'
import { Monitor, Palette, TextT, Images, Shapes } from '@phosphor-icons/react'
import { useSoundsContext } from '@/contexts/sounds-context'

export type PanelTab = 'preview' | 'colors' | 'type' | 'assets' | 'figma'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
}

const TABS: { key: PanelTab; label: string; Icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }> }[] = [
  { key: 'preview', label: 'Preview', Icon: Monitor },
  { key: 'colors', label: 'Colors', Icon: Palette },
  { key: 'type',   label: 'Type',    Icon: TextT },
  { key: 'assets', label: 'Assets',  Icon: Images },
  { key: 'figma',  label: 'Figma',   Icon: Shapes },
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
      className="flex border-b border-border"
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
              'flex-1 py-2.5 transition-colors -mb-px border-b-2 flex flex-col items-center justify-center gap-1 min-h-[44px]',
              isActive
                ? 'text-foreground border-foreground'
                : 'text-muted-foreground/50 border-transparent hover:text-muted-foreground',
            ].join(' ')}
          >
            <Icon className="w-[15px] h-[15px] shrink-0" weight={isActive ? 'fill' : 'regular'} />
            <span className={['text-[9px] font-mono tracking-wide leading-none', isActive ? 'opacity-100' : 'opacity-70'].join(' ')}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
