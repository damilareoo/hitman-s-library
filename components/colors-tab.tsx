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

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const { playCopy } = useSoundsContext()
  async function copy() {
    await navigator.clipboard.writeText(value)
    playCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      aria-label={copied ? 'Copied' : `Copy ${value}`}
      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      {copied
        ? <Check className="w-3 h-3 text-foreground" weight="bold" />
        : <Copy className="w-3 h-3" weight="regular" />}
    </button>
  )
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
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const text = type === 'css'
      ? `:root {\n${buildCssVars()}\n}`
      : buildTailwind()
    try {
      await navigator.clipboard.writeText(text)
      setExportCopied(type)
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current)
      exportTimerRef.current = setTimeout(() => setExportCopied(null), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Brand colors</span>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary border border-border rounded overflow-hidden">
            <button
              onClick={() => setFormat('hex')}
              className={`text-[9px] font-mono px-2 py-0.5 transition-colors ${format === 'hex' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              HEX
            </button>
            <button
              onClick={() => setFormat('oklch')}
              className={`text-[9px] font-mono px-2 py-0.5 transition-colors ${format === 'oklch' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              OKLCH
            </button>
          </div>
          <div className="flex bg-secondary border border-border rounded overflow-hidden">
            <button
              onClick={() => copyExport('css')}
              className={`text-[9px] font-mono px-2 py-0.5 transition-colors ${exportCopied === 'css' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {exportCopied === 'css' ? '✓ CSS' : 'CSS'}
            </button>
            <button
              onClick={() => copyExport('tailwind')}
              className={`text-[9px] font-mono px-2 py-0.5 border-l border-border transition-colors ${exportCopied === 'tailwind' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {exportCopied === 'tailwind' ? '✓ TW' : 'TW'}
            </button>
          </div>
          <span className="text-[9px] text-muted-foreground/40 bg-secondary border border-border rounded-full px-2 py-0.5">
            {colors.length}
          </span>
        </div>
      </div>

      {sorted.map((color, i) => {
        const parsed = color.oklch ? parseOklch(color.oklch) : null
        const showOklch = format === 'oklch' && parsed !== null

        return (
          <div
            key={i}
            className="group flex items-center gap-3 bg-secondary/50 border border-border rounded-md px-3 py-2 hover:border-border/80 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-md flex-shrink-0 border border-white/[0.08]"
              style={{ background: color.hex_value }}
            />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                {showOklch ? (
                  <span className="font-mono text-[11px] text-foreground">
                    oklch({parsed!.l}% {parsed!.c.toFixed(2)} {parsed!.h}°)
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-foreground">{color.hex_value}</span>
                )}
                <CopyBtn value={showOklch ? color.oklch! : color.hex_value} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
