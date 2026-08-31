'use client'

import Link from 'next/link'
import { Check, Copy, DownloadSimple } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Mark } from '@/components/mark'
import { copyMarkSvg, downloadMarkSvg } from '@/lib/mark-assets'
import { useSoundsContext } from '@/contexts/sounds-context'

/**
 * The mark. It goes home, and it hands itself over.
 *
 * There is no visible menu on it — the site's pages live in the corner of the
 * window now. What is left is the gesture people already use to take a logo:
 * right-click, or a long press, which is the same gesture on a touchscreen.
 */
export function Brand() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { playCopy } = useSoundsContext()

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }, [])

  // A long press is right-click on a touchscreen. Without it the only way to
  // take the mark would be one no phone has.
  function startPress() {
    pressTimer.current = setTimeout(() => setOpen(true), 500)
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  async function onCopy() {
    if (!(await copyMarkSvg())) return
    playCopy()
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1.5 shrink-0">
      <Link
        href="/"
        // Right-clicking a logo to take it is the established gesture, so it
        // opens this menu rather than the browser's.
        onContextMenu={e => { e.preventDefault(); setOpen(true) }}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onTouchCancel={cancelPress}
        aria-label="Hitman's Library, home"
        title="Hitman's Library"
        className="relative flex items-center justify-center w-8 h-8 rounded-[8px] text-foreground hover:bg-muted/60 active:scale-[0.98] transition-[background-color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      >
        <Mark className="w-6 h-6 shrink-0" />
      </Link>


      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[160px] rounded-[10px] border border-edge-strong bg-card p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
        >

          <button
            type="button"
            role="menuitem"
            onClick={onCopy}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-bodytext text-ink-2 hover:text-ink hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 shrink-0" weight="bold" /> Copied</>
              : <><Copy className="w-3.5 h-3.5 shrink-0" weight="regular" /> Copy logo</>}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => { downloadMarkSvg(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-bodytext text-ink-2 hover:text-ink hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25"
          >
            <DownloadSimple className="w-3.5 h-3.5 shrink-0" weight="regular" />
            Download SVG
          </button>
        </div>
      )}
    </div>
  )
}
