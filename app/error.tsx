"use client"

// The error page, in the same card as the 404: a quiet head carrying the error
// id, one line, and the two things you can do. No pixel mark here — a page that
// has just failed shouldn't go fetching colours.
import { useEffect } from "react"
import Link from "next/link"
import { ArrowCounterClockwise } from "@phosphor-icons/react"
import { trackException } from '@/lib/analytics'
import { CARD, BTN, ICON } from '@/components/member-card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    trackException(error)
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground px-4 pt-20 pb-32 flex flex-col items-center">
      <section role="alert" className={CARD.shell + ' w-full max-w-[380px] shadow-[0_28px_70px_-28px_rgba(0,0,0,0.35)]'}>
        <div className={CARD.head}>
          <span>Something went wrong</span>
          {error.digest && <span className="text-ink-4 truncate max-w-[50%]" title={`Error ID ${error.digest}`}>{error.digest}</span>}
        </div>
        <div className="px-4 pt-4 pb-4">
          <h1 className="text-[20px] font-[630] tracking-[-0.025em] leading-[1.2] text-ink text-balance">This page didn&apos;t load.</h1>
          <p className={CARD.body + ' mt-1 text-pretty'}>Try again, or head back to the library.</p>
        </div>
        <div className={CARD.foot + ' pr-2'}>
          <Link href="/" className={CARD.footBtn}>Back to the library</Link>
          <button onClick={reset} className={BTN.primary + ' ml-auto'}>
            <ArrowCounterClockwise className={ICON.inline} weight="bold" /> Try again
          </button>
        </div>
      </section>
    </div>
  )
}
