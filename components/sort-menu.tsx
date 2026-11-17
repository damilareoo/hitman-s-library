'use client'

// Sort as one button that opens a short menu: three pills took a third of
// the gallery bar, and the bar now also carries Refine and the view switch.

import { useEffect, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { CARD } from '@/components/member-card'

export function SortMenu<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort: ${current.label}`}
        className="h-8 px-3 max-sm:px-2.5 flex items-center gap-1.5 rounded-[10px] border border-edge-strong text-[13px] font-[500] text-ink-3 hover:border-foreground/30 hover:text-ink-2 transition-colors"
      >
        <span className="max-sm:hidden">Sort</span>
        <span className="text-ink">{current.label}</span>
        <CaretDown className="w-3 h-3" weight="bold" />
      </button>
      {open && (
        <div role="menu" aria-label="Sort sites" className={CARD.shell + ' absolute right-0 top-9 z-50 w-[150px] p-1 shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}>
          {options.map(o => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="w-full h-9 px-2.5 flex items-center justify-between gap-3 rounded-[8px] text-[13.5px] font-[500] text-ink hover:bg-foreground/[0.045] focus-visible:bg-foreground/[0.045] outline-none transition-colors"
            >
              {o.label}
              {o.value === value && <Check className="w-3.5 h-3.5 text-ink-3" weight="bold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
