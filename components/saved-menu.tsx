// components/saved-menu.tsx
//
// The way back to what you've kept: your hearts and each of your sets, one
// tap from the header (from the More menu on a phone). Works signed out too — hearts and sets live on this
// device until you sign in, and then everywhere.
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { BookmarkSimple, Heart, FolderSimple } from '@phosphor-icons/react'
import { MENU } from '@/lib/motion'
import { useCollections } from '@/lib/collections'
import { useAccount, openSignIn } from '@/lib/account-client'
import { useSavedCounts } from '@/components/account-button'
import { CARD } from '@/components/member-card'

/** Opens the menu from elsewhere (the phone header's More menu). */
export const OPEN_SAVED_EVENT = 'hl:open-saved'

const QUIET = "relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"

export function SavedMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const counts = useSavedCounts()
  const [collections] = useCollections()
  const { status } = useAccount()
  const sets = Object.entries(collections)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_SAVED_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_SAVED_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  const row = 'h-9 px-2.5 flex items-center justify-between gap-3 rounded-[10px] text-[13.5px] font-[500] text-ink hover:bg-foreground/[0.045] focus-visible:bg-foreground/[0.045] outline-none transition-colors'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open} aria-haspopup="menu" aria-label="Saved"
        className={QUIET + ' max-sm:hidden'}
      >
        <BookmarkSimple className="w-3.5 h-3.5" weight="bold" />
        <span>Saved</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            {...MENU}
            style={{ transformOrigin: 'top right' }}
            className={CARD.shell + ' absolute right-0 top-10 z-50 w-[264px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[60px] max-sm:w-auto shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            <div className={CARD.head}>
              <span>Saved</span>
              <span className="text-ink-4">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
            </div>
            <div className="p-1.5 max-h-[320px] overflow-auto">
              <Link href="/?saved=hearts" role="menuitem" onClick={() => setOpen(false)} className={row}>
                <span className="flex items-center gap-2.5"><Heart className="w-3.5 h-3.5 text-[var(--color-error)]" weight="fill" /> Hearts</span>
                <span className={CARD.kbd}>{counts.hearts}</span>
              </Link>
              {sets.length > 0 && <p className={CARD.label + ' px-2.5 pt-3 pb-1.5'}>Sets</p>}
              {sets.map(([name, ids]) => (
                <Link key={name} href={`/?collection=${encodeURIComponent(name)}`} role="menuitem" onClick={() => setOpen(false)} className={row}>
                  <span className="flex items-center gap-2.5 min-w-0"><FolderSimple className="w-3.5 h-3.5 shrink-0 text-ink-3" weight="bold" /><span className="truncate">{name}</span></span>
                  <span className={CARD.kbd}>{ids.length}</span>
                </Link>
              ))}
            </div>
            <div className={CARD.foot + ' px-4'}>
              {status === 'signed-out'
                ? <button className={CARD.footBtn + ' -ml-2'} onClick={() => { setOpen(false); openSignIn('join') }}>Sign in to keep these everywhere</button>
                : <span className={CARD.meta}>Add to a set with the bookmark on any site.</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
