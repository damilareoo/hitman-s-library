'use client'

import Link from 'next/link'
import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

const PAGES = [
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Changelog' },
]

/**
 * The site's own pages, hung off the wordmark.
 *
 * These describe the library rather than filter it, so they belong with the
 * name of the thing and not in the bar that narrows the grid — a destination
 * sitting among sort options reads as a sort option.
 *
 * Above sm there is room to simply show them. Below it there is not, so they
 * collapse behind the wordmark, which is the one piece of chrome that is
 * already about the site as a whole.
 */
export function SiteNavMenu() {
  const [open, setOpen] = useState(false)
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

  return (
    <>
      {/* Room to show them: show them. */}
      <nav className="hidden sm:flex items-center gap-4 shrink-0" aria-label="Site">
        {PAGES.map(page => (
          <Link
            key={page.href}
            href={page.href}
            className="relative text-meta text-ink-3 hover:text-ink transition-colors after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
          >
            {page.label}
          </Link>
        ))}
      </nav>

      {/* No room: the wordmark carries them. */}
      <div ref={wrapRef} className="relative sm:hidden shrink-0 -ml-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Site pages"
          className="relative w-8 h-8 flex items-center justify-center rounded-[8px] text-ink-3 hover:text-ink hover:bg-muted/60 active:scale-[0.98] transition-[background-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
        >
          <CaretDown
            className={`w-3 h-3 transition-transform duration-[var(--dur-2)] ease-[var(--ease-sig)] ${open ? 'rotate-180' : ''}`}
            weight="bold"
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[150px] rounded-[10px] border border-edge-strong bg-card p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
          >
            {PAGES.map(page => (
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
          </div>
        )}
      </div>
    </>
  )
}
