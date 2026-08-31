'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Mark } from '@/components/mark'

const PAGES = [
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Changelog' },
]

interface BrandProps {
  /** The gallery's wordmark is that page's h1; elsewhere it is just chrome. */
  asHeading?: boolean
}

/**
 * Mark, wordmark, and the site's own pages, as one lockup.
 *
 * The mark and the name go home; the chevron beside them opens About and
 * Changelog. Splitting the two means the logo still does the one thing a logo
 * is expected to do — reaching the front page in a single click — while the
 * pages that describe the library hang off the only piece of chrome that is
 * already about the library as a whole.
 *
 * The same at every breakpoint, so nothing relocates as the window narrows.
 */
export function Brand({ asHeading = false }: BrandProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement>(null)

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

  const Wordmark = asHeading ? 'h1' : 'span'

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1.5 shrink-0">
      <Link
        href="/"
        aria-label="Hitman's Library, home"
        className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[6px]"
      >
        <Mark className="w-[18px] h-[18px] text-foreground shrink-0" />
        <Wordmark className="text-[15px] font-semibold tracking-[-0.04em] text-foreground select-none whitespace-nowrap">
          Hitman<span className="font-light opacity-50">&apos;s</span> Library
        </Wordmark>
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
          {PAGES.map(page => {
            const current = pathname === page.href
            return (
              <Link
                key={page.href}
                href={page.href}
                role="menuitem"
                aria-current={current ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center justify-between gap-3 px-2.5 py-2 rounded-[7px] text-bodytext transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25',
                  current ? 'text-ink bg-muted' : 'text-ink-2 hover:text-ink hover:bg-muted',
                ].join(' ')}
              >
                {page.label}
                {current && <span className="text-micro text-ink-4">Here</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
