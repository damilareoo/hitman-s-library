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
import { ProMark } from '@/components/pro-mark'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { COLLECTIONS_EVENT } from '@/lib/collections'
import { useAccount, openSignIn, signOut, FAVORITES_EVENT, type AccountUser } from '@/lib/account-client'

const QUIET = "relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"

function Avatar({ user, size, pro = false }: { user: AccountUser; size: number; pro?: boolean }) {
  const [broken, setBroken] = useState(false)
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()
  if (user.avatar && !broken) {
    return (
      // Google photos refuse requests that carry a referrer.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={'rounded-full object-cover shrink-0 ' + (pro ? 'ring-2 ring-[#E8A04A] ring-offset-2 ring-offset-popover' : 'ring-1 ring-foreground/10')}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={'rounded-full grid place-items-center shrink-0 bg-foreground text-background font-[640] ' + (pro ? 'ring-2 ring-[#E8A04A] ring-offset-2 ring-offset-popover' : '')}
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


export function AccountButton() {
  const { status, user, pro, kits } = useAccount()
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
        <Avatar user={user} size={28} pro={pro} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: POP_OUT }} transition={POP_IN}
            style={{ transformOrigin: 'top right' }}
            className={CARD.shell + ' absolute right-0 top-10 z-50 w-[300px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[60px] max-sm:w-auto shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            <div className={CARD.head}>
              <span>Member since {since}</span>
              <span className="text-ink-4">No. {String(user.memberNo).padStart(4, '0')}</span>
            </div>

            <div className="px-4 pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Avatar user={user} size={40} />
                <div className="min-w-0 flex-1">
                  <p className={CARD.title + ' truncate'}>{displayName}</p>
                  <p className={CARD.meta + ' mt-0.5 flex items-center gap-1.5 min-w-0'} title={user.google ? 'Signs in with Google' : 'Signs in with an email link'}>
                    {user.google ? <GoogleMark size={11} /> : <EnvelopeSimple className="w-3 h-3 shrink-0" weight="bold" />}
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>
              </div>

              {/* The plate: your colours on the left (the word Pro for members),
                  what you have on the right. */}
              <div className="mt-4 flex items-stretch rounded-[12px] ring-1 ring-inset ring-edge bg-foreground/[0.02] overflow-hidden">
                <div className="w-[128px] shrink-0 grid place-items-center px-3 py-3 border-r border-edge">
                  {pro ? <ProMark ids={heartIds} height={36} /> : <ColourStrip ids={heartIds} className="rounded-[3px]" />}
                </div>
                <dl className="flex-1 min-w-0 px-3 py-2.5 space-y-1 text-[12.5px]">
                  <div className="flex justify-between gap-2"><dt className="text-ink-4">Hearts</dt><dd className="font-[600] text-ink">{counts.hearts}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-ink-4">Sets</dt><dd className="font-[600] text-ink">{counts.sets}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-ink-4">Kits</dt><dd className={'font-[600] ' + (pro ? 'text-[#A8611A] dark:text-[#F0B36A]' : 'text-ink')}>{pro ? 'Unlimited' : `${Math.max(0, (kits?.limit ?? 3) - (kits?.used ?? 0))} of ${kits?.limit ?? 3} left`}</dd></div>
                </dl>
              </div>
            </div>

            <div className={CARD.foot}>
              <a href="/api/me/export" role="menuitem" className={CARD.footBtn}><DownloadSimple className="w-3.5 h-3.5" weight="bold" /> Your data</a>
              <button role="menuitem" className={CARD.footBtn} onClick={() => { setOpen(false); void signOut() }}><SignOut className="w-3.5 h-3.5" weight="bold" /> Sign out</button>
              <a href="/pro" role="menuitem" className={CARD.footBtn + ' ml-auto ' + (pro ? '' : 'text-ink font-[600]')}>{pro ? 'Manage' : 'Go Pro'}</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
