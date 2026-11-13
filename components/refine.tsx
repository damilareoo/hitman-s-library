// components/refine.tsx
//
// Pro search: palette (from an image you drop, measured in your browser, or
// colours you pick), a typeface, and readable text (WCAG AA / AAA). Anyone can
// open it and set filters; the server decides who gets results, and the grid
// explains Pro to those who don't. No blur, no pop-up.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SlidersHorizontal, ImageSquare, Plus, X } from '@phosphor-icons/react'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { CARD } from '@/components/member-card'
import { paletteFromFile } from '@/lib/palette-client'
import { refineActive, type RefineQuery } from '@/lib/search/refine-params'

export function Refine({ value, onApply, className = '' }: { value: RefineQuery; onApply: (q: RefineQuery) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState<RefineQuery>(value)
  const [reading, setReading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const colourRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) setQ(value) }, [open, value])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  async function takeImage(file: File | undefined) {
    if (!file) return
    setReading(true)
    const colours = await paletteFromFile(file, 6).catch(() => [])
    setReading(false)
    if (colours.length) setQ(v => ({ ...v, palette: colours }))
  }

  const active = refineActive(value)
  const row = 'grid grid-cols-[72px_1fr] items-start gap-3 py-3 border-t border-edge-faint first:border-t-0'
  const label = 'pt-1.5 text-[12.5px] font-[600] text-ink-2'

  return (
    <div ref={ref} className={'relative ' + className}>
      <button
        onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="dialog"
        className={'h-7 px-2.5 flex items-center gap-1.5 rounded-[10px] text-ui transition-colors ' + (active ? 'bg-foreground text-background' : 'bg-muted/70 text-ink-3 hover:bg-muted hover:text-ink-2')}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" weight="bold" />
        <span>Refine</span>
        <span className={'text-[10.5px] font-[600] tracking-[0.06em] ' + (active ? 'text-background/70' : 'text-[#E8A04A]')}>PRO</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog" aria-label="Refine by palette, font and readable text"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: POP_OUT }} transition={POP_IN}
            style={{ transformOrigin: 'top left' }}
            className={CARD.shell + ' absolute left-0 top-9 z-50 w-[340px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[118px] max-sm:w-auto shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); void takeImage(e.dataTransfer.files?.[0]) }}
          >
            <div className={CARD.pad + ' pt-1'}>
              <div className={row}>
                <span className={label}>Palette</span>
                <div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-9 flex items-center justify-center gap-2 rounded-[8px] border border-dashed border-edge-strong text-[12.5px] text-ink-3 hover:text-ink hover:border-foreground/40 transition-colors"
                  >
                    <ImageSquare className="w-4 h-4" weight="bold" />
                    {reading ? 'Reading colours…' : 'Drop or choose an image'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => void takeImage(e.target.files?.[0])} />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {q.palette.map(c => (
                      <button key={c} title={`Remove ${c}`} onClick={() => setQ(v => ({ ...v, palette: v.palette.filter(x => x !== c) }))}
                        className="group relative w-6 h-6 rounded-[6px] ring-1 ring-inset ring-foreground/10" style={{ background: c }}>
                        <X className="absolute inset-0 m-auto w-3 h-3 opacity-0 group-hover:opacity-100 text-white mix-blend-difference" weight="bold" />
                      </button>
                    ))}
                    {q.palette.length < 6 && (
                      <button onClick={() => colourRef.current?.click()} title="Add a colour"
                        className="w-6 h-6 grid place-items-center rounded-[6px] border border-edge-strong text-ink-3 hover:text-ink">
                        <Plus className="w-3 h-3" weight="bold" />
                      </button>
                    )}
                    <input ref={colourRef} type="color" className="sr-only"
                      onChange={e => { const c = e.target.value.toLowerCase(); setQ(v => (v.palette.includes(c) || v.palette.length >= 6 ? v : { ...v, palette: [...v.palette, c] })) }} />
                  </div>
                  <p className={CARD.meta + ' mt-1.5'}>The image stays on your device.</p>
                </div>
              </div>
              <div className={row}>
                <label htmlFor="refine-font" className={label}>Font</label>
                <input id="refine-font" value={q.font} maxLength={40} placeholder="Inter, Instrument Serif…"
                  onChange={e => setQ(v => ({ ...v, font: e.target.value }))}
                  className="h-8 px-2.5 rounded-[8px] bg-muted/70 text-[13px] text-ink placeholder:text-ink-4 outline-none focus:ring-1 focus:ring-foreground/20" />
              </div>
              <div className={row}>
                <span className={label}>Readable</span>
                <div role="radiogroup" aria-label="Readable text" className="grid grid-cols-3 p-[3px] rounded-[9px] bg-foreground/[0.05]">
                  {(['', 'AA', 'AAA'] as const).map(r => (
                    <button key={r || 'any'} role="radio" aria-checked={q.readable === r} onClick={() => setQ(v => ({ ...v, readable: r }))}
                      className={'h-7 rounded-[6px] text-[12px] font-[600] transition-colors ' + (q.readable === r ? 'bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-ink-3 hover:text-ink')}>
                      {r || 'Any'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={CARD.pad + ' h-12 flex items-center justify-between border-t border-edge'}>
              <button onClick={() => setQ({ palette: [], font: '', readable: '' })} className={CARD.meta + ' hover:text-ink'}>Reset</button>
              <button
                disabled={!refineActive(q)}
                onClick={() => { onApply(q); setOpen(false) }}
                className="h-8 px-3.5 rounded-[8px] bg-foreground text-background text-[13px] font-[600] disabled:opacity-40 hover:opacity-90 transition"
              >
                Show sites
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
