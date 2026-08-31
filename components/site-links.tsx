'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PAGES = [
  { href: '/', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Changelog' },
]

interface SiteLinksProps {
  /** The mobile detail sheet covers this corner; nothing behind it is reachable. */
  hidden?: boolean
}

/**
 * The site's own pages, in the bottom-left corner of the window.
 *
 * Not in the sidebar list and not in a menu: pinned to the corner with air
 * above it, so it reads as page furniture rather than another filter or a
 * thing you have to open. Always visible, nothing to discover.
 *
 * Lists the pages you are not on. The mark goes home too, but naming Gallery
 * here means the row always answers "where else can I go" without you having
 * to know the logo is a link.
 */
export function SiteLinks({ hidden = false }: SiteLinksProps) {
  const pathname = usePathname()
  const elsewhere = PAGES.filter(page => page.href !== pathname)

  return (
    <nav
      aria-label="Site"
      data-hidden={hidden || undefined}
      className={[
        'fixed bottom-0 left-0 z-30 flex items-center gap-4',
        'pl-5 pr-4 py-4 xl:pl-6',
        // On a phone this floats over cards rather than over a sidebar, so it
        // carries just enough ground to stay readable against a screenshot.
        'bg-background/85 backdrop-blur-sm rounded-tr-[12px]',
        'border-t border-r border-edge xl:border-r-0 xl:rounded-tr-none xl:w-[calc((100%/12)*2)]',
        'transition-opacity duration-[var(--dur-2)] ease-[var(--ease-sig)]',
        'data-[hidden]:opacity-0 data-[hidden]:pointer-events-none',
      ].join(' ')}
    >
      {elsewhere.map(page => (
        <Link
          key={page.href}
          href={page.href}
          className="relative text-meta text-ink-4 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[3px] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
        >
          {page.label}
        </Link>
      ))}
    </nav>
  )
}
