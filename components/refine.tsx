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
            className={CARD.shell + ' absolute left-0 top-9 z-50 w-[320px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[118px] max-sm:w-auto shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); void takeImage(e.dataTransfer.files?.[0]) }}
            onKeyDown={e => { if (e.key === 'Enter' && refineActive(q)) { onApply(q); setOpen(false) } }}
          >
            <div className={CARD.head}>
              <span>Refine</span>
              <span className={CARD.proPill}>Pro</span>
            </div>

            <div className="px-4 pt-3.5 pb-4 space-y-4">
              <section>
                <div className="flex items-center justify-between">
                  <p className={CARD.label}>Palette</p>
                  <button onClick={() => fileRef.current?.click()} title="Measured in your browser. The image never leaves your device." className="flex items-center gap-1 text-[12px] font-[500] text-ink-3 hover:text-ink">
                    <ImageSquare className="w-3.5 h-3.5" weight="bold" /> {reading ? 'Reading…' : 'From an image'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => void takeImage(e.target.files?.[0])} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {q.palette.map(c => (
                    <button key={c} title={`Remove ${c}`} onClick={() => setQ(v => ({ ...v, palette: v.palette.filter(x => x !== c) }))}
                      className="group relative w-7 h-7 rounded-[7px] ring-1 ring-inset ring-foreground/10" style={{ background: c }}>
                      <X className="absolute inset-0 m-auto w-3 h-3 opacity-0 group-hover:opacity-100 text-white mix-blend-difference" weight="bold" />
                    </button>
                  ))}
                  {q.palette.length < 6 && (
                    <button onClick={() => colourRef.current?.click()} title="Add a colour"
                      className="w-7 h-7 grid place-items-center rounded-[7px] border border-dashed border-edge-strong text-ink-4 hover:text-ink">
                      <Plus className="w-3 h-3" weight="bold" />
                    </button>
                  )}
                  <input ref={colourRef} type="color" className="sr-only"
                    onChange={e => { const c = e.target.value.toLowerCase(); setQ(v => (v.palette.includes(c) || v.palette.length >= 6 ? v : { ...v, palette: [...v.palette, c] })) }} />
                </div>
              </section>

              <section>
                <label htmlFor="refine-font" className={CARD.label}>Font</label>
                <input id="refine-font" value={q.font} maxLength={40} placeholder="Inter, Instrument Serif…"
                  onChange={e => setQ(v => ({ ...v, font: e.target.value }))}
                  className="mt-2 w-full h-8 px-2.5 rounded-[8px] border border-edge bg-transparent text-[13px] text-ink placeholder:text-ink-4 outline-none focus:border-foreground/30" />
              </section>

              <section>
                <p className={CARD.label}>Readable text</p>
                <div role="radiogroup" aria-label="Readable text" className="mt-2 flex gap-1.5">
                  {(['', 'AA', 'AAA'] as const).map(r => (
                    <button key={r || 'any'} role="radio" aria-checked={q.readable === r} onClick={() => setQ(v => ({ ...v, readable: r }))}
                      className={'h-7 px-3 rounded-full border text-[12px] font-[600] transition-colors ' + (q.readable === r ? 'border-foreground bg-foreground text-background' : 'border-edge text-ink-3 hover:text-ink')}>
                      {r || 'Any'}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className={CARD.foot}>
              <button onClick={() => setQ({ palette: [], font: '', readable: '' })} className={CARD.footBtn}>Reset</button>
              <button disabled={!refineActive(q)} onClick={() => { onApply(q); setOpen(false) }} className={CARD.footBtn + ' ml-auto text-ink font-[600] disabled:opacity-40'}>
                Show sites <span className={CARD.kbd}>↵</span>
              </button>
              <span aria-hidden className="w-px h-4 bg-edge" />
              <button onClick={() => setOpen(false)} className={CARD.footBtn}>Close <span className={CARD.kbd}>esc</span></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
