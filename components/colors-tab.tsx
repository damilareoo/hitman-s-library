// components/colors-tab.tsx
'use client'

import { useState, useRef } from 'react'
import { Copy, Check } from '@phosphor-icons/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { TabEmptyState } from './tab-empty-state'

interface ColorRow {
  hex_value: string
  oklch: string | null
}

function parseOklch(s: string): { l: number; c: number; h: number } | null {
  const m = s.match(/oklch\(\s*([\d.]+)\s+([\d.e+\-]+)\s+([\d.]+|none)/)
  if (!m) return null
  return {
    l: Math.round(parseFloat(m[1]) * 100),
    c: parseFloat(m[2]),
    h: m[3] === 'none' ? 0 : Math.round(parseFloat(m[3])),
  }
}

export function ColorsTab({ colors, extractionError }: { colors: ColorRow[]; extractionError?: string | null }) {
  const [format, setFormat] = useState<'hex' | 'oklch'>('hex')
  const [exportCopied, setExportCopied] = useState<'css' | 'tailwind' | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { playCopy } = useSoundsContext()

  if (!colors.length) {
    return <TabEmptyState message="No colors extracted" extractionError={extractionError} />
  }

  const sorted = [...colors].sort((a, b) => {
    const lA = a.oklch ? parseFloat(a.oklch.match(/oklch\(([\d.]+)/)?.[1] ?? '50') : 50
    const lB = b.oklch ? parseFloat(b.oklch.match(/oklch\(([\d.]+)/)?.[1] ?? '50') : 50
    return lA - lB
  })

  function buildCssVars(): string {
    return sorted.map((c, i) => `  --color-${i + 1}: ${c.hex_value};`).join('\n')
  }

  function buildTailwind(): string {
    const entries = sorted.map((c, i) => `      '${i + 1}': '${c.hex_value}',`).join('\n')
    return `extend: {\n  colors: {\n    brand: {\n${entries}\n    },\n  },\n}`
  }

  async function copyExport(type: 'css' | 'tailwind') {
    const text = type === 'css' ? `:root {\n${buildCssVars()}\n}` : buildTailwind()
    try {
      await navigator.clipboard.writeText(text)
      playCopy()
      setExportCopied(type)
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current)
      exportTimerRef.current = setTimeout(() => setExportCopied(null), 1500)
    } catch { /* clipboard unavailable */ }
  }

  async function copyColor(value: string, index: number) {
    try {
      await navigator.clipboard.writeText(value)
      playCopy()
      setCopiedIndex(index)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">

      {/* Compact toolbar */}
      <div className="sticky top-0 bg-background border-b border-border/40 px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-px">
          {(['hex', 'oklch'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={[
                'px-2 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-wide transition-colors',
                format === f ? 'bg-foreground text-background' : 'text-muted-foreground/50 hover:text-muted-foreground',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-px">
          {(['css', 'tailwind'] as const).map(type => (
            <button
              key={type}
              onClick={() => copyExport(type)}
              className={[
                'px-2 py-0.5 rounded-[3px] text-[9px] font-mono transition-colors',
                exportCopied === type ? 'text-foreground' : 'text-muted-foreground/40 hover:text-muted-foreground',
              ].join(' ')}
            >
              {exportCopied === type ? '✓' : ''}{type === 'css' ? 'CSS' : 'TW'}
            </button>
          ))}
          <span className="text-[9px] font-mono text-muted-foreground/25 ml-1 tabular-nums">{colors.length}</span>
        </div>
      </div>

      {/* Color list */}
      <div className="p-3 flex flex-col gap-1.5">
        {sorted.map((color, i) => {
          const parsed = color.oklch ? parseOklch(color.oklch) : null
          const showOklch = format === 'oklch' && parsed !== null
          const displayValue = showOklch
            ? `oklch(${parsed!.l}% ${parsed!.c.toFixed(2)} ${parsed!.h}°)`
            : color.hex_value

          return (
            <button
              key={i}
              onClick={() => copyColor(displayValue, i)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="group flex items-center gap-3 rounded-[4px] px-3 py-2.5 hover:bg-muted/60 transition-colors text-left w-full"
            >
              <div
                className="w-8 h-8 rounded-[3px] shrink-0 border border-black/[0.07] dark:border-white/[0.07]"
                style={{ background: color.hex_value }}
              />
              <span className="font-mono text-[11px] text-foreground/70 flex-1 truncate">
                {displayValue}
              </span>
              <span className={[
                'shrink-0 transition-opacity duration-150',
                (hoveredIndex === i || copiedIndex === i) ? 'opacity-100' : 'opacity-0',
              ].join(' ')}>
                {copiedIndex === i
                  ? <Check className="w-3 h-3 text-foreground/50" weight="bold" />
                  : <Copy className="w-3 h-3 text-muted-foreground/40" weight="regular" />
                }
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
