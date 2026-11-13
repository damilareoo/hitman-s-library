// components/account-button.tsx
//
// The header's account entry. Signed out: a quiet "Sign in", in the same
// register as Digest and Submit (an icon on phones). Signed in: your photo —
// or your initial — opening a small card: who you are, your member slip,
// what you've saved, how you sign in, then the two things you can do.
// Deleting the account lives on the privacy page: rare, final, and not a
// menu item.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SignIn, DownloadSimple, SignOut, EnvelopeSimple } from '@phosphor-icons/react'
import { GoogleMark } from '@/components/google-mark'
import { CARD } from '@/components/member-card'
import { ColourStrip } from '@/components/colour-strip'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { COLLECTIONS_EVENT } from '@/lib/collections'
import { useAccount, openSignIn, signOut, FAVORITES_EVENT, type AccountUser } from '@/lib/account-client'

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
export function useSavedCounts() {
  const read = () => {
    try {
      const hearts = JSON.parse(localStorage.getItem('hl:favorites') ?? '[]')
      const sets = JSON.parse(localStorage.getItem('hl:collections') ?? '{}')
      const ids = Array.isArray(hearts) ? hearts.map(Number).filter(Number.isFinite) : []
      return { hearts: ids.length, sets: sets && typeof sets === 'object' ? Object.keys(sets).length : 0, ids }
    } catch { return { hearts: 0, sets: 0, ids: [] as number[] } }
  }
  const [counts, setCounts] = useState({ hearts: 0, sets: 0, ids: [] as number[] })
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
  const { status, user, pro } = useAccount()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const counts = useSavedCounts()
  const heartIds = counts.ids.length ? counts.ids.slice(-40) : undefined

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

  return (
    <div ref={ref} className="relative mr-1">
      <button
        onClick={() => setOpen(v => !v)}
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
            className={CARD.shell + ' absolute right-0 top-10 z-50 w-[284px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[60px] max-sm:w-auto shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            {/* Your card: the strip is in the colours of the sites you've hearted. */}
            <ColourStrip ids={heartIds} />
            <div className={CARD.pad + ' h-10 flex items-center justify-between'}>
              <p className={CARD.label}>Member card</p>
              <p className={CARD.number}>No. {String(user.memberNo).padStart(4, '0')}</p>
            </div>
            <div className={CARD.pad + ' pt-0.5 pb-3 flex items-center gap-3'}>
              <Avatar user={user} size={40} />
              <div className="min-w-0">
                <p className="text-[16px] font-[640] tracking-[-0.02em] leading-tight text-ink truncate">{displayName}</p>
                <p className={CARD.meta + ' mt-0.5 flex items-center gap-1.5 min-w-0'} title={user.google ? 'Signs in with Google' : 'Signs in with an email link'}>
                  {user.google ? <GoogleMark size={11} /> : <EnvelopeSimple className="w-3 h-3 shrink-0" weight="bold" />}
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>
            <p className={CARD.pad + ' ' + CARD.body + ' pb-3'}>
              {plural(counts.hearts, 'heart', 'hearts')} · {plural(counts.sets, 'set', 'sets')} · since {since}
            </p>

            <a href="/pro" role="menuitem" className={CARD.action + ' ' + CARD.pad + ' justify-between border-t border-edge font-[500]'}>
              {pro ? <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#E8A04A]" /> Pro</span> : <span>Go Pro <span className="text-ink-4 font-[500]">· unlimited kits</span></span>}
              <span className="text-ink-4 text-[12px] font-[500]">{pro ? 'Manage' : '→'}</span>
            </a>
            <div className="grid grid-cols-2 border-t border-edge">
              <a href="/api/me/export" role="menuitem" className={CARD.action + ' justify-center'}><DownloadSimple className="w-3.5 h-3.5" weight="bold" /> Your data</a>
              <button role="menuitem" className={CARD.action + ' justify-center border-l border-edge'} onClick={() => { setOpen(false); void signOut() }}><SignOut className="w-3.5 h-3.5" weight="bold" /> Sign out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
