'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface OriginPeekProps {
  /** The word in the sentence that opens the picture. */
  children: React.ReactNode
  src: string
  alt: string
  caption?: string
}

/**
 * A word that shows you the thing it is naming.
 *
 * The essay says the library began as a spreadsheet; this lets the reader
 * actually see it without the page having to stop and mount a figure. It sits
 * inline, opens on hover and on focus, and toggles on tap — a touch device
 * has no hover, and the alternative is a detail only mouse users ever get.
 */
export function OriginPeek({ children, src, alt, caption }: OriginPeekProps) {
  const [open, setOpen] = useState(false)
  const [below, setBelow] = useState(false)
  const [shift, setShift] = useState(0)
  const wrapRef = useRef<HTMLSpanElement>(null)

  // Opening upward is the better read — the picture sits above the sentence
  // that summoned it — but near the top of the viewport there is no room, and
  // a panel clipped by the window edge is worse than one that opens the other
  // way. Measured at open, because the answer changes with the scroll.
  function place() {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setBelow(rect.top < 320)

    // Centred on the word is right until the word is near an edge, and on a
    // phone it usually is — a 351px panel centred on a word 90px from the
    // left runs off the screen. Nudge it back inside and let it sit
    // off-centre, which nobody notices; a panel half out of the window is
    // the thing people notice.
    const width = Math.min(600, window.innerWidth * 0.9)
    const margin = 12
    const left = rect.left + rect.width / 2 - width / 2
    const overLeft = margin - left
    const overRight = left + width - (window.innerWidth - margin)
    setShift(overLeft > 0 ? overLeft : overRight > 0 ? -overRight : 0)
  }

  // A tap opens it; the next tap anywhere else puts it away again.
  useEffect(() => {
    if (!open) return
    function onDocPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={() => { place(); setOpen(true) }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => { place(); setOpen(v => !v) }}
        onFocus={() => { place(); setOpen(true) }}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        // Dotted rather than solid: a solid underline in running text reads as
        // a link, and this goes nowhere.
        className="underline decoration-dotted decoration-from-font underline-offset-[3px] decoration-ink-4 hover:decoration-ink-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 rounded-[2px]"
      >
        {children}
      </button>

      <span
        aria-hidden={!open}
        className={[
          'pointer-events-none absolute z-50 left-1/2',
          below ? 'top-[calc(100%+10px)]' : 'bottom-[calc(100%+10px)]',
          'w-[min(600px,90vw)] rounded-[6px] border border-edge-strong bg-card overflow-hidden',
          'shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]',
          'transition-[opacity,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)]',
          'motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{
          transform: `translateX(calc(-50% + ${shift}px)) translateY(${
            open ? 0 : below ? -4 : 4
          }px)`,
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={1500}
          height={896}
          className="w-full h-auto block"
        />
        {caption && (
          <span className="block text-micro text-ink-4 px-3 py-2 border-t border-edge">
            {caption}
          </span>
        )}
      </span>
    </span>
  )
}
