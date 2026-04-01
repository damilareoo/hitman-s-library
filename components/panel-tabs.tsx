// components/panel-tabs.tsx
'use client'

import { useSoundsContext } from '@/contexts/sounds-context'

export type PanelTab = 'preview' | 'colors' | 'type' | 'assets'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
}

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Type' },
  { key: 'assets', label: 'Assets' },
]

export function PanelTabs({ active, onChange }: PanelTabsProps) {
  const { playTabChange } = useSoundsContext()
  return (
    <div
      className="flex border-b border-border"
      style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => { playTabChange(); onChange(key) }}
          className={[
            'flex-shrink-0 px-4 py-2.5 text-xs tracking-wide transition-colors -mb-px border-b-2',
            active === key
              ? 'text-foreground border-foreground'
              : 'text-muted-foreground border-transparent hover:text-foreground',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
