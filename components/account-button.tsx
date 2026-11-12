// components/account-button.tsx
//
// The header's account entry. Signed out: a quiet "Sign in", in the same
// register as Digest and Submit. Signed in: your initial, opening a small menu
// with your member number, a data export, sign out and delete.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SignIn, DownloadSimple, SignOut, Trash } from '@phosphor-icons/react'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { useAccount, openSignIn, signOut, deleteAccount } from '@/lib/account-client'

const QUIET = "relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"

export function AccountButton() {
  const { status, user } = useAccount()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [armedAt, setArmedAt] = useState(0)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  if (status === 'loading') return <span className="w-[52px]" aria-hidden />
  if (status === 'signed-out' || !user) {
    return (
      <button onClick={() => openSignIn()} className={QUIET + ' max-sm:w-8 max-sm:h-8 max-sm:justify-center max-sm:mr-0'} aria-label="Sign in">
        <SignIn className="w-3.5 h-3.5 max-sm:w-4 max-sm:h-4" weight="bold" />
        {/* On a phone the header holds the view switcher; the icon carries it. */}
        <span className="max-sm:sr-only">Sign in</span>
      </button>
    )
  }

  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()
  const item = 'w-full flex items-center justify-between gap-3 h-10 px-3.5 text-[13px] text-ink-2 hover:text-ink hover:bg-foreground/[0.04] transition-colors'

  return (
    <div ref={ref} className="relative mr-1">
      <button
        onClick={() => { setOpen(v => !v); setConfirming(false) }}
        aria-expanded={open} aria-haspopup="menu" aria-label="Your account"
        className="w-7 h-7 rounded-full grid place-items-center text-[12px] font-[640] bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        {initial}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: POP_OUT }} transition={POP_IN}
            className="absolute right-0 top-9 z-50 w-[248px] rounded-[14px] border border-edge-strong bg-popover text-popover-foreground shadow-[0_18px_48px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            <div className="px-3.5 py-3">
              <p className="text-[13px] text-ink truncate">{user.email}</p>
              <p className="mt-1 text-[11px] tracking-[0.08em] uppercase text-ink-3 tabular-nums">Member <span className="text-[#E8A04A] font-[600]">No. {String(user.memberNo).padStart(4, '0')}</span></p>
            </div>
            <div className="border-t border-edge">
              <a href="/api/me/export" className={item}>Download my data <DownloadSimple className="w-3.5 h-3.5" weight="bold" /></a>
              <button className={item} onClick={() => { setOpen(false); void signOut() }}>Sign out <SignOut className="w-3.5 h-3.5" weight="bold" /></button>
            </div>
            <div className="border-t border-edge">
              {confirming ? (
                <button
                  className={item + ' text-[#c8382f] dark:text-[#ff8a80] hover:text-[#c8382f]'}
                  onClick={async () => {
                    // A double-click must never delete: the confirm only arms after a beat.
                    if (Date.now() - armedAt < 600) return
                    if (await deleteAccount()) setOpen(false)
                    else setFailed(true)
                  }}
                >
                  {failed ? "Couldn't delete. Try again" : 'Delete for good — tap again'} <Trash className="w-3.5 h-3.5" weight="bold" />
                </button>
              ) : (
                <button className={item} onClick={() => { setConfirming(true); setArmedAt(Date.now()); setFailed(false) }}>Delete account <Trash className="w-3.5 h-3.5" weight="bold" /></button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
