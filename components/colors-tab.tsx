// components/colors-tab.tsx
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ColorRow {
  hex_value: string
  oklch: string | null
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      {copied
        ? <Check className="w-3 h-3 text-foreground" />
        : <Copy className="w-3 h-3" />}
    </button>
  )
}

export function ColorsTab({ colors, extractionError }: { colors: ColorRow[]; extractionError?: string | null }) {
  if (!colors.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-8 text-center">
        <p className="text-xs text-muted-foreground">No colors extracted</p>
        {extractionError && (
          <p className="font-mono text-[10px] text-destructive/70 max-w-[220px] break-words">{extractionError}</p>
        )}
      </div>
    )
  }

  const sorted = [...colors].sort((a, b) => {
    const lA = a.oklch ? parseFloat(a.oklch.match(/oklch\(([\d.]+)/)?.[1] ?? '50') : 50
    const lB = b.oklch ? parseFloat(b.oklch.match(/oklch\(([\d.]+)/)?.[1] ?? '50') : 50
    return lA - lB
  })

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Brand colors</span>
        <span className="text-[9px] text-muted-foreground/40 bg-secondary border border-border rounded-full px-2 py-0.5">
          {colors.length}
        </span>
      </div>

      {sorted.map((color, i) => (
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
              <span className="font-mono text-[11px] text-foreground">{color.hex_value}</span>
              <CopyBtn value={color.hex_value} />
            </div>
            {color.oklch && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted-foreground truncate pr-1">{color.oklch}</span>
                <CopyBtn value={color.oklch} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
