// components/panel-tabs.tsx
'use client'

import { useSoundsContext } from '@/contexts/sounds-context'

export type PanelTab = 'preview' | 'colors' | 'type' | 'assets' | 'figma'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
}

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Type' },
  { key: 'assets', label: 'Assets' },
  { key: 'figma', label: 'Figma' },
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
      style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      onKeyDown={handleKeyDown}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          tabIndex={active === key ? 0 : -1}
          onClick={() => { playTabChange(); onChange(key) }}
          className={[
            'flex-shrink-0 px-3.5 py-3 text-xs tracking-wide transition-colors -mb-px border-b-2 flex items-center gap-1.5',
            active === key
              ? 'text-foreground border-foreground font-medium'
              : 'text-muted-foreground border-transparent hover:text-foreground',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
