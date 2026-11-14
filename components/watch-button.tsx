// components/watch-button.tsx
// Watch a site for redesigns, beside Save in the panel header. Pro members
// toggle it (filled eye = watching). Anyone else gets a small card saying
// what it does and how to get it, rather than a dead button.
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { Eye } from '@phosphor-icons/react'
import { useAccount, setWatching, openSignIn } from '@/lib/account-client'
import { BTN, CARD } from '@/components/member-card'
import { MENU } from '@/lib/motion'

export function WatchButton({ siteId, siteName }: { siteId: number; siteName: string }) {
  const { status, pro, watching } = useAccount()
  const on = Boolean(watching?.includes(siteId))
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  const label = on ? `Watching ${siteName} for redesigns` : 'Watch for redesigns'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (pro ? void setWatching(siteId, !on) : setOpen(v => !v))}
        aria-pressed={pro ? on : undefined}
        aria-expanded={pro ? undefined : open}
        aria-label={label}
        title={on ? 'Watching: we’ll email you if it redesigns' : 'Watch for redesigns'}
        className={BTN.icon + (on ? ' !text-ink' : '')}
      >
        <Eye className="w-4 h-4" weight={on ? 'fill' : 'bold'} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog" aria-label="Watch for redesigns"
            {...MENU}
            style={{ transformOrigin: 'top right' }}
            className={CARD.shell + ' absolute right-0 top-10 z-[60] w-[280px] shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            <div className={CARD.head}>
              <span>Watch</span>
              <span className={CARD.proPill}>Pro</span>
            </div>
            <div className={CARD.pad + ' py-3.5'}>
              <p className={CARD.title}>Know when it redesigns</p>
              <p className={CARD.body + ' mt-1'}>We re-check watched sites every week and email you a before and after: capture, colours and type.</p>
            </div>
            <div className={CARD.foot + ' justify-end'}>
              {status === 'signed-in'
                ? <Link href="/pro" className={BTN.primary}>Get Pro</Link>
                : <button onClick={() => { setOpen(false); openSignIn('join') }} className={BTN.primary}>Join to watch</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
