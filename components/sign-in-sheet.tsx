// components/sign-in-sheet.tsx
//
// Sign in without leaving the library: a small sheet over the page. Google in
// one tap, or an email link. No passwords. It also reads the result of the
// round trip (?signedin=1 or ?signin=<error>) and tidies the address bar.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GoogleLogo, ArrowRight, X } from '@phosphor-icons/react'
import { LibraryMosaic } from '@/components/library-mosaic'
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

  const stub = 'flex-1 flex items-center justify-center gap-2 h-[52px] text-[14px] tracking-[-0.01em] transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]'
  const field = 'w-full h-11 rounded-[12px] border border-edge-strong bg-transparent text-[15px] tracking-[-0.005em] transition-colors'

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="signin-scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[80] bg-background/55 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-0 z-[81] flex items-end sm:items-center justify-center pointer-events-none sm:px-4">
              <motion.div
                key="signin-sheet"
                role="dialog" aria-modal="true" aria-labelledby="signin-title"
                initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, transition: POP_OUT }} transition={POP_IN}
                ref={sheetRef}
                className="pointer-events-auto relative w-full sm:max-w-[400px] bg-popover text-popover-foreground border border-edge-strong rounded-t-[22px] sm:rounded-[22px] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden"
              >
                <button onClick={() => setOpen(false)} aria-label="Close" className="absolute top-3.5 right-3.5 z-10 w-8 h-8 grid place-items-center rounded-[9px] text-ink-3 hover:text-ink hover:bg-foreground/[0.05] transition-colors">
                  <X className="w-3.5 h-3.5" weight="bold" />
                </button>

                {/* The mark, in the newest sites' colours. */}
                <div className="flex justify-center pt-9 pb-6">
                  <LibraryMosaic />
                </div>

                <div className="px-7 pb-6 text-center">
                  <h2 id="signin-title" className="text-[21px] font-[620] tracking-[-0.03em] leading-tight">
                    {step === 'sent' ? 'Check your inbox' : mode === 'join' ? "Join Hitman's Library" : "Sign in to Hitman's Library"}
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.45] text-ink-3 text-balance">
                    {step === 'sent'
                      ? <>A link is on its way to <span className="text-ink">{email}</span>. It works once, for 15 minutes.</>
                      : mode === 'join'
                        ? 'Keep your hearts and sets on every device. Free, and no password.'
                        : 'Pick up your hearts and sets where you left them.'}
                  </p>
                  {note && step !== 'sent' && <p role="status" className="mt-3 text-[13px] leading-[1.45] text-[#c8382f] dark:text-[#ff8a80]">{note}</p>}
                </div>

                {step === 'sent' ? (
                  <div className="flex border-t border-edge">
                    <button className={stub + ' text-ink-3'} onClick={() => { setStep('choose'); setNote(null) }}>Use a different email</button>
                    <span className="w-px bg-edge" aria-hidden />
                    <button className={stub + ' font-[620] text-ink'} onClick={() => setOpen(false)}>Done</button>
                  </div>
                ) : (
                  <form onSubmit={sendLink}>
                    <div className="px-7 pb-6 space-y-4">
                      <a href={`/api/auth/google?next=${encodeURIComponent(next())}`} className={field + ' flex items-center justify-center gap-2.5 font-[600] text-ink hover:bg-foreground/[0.03] active:bg-foreground/[0.06]'}>
                        <GoogleLogo className="w-4 h-4" weight="bold" /> Continue with Google
                      </a>
                      <div className="flex items-center gap-3 text-[12px] text-ink-4" aria-hidden>
                        <span className="flex-1 h-px bg-edge" />or use email<span className="flex-1 h-px bg-edge" />
                      </div>
                      <label className="block">
                        <span className="sr-only">Email</span>
                        <input
                          ref={inputRef} type="email" required autoComplete="email" inputMode="email"
                          value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com"
                          className={field + ' px-3.5 outline-none placeholder:text-ink-4 focus:border-foreground/40'}
                        />
                      </label>
                    </div>
                    <div className="flex border-t border-edge">
                      <button type="button" className={stub + ' text-ink-3'} onClick={() => setOpen(false)}>Cancel</button>
                      <span className="w-px bg-edge" aria-hidden />
                      <button type="submit" disabled={step === 'sending'} className={stub + ' font-[620] text-ink disabled:text-ink-4'}>
                        {step === 'sending' ? 'Sending…' : <>Email me a link <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>}
                      </button>
                    </div>
                  </form>
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
