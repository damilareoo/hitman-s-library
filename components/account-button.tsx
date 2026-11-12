// components/account-button.tsx
//
// The header's account entry. Signed out: a quiet "Sign in", in the same
// register as Digest and Submit (an icon on phones). Signed in: your photo —
// or your initial — opening a small card: who you are, your member slip,
// what you've saved, how you sign in, then the few things you can do.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SignIn, DownloadSimple, SignOut, Trash, Heart, Stack, GoogleLogo, EnvelopeSimple } from '@phosphor-icons/react'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { COLLECTIONS_EVENT } from '@/lib/collections'
import { useAccount, openSignIn, signOut, deleteAccount, FAVORITES_EVENT, type AccountUser } from '@/lib/account-client'

const QUIET = "relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"

function Avatar({ user, size }: { user: AccountUser; size: number }) {
  const [broken, setBroken] = useState(false)
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()
  if (user.avatar && !broken) {
    return (
      // Google photos refuse requests that carry a referrer.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="rounded-full object-cover shrink-0 ring-1 ring-foreground/10"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="rounded-full grid place-items-center shrink-0 bg-foreground text-background font-[640]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.43) }}
    >
      {initial}
    </span>
  )
}

/** What this device holds, live — the same numbers the account carries once synced. */
function useSavedCounts() {
  const read = () => {
    try {
      const hearts = JSON.parse(localStorage.getItem('hl:favorites') ?? '[]')
      const sets = JSON.parse(localStorage.getItem('hl:collections') ?? '{}')
      return { hearts: Array.isArray(hearts) ? hearts.length : 0, sets: sets && typeof sets === 'object' ? Object.keys(sets).length : 0 }
    } catch { return { hearts: 0, sets: 0 } }
  }
  const [counts, setCounts] = useState({ hearts: 0, sets: 0 })
  useEffect(() => {
    const update = () => setCounts(read())
    update()
    window.addEventListener(FAVORITES_EVENT, update)
    window.addEventListener(COLLECTIONS_EVENT, update)
    return () => { window.removeEventListener(FAVORITES_EVENT, update); window.removeEventListener(COLLECTIONS_EVENT, update) }
  }, [])
  return counts
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function AccountButton() {
  const { status, user } = useAccount()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [armedAt, setArmedAt] = useState(0)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const counts = useSavedCounts()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  if (status === 'loading') return <span className="w-[52px] max-sm:w-8" aria-hidden />
  if (status === 'signed-out' || !user) {
    return (
      <button onClick={() => openSignIn()} className={QUIET + ' max-sm:w-8 max-sm:h-8 max-sm:justify-center max-sm:mr-0'} aria-label="Sign in">
        <SignIn className="w-3.5 h-3.5 max-sm:w-4 max-sm:h-4" weight="bold" />
        {/* On a phone the header holds the view switcher; the icon carries it. */}
        <span className="max-sm:sr-only">Sign in</span>
      </button>
    )
  }

  const displayName = user.name || user.email.split('@')[0]
  const since = new Date(user.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const row = 'w-full flex items-center gap-3 h-11 px-4 text-[13.5px] tracking-[-0.005em] text-ink-2 hover:text-ink hover:bg-foreground/[0.04] active:bg-foreground/[0.07] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]'
  const label = 'text-[10.5px] font-[600] tracking-[0.12em] uppercase text-ink-4'

  return (
    <div ref={ref} className="relative mr-1">
      <button
        onClick={() => { setOpen(v => !v); setConfirming(false); setFailed(false) }}
        aria-expanded={open} aria-haspopup="menu" aria-label="Your account"
        className="rounded-full grid place-items-center transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A]"
      >
        <Avatar user={user} size={28} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: POP_OUT }} transition={POP_IN}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-10 z-50 w-[292px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[60px] max-sm:w-auto rounded-[18px] border border-edge-strong bg-popover text-popover-foreground shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)] overflow-hidden"
          >
            {/* Who */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3.5">
              <Avatar user={user} size={40} />
              <div className="min-w-0">
                <p className="text-[15px] font-[620] tracking-[-0.02em] text-ink truncate">{displayName}</p>
                <p className="text-[12.5px] text-ink-3 truncate">{user.email}</p>
              </div>
            </div>

            {/* The member slip */}
            <div className="mx-4 mb-3.5 grid grid-cols-2 rounded-[12px] border border-edge">
              <div className="px-3 py-2.5">
                <p className={label}>Member</p>
                <p className="mt-1 text-[14px] font-[620] tabular-nums text-[#E8A04A]">No. {String(user.memberNo).padStart(4, '0')}</p>
              </div>
              <div className="px-3 py-2.5 border-l border-edge">
                <p className={label}>Since</p>
                <p className="mt-1 text-[14px] font-[600] text-ink">{since}</p>
              </div>
            </div>

            {/* What's saved, and how you sign in */}
            <div className="px-4 pb-3.5 space-y-2 text-[12.5px] text-ink-3">
              <p className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5" weight="bold" />
                {plural(counts.hearts, 'heart', 'hearts')}
                <span className="text-ink-4">·</span>
                <Stack className="w-3.5 h-3.5" weight="bold" />
                {plural(counts.sets, 'set', 'sets')}
                <span className="text-ink-4">on every device</span>
              </p>
              <p className="flex items-center gap-2">
                {user.google
                  ? <><GoogleLogo className="w-3.5 h-3.5" weight="bold" /> Signs in with Google</>
                  : <><EnvelopeSimple className="w-3.5 h-3.5" weight="bold" /> Signs in with an email link</>}
              </p>
            </div>

            <div className="border-t border-edge py-1">
              <a href="/api/me/export" role="menuitem" className={row}><DownloadSimple className="w-4 h-4" weight="bold" /> Download my data</a>
              <button role="menuitem" className={row} onClick={() => { setOpen(false); void signOut() }}><SignOut className="w-4 h-4" weight="bold" /> Sign out</button>
            </div>

            <div className="border-t border-edge py-1">
              {confirming ? (
                <button
                  role="menuitem"
                  className={row + ' text-[#c8382f] dark:text-[#ff8a80] hover:text-[#c8382f] dark:hover:text-[#ff8a80]'}
                  onClick={async () => {
                    // A double-click must never delete: the confirm only arms after a beat.
                    if (Date.now() - armedAt < 600) return
                    if (await deleteAccount()) setOpen(false)
                    else setFailed(true)
                  }}
                >
                  <Trash className="w-4 h-4" weight="bold" />
                  {failed ? "Couldn't delete. Try again" : 'Delete everything — tap to confirm'}
                </button>
              ) : (
                <button role="menuitem" className={row + ' text-ink-3'} onClick={() => { setConfirming(true); setArmedAt(Date.now()); setFailed(false) }}>
                  <Trash className="w-4 h-4" weight="bold" /> Delete account
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
