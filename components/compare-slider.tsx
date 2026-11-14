// components/compare-slider.tsx
// Before and after in one frame: the "after" picture underneath, the "before"
// clipped over it with clip-path (no extra layout, on the compositor), and a
// handle you drag, click or move with the arrow keys. The pointer is captured
// once a drag starts, so it keeps following outside the frame.
'use client'

import { useCallback, useRef, useState } from 'react'

export function CompareSlider({ before, after, alt, ratio = '960 / 600' }: { before: string; after: string; alt: string; ratio?: string }) {
  const [at, setAt] = useState(50)
  const frame = useRef<HTMLDivElement>(null)

  const moveTo = useCallback((clientX: number) => {
    const r = frame.current?.getBoundingClientRect()
    if (!r) return
    setAt(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }, [])

  return (
    <div
      ref={frame}
      className="relative w-full overflow-hidden rounded-[10px] border border-edge bg-muted select-none touch-pan-y cursor-ew-resize"
      style={{ aspectRatio: ratio }}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); moveTo(e.clientX) }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e.clientX) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt}, after`} className="absolute inset-0 w-full h-full object-cover object-top" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={`${alt}, before`} className="absolute inset-0 w-full h-full object-cover object-top" draggable={false}
        style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }} />
      <span className="absolute bottom-2 left-2 h-5 px-1.5 inline-flex items-center rounded-full bg-black/60 text-white text-[10.5px] font-[600] tracking-[0.04em] pointer-events-none">Before</span>
      <span className="absolute bottom-2 right-2 h-5 px-1.5 inline-flex items-center rounded-full bg-black/60 text-white text-[10.5px] font-[600] tracking-[0.04em] pointer-events-none">After</span>
      <div className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)] pointer-events-none" style={{ left: `${at}%` }} />
      <button
        type="button"
        role="slider" aria-label="Compare before and after" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(at)}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setAt(v => Math.max(0, v - 5)) }
          if (e.key === 'ArrowRight') { e.preventDefault(); setAt(v => Math.min(100, v + 5)) }
        }}
        data-no-press
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.25)] grid place-items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A]"
        style={{ left: `${at}%` }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M5 3 1.5 7 5 11M9 3l3.5 4L9 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  )
}
