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
import { POP_IN, POP_OUT } from '@/lib/motion'
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

  const row = CARD.action + ' ' + CARD.pad + ' w-full justify-between font-[500]'

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
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: POP_OUT }} transition={POP_IN}
            style={{ transformOrigin: 'top right' }}
            className={CARD.shell + ' absolute right-0 top-10 z-50 w-[264px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[60px] max-sm:w-auto shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            <div className={CARD.pad + ' h-10 flex items-center'}><p className={CARD.label}>Saved</p></div>
            <Link href="/?saved=hearts" role="menuitem" onClick={() => setOpen(false)} className={row}>
              <span className="flex items-center gap-2"><Heart className="w-3.5 h-3.5 text-[var(--color-error)]" weight="fill" /> Hearts</span>
              <span className="text-ink-4 font-[500]">{counts.hearts}</span>
            </Link>
            {sets.length > 0 && (
              <div className="border-t border-edge-faint max-h-[280px] overflow-auto">
                {sets.map(([name, ids]) => (
                  <Link key={name} href={`/?collection=${encodeURIComponent(name)}`} role="menuitem" onClick={() => setOpen(false)} className={row}>
                    <span className="flex items-center gap-2 min-w-0"><FolderSimple className="w-3.5 h-3.5 shrink-0 text-ink-3" weight="bold" /><span className="truncate">{name}</span></span>
                    <span className="text-ink-4 font-[500]">{ids.length}</span>
                  </Link>
                ))}
              </div>
            )}
            <p className={CARD.pad + ' ' + CARD.meta + ' py-3 border-t border-edge-faint'}>
              {sets.length === 0 ? 'Save a site to a set from its panel, using the bookmark.' : 'Add to a set from any site, using the bookmark.'}
              {status === 'signed-out' && <> <button className="underline underline-offset-2 hover:text-ink" onClick={() => { setOpen(false); openSignIn('join') }}>Sign in</button> to keep these on every device.</>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
