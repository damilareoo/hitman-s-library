// components/sign-in-sheet.tsx
//
// Sign in without leaving the library: a small sheet over the page. Google in
// one tap, or an email link. No passwords. It also reads the result of the
// round trip (?signedin=1 or ?signin=<error>) and tidies the address bar.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GoogleLogo, ArrowRight, X } from '@phosphor-icons/react'
import { ColourStrip } from '@/components/colour-strip'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { SIGN_IN_EVENT } from '@/lib/account-client'

const ERRORS: Record<string, string> = {
  expired: 'That link has expired. Send yourself a new one.',
  used: 'That link was already used. Send yourself a new one.',
  invalid: "That sign-in link didn't work. Try again.",
  unverified: 'Google needs a verified email to sign in.',
  unavailable: 'Google sign-in is not set up yet. Use your email.',
  failed: "Sign-in didn't finish. Try again.",
  cancelled: 'Google sign-in was cancelled.',
  'link-email': 'This email already has an account. Sign in with an email link once to connect Google.',
}

type Step = 'choose' | 'sending' | 'sent'

export function SignInSheet() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'join'>('signin')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      setMode((e as CustomEvent).detail?.mode === 'join' ? 'join' : 'signin')
      setNote(null)
      setStep('choose')
      setOpen(true)
    }
    window.addEventListener(SIGN_IN_EVENT, onOpen)
    // The round trip lands back here with a result in the query string.
    const url = new URL(window.location.href)
    const err = url.searchParams.get('signin')
    if (url.searchParams.has('signedin') || err) {
      if (err) { setNote(ERRORS[err] ?? ERRORS.failed); setOpen(true) }
      else setToast('Signed in')
      url.searchParams.delete('signin'); url.searchParams.delete('signedin')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    return () => window.removeEventListener(SIGN_IN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // Focus moves into the sheet, stays there while it's open, and goes back to
  // whatever opened it afterwards.
  const sheetRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const focusFirst = setTimeout(() => (inputRef.current ?? sheetRef.current?.querySelector<HTMLElement>('a,button'))?.focus({ preventScroll: true }), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setOpen(false)
      if (e.key !== 'Tab' || !sheetRef.current) return
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input')]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(focusFirst); window.removeEventListener('keydown', onKey); opener?.focus?.({ preventScroll: true }) }
  }, [open])

  const next = () => (typeof window === 'undefined' ? '/' : window.location.pathname + window.location.search)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setStep('sending'); setNote(null)
    const res = await fetch('/api/auth/email', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, next: next() }),
    }).catch(() => null)
    if (res?.ok) return setStep('sent')
    const error = res ? (await res.json().catch(() => ({}))).error : null
    setStep('choose')
    setNote(error === 'invalid-email' ? 'That email address looks off.' : error === 'rate-limited' ? 'A few too many links. Try again in a while.' : "Couldn't send the link. Try again.")
  }

  const label = 'text-[10.5px] font-[600] tracking-[0.14em] uppercase text-ink-4'

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="signin-scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[80] bg-background/60 backdrop-blur-[3px]"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-0 z-[81] flex items-end sm:items-center justify-center pointer-events-none sm:px-4">
              {/* A library card, blank until you sign in. */}
              <motion.div
                key="signin-sheet"
                ref={sheetRef}
                role="dialog" aria-modal="true" aria-labelledby="signin-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, transition: POP_OUT }} transition={POP_IN}
                className="pointer-events-auto relative w-full sm:max-w-[392px] bg-popover text-popover-foreground border border-edge-strong rounded-t-[22px] sm:rounded-[22px] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.4)] overflow-hidden"
              >
                <ColourStrip />

                <div className="pl-7 pr-5 pt-4 flex items-center justify-between">
                  <p className={label}>Member card</p>
                  <div className="flex items-center gap-3">
                    <p className="text-[12px] font-[600] tabular-nums tracking-[0.04em] text-[#E8A04A]" aria-label="No member number yet">No. ____</p>
                    <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-[9px] text-ink-4 hover:text-ink hover:bg-foreground/[0.05] transition-colors">
                      <X className="w-3.5 h-3.5" weight="bold" />
                    </button>
                  </div>
                </div>

                <div className="px-7 pt-5">
                  <h2 id="signin-title" className="text-[27px] font-[640] tracking-[-0.035em] leading-[1.02]">
                    {step === 'sent' ? 'Check your inbox.' : mode === 'join' ? 'Get your library card.' : 'Welcome back.'}
                  </h2>
                  <p className="mt-2.5 text-[14px] leading-[1.45] text-ink-3 max-w-[300px] text-pretty">
                    {step === 'sent'
                      ? <>A link is on its way to <span className="text-ink">{email}</span>. It works once, for 15 minutes.</>
                      : mode === 'join'
                        ? 'Keep your hearts and sets on every device. Free, no password.'
                        : 'Pick up your hearts and sets where you left them.'}
                  </p>
                  {note && step !== 'sent' && <p role="status" className="mt-3 text-[13px] leading-[1.45] text-[#c8382f] dark:text-[#ff8a80]">{note}</p>}
                </div>

                {step === 'sent' ? (
                  <div className="px-7 pt-7 pb-7">
                    <button className="text-[13.5px] text-ink-3 underline underline-offset-4 decoration-edge-strong hover:text-ink transition-colors" onClick={() => { setStep('choose'); setNote(null) }}>
                      Use a different email
                    </button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={sendLink} className="px-7 pt-6 pb-6">
                      <label htmlFor="signin-email" className="sr-only">Email</label>
                      <div className="flex items-center gap-3 border-b border-edge-strong focus-within:border-foreground transition-colors">
                        <input
                          id="signin-email" ref={inputRef} type="email" required autoComplete="email" inputMode="email"
                          value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com"
                          className="flex-1 min-w-0 h-11 bg-transparent outline-none text-[17px] tracking-[-0.01em] placeholder:text-ink-4"
                        />
                        <button
                          type="submit" disabled={step === 'sending'} aria-label="Email me a sign-in link"
                          className="shrink-0 w-9 h-9 -mr-1 grid place-items-center rounded-full bg-foreground text-background disabled:opacity-40 hover:opacity-90 active:scale-95 transition"
                        >
                          <ArrowRight className="w-4 h-4" weight="bold" />
                        </button>
                      </div>
                      <p className="mt-2.5 text-[12px] text-ink-4">
                        {step === 'sending' ? 'Sending your link…' : <>We email a link. No password. <a href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy</a></>}
                      </p>
                    </form>
                    <a
                      href={`/api/auth/google?next=${encodeURIComponent(next())}`}
                      className="flex items-center justify-between h-[54px] px-7 border-t border-edge text-[14px] font-[600] tracking-[-0.01em] text-ink hover:bg-foreground/[0.03] active:bg-foreground/[0.06] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]"
                    >
                      <span className="flex items-center gap-2.5"><GoogleLogo className="w-4 h-4" weight="bold" /> Continue with Google</span>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-3" weight="bold" />
                    </a>
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-5 inset-x-0 z-[82] flex justify-center pointer-events-none">
            <motion.div
              role="status"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}
              className="px-3.5 h-9 grid place-items-center rounded-[10px] bg-foreground text-background text-[13px] font-[600] tracking-[-0.01em]"
            >
              {toast}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
