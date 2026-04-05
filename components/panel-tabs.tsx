// components/panel-tabs.tsx
'use client'

import { useSoundsContext } from '@/contexts/sounds-context'

export type PanelTab = 'preview' | 'colors' | 'type' | 'assets' | 'figma'

interface PanelTabsProps {
  active: PanelTab
  onChange: (tab: PanelTab) => void
  hasFigmaLayers?: boolean
}

const TABS: { key: PanelTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Type' },
  { key: 'assets', label: 'Assets' },
  { key: 'figma', label: 'Figma' },
]

export function PanelTabs({ active, onChange, hasFigmaLayers }: PanelTabsProps) {
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
            'flex-shrink-0 px-3.5 py-2.5 text-xs tracking-wide transition-colors -mb-px border-b-2 flex items-center gap-1.5',
            active === key
              ? 'text-foreground border-foreground'
              : 'text-muted-foreground border-transparent hover:text-foreground',
          ].join(' ')}
        >
          {key === 'figma' ? (
            <>
              <span className="font-bold text-[11px] leading-none">F</span>
              {label}
              {hasFigmaLayers && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
              )}
            </>
          ) : label}
        </button>
      ))}
    </div>
  )
}
