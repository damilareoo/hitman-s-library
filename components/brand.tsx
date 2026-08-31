'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretDown, Check, Copy, DownloadSimple } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Mark } from '@/components/mark'
import { copyMarkSvg, downloadMarkSvg } from '@/lib/mark-assets'
import { useSoundsContext } from '@/contexts/sounds-context'

const PAGES = [
  { href: '/', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Changelog' },
]

/**
 * The mark, and the site's own pages hung beside it.
 *
 * The mark goes home; the chevron opens everywhere else. Splitting the two
 * means the logo still does the one thing a logo is expected to do — reaching
 * the front page in a single click — while the rest of the site hangs off the
 * only piece of chrome already about the site as a whole.
 *
 * The same at every breakpoint, so nothing relocates as the window narrows.
 */
export function Brand() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { playCopy } = useSoundsContext()

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

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

  // Always the places you are not. Listing the page you are already on gives
  // the menu a dead row and makes you read three things to find the two that
  // go anywhere.
  const elsewhere = PAGES.filter(page => page.href !== pathname)

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1.5 shrink-0">
      <Link
        href="/"
        // Right-clicking a logo to take it is the established gesture, so it
        // opens this menu rather than the browser's.
        onContextMenu={e => { e.preventDefault(); setOpen(true) }}
        aria-label="Hitman's Library, home"
        title="Hitman's Library"
        className="relative flex items-center justify-center w-8 h-8 rounded-[8px] text-foreground hover:bg-muted/60 active:scale-[0.98] transition-[background-color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      >
        <Mark className="w-6 h-6 shrink-0" />
      </Link>

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Site pages"
        className="relative w-6 h-6 flex items-center justify-center rounded-[6px] text-ink-4 hover:text-ink hover:bg-muted/60 active:scale-[0.98] transition-[background-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-9 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      >
        <CaretDown
          className={`w-3 h-3 transition-transform duration-[var(--dur-2)] ease-[var(--ease-sig)] ${open ? 'rotate-180' : ''}`}
          weight="bold"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[160px] rounded-[10px] border border-edge-strong bg-card p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
        >
          {elsewhere.map(page => (
            <Link
              key={page.href}
              href={page.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-2.5 py-2 rounded-[7px] text-bodytext text-ink-2 hover:text-ink hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25"
            >
              {page.label}
            </Link>
          ))}

          <div className="my-1 h-px bg-edge" role="separator" />

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
