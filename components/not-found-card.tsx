// components/not-found-card.tsx
//
// The 404, in the Pro card's language: the same shell, the same pixel mark
// (spelling 404 in real library colours), one line, two ways back. The header
// names the address that missed rather than repeating "404" beside a picture
// that already says it.
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react'
import { ProMark } from '@/components/pro-mark'
import { CARD, BTN, ICON } from '@/components/member-card'

/** `preview` (the design system page): a sample address, and ⌘K is left alone. */
export function NotFoundCard({ preview = false }: { preview?: boolean } = {}) {
  const pathname = usePathname()
  const path = preview ? '/sites/a-missing-page' : pathname
  const router = useRouter()

  // ⌘K and / mean search everywhere else on the site; here they lead to it.
  useEffect(() => {
    if (preview) return
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        router.push('/?browse=1')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, preview])

  return (
    <section className={CARD.shell + ' w-full max-w-[380px] shadow-[0_28px_70px_-28px_rgba(0,0,0,0.35)]'}>
      <div className={CARD.head}>
        <span>Not found</span>
        <span className="text-ink-4 truncate max-w-[60%]" title={path}>{path}</span>
      </div>

      <ProMark word="404" label="404, made of colours from the library" />
      <div className="px-4 pt-1 pb-4">
        <h1 className="text-[20px] font-[630] tracking-[-0.025em] leading-[1.2] text-ink text-balance">
          This page isn&apos;t in the library.
        </h1>
        <p className={CARD.body + ' mt-1 text-pretty'}>It may have moved, or the link has a typo.</p>
      </div>

      <div className={CARD.foot + ' pr-2'}>
        <Link href="/?browse=1" className={CARD.footBtn}>Search <span className={CARD.kbd}>⌘K</span></Link>
        <Link href="/" className={BTN.primary + ' ml-auto'}>
          Back to the library <ArrowRight className={ICON.inline} weight="bold" />
        </Link>
      </div>
    </section>
  )
}
