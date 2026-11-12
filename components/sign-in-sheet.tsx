// components/sign-in-sheet.tsx
//
// Sign in without leaving the library: a small sheet over the page. Google in
// one tap, or an email link. No passwords. It also reads the result of the
// round trip (?signedin=1 or ?signin=<error>) and tidies the address bar.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GoogleLogo, EnvelopeSimple, ArrowRight, X } from '@phosphor-icons/react'
import { POP_IN, POP_OUT } from '@/lib/motion'
import { SIGN_IN_EVENT } from '@/lib/account-client'

const ERRORS: Record<string, string> = {
  expired: 'That link has expired. Send yourself a new one.',
  used: 'That link was already used. Send yourself a new one.',
  invalid: "That sign-in link didn't work. Try again.",
  unverified: 'Google needs a verified email to sign in.',
  unavailable: 'Google sign-in is not set up yet. Use your email.',
  failed: "Sign-in didn't finish. Try again.",
}

type Step = 'choose' | 'sending' | 'sent'

export function SignInSheet() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      setNote((e as CustomEvent).detail?.reason ?? null)
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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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

  const row = 'w-full flex items-center justify-between gap-3 h-[52px] px-5 text-[14px] tracking-[-0.01em] transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]'

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
                onAnimationComplete={() => { if (step === 'choose') inputRef.current?.focus({ preventScroll: true }) }}
                className="pointer-events-auto w-full sm:max-w-[380px] bg-popover text-popover-foreground border border-edge-strong rounded-t-[20px] sm:rounded-[20px] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden"
              >
                <div className="relative px-5 pt-5 pb-4">
                  <h2 id="signin-title" className="text-[22px] font-[620] tracking-[-0.03em] leading-none">
                    {step === 'sent' ? 'Check your inbox.' : 'Sign in.'}
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.45] text-ink-3">
                    {step === 'sent'
                      ? <>A link is on its way to <span className="text-ink">{email}</span>. It works once, for 15 minutes.</>
                      : 'Keep your saves on every device. No password.'}
                  </p>
                  {note && step !== 'sent' && <p role="status" className="mt-3 text-[13px] leading-[1.45] text-[#c8382f] dark:text-[#ff8a80]">{note}</p>}
                  <button onClick={() => setOpen(false)} aria-label="Close" className="absolute top-3.5 right-3.5 w-8 h-8 grid place-items-center rounded-[9px] text-ink-3 hover:text-ink hover:bg-foreground/[0.05] transition-colors">
                    <X className="w-3.5 h-3.5" weight="bold" />
                  </button>
                </div>

                {step === 'sent' ? (
                  <div className="border-t border-edge">
                    <button className={row + ' text-ink-3'} onClick={() => { setStep('choose'); setNote(null) }}>
                      Use a different email <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="border-t border-edge">
                      <a href={`/api/auth/google?next=${encodeURIComponent(next())}`} className={row + ' font-[620] text-ink'}>
                        Continue with Google <GoogleLogo className="w-4 h-4" weight="bold" />
                      </a>
                    </div>
                    <form onSubmit={sendLink} className="border-t border-edge">
                      <label className="flex items-center gap-3 h-[52px] px-5">
                        <EnvelopeSimple className="w-4 h-4 text-ink-3 shrink-0" weight="bold" />
                        <span className="sr-only">Email</span>
                        <input
                          ref={inputRef} type="email" required autoComplete="email" inputMode="email"
                          value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com"
                          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] tracking-[-0.005em] placeholder:text-ink-4"
                        />
                      </label>
                      <button type="submit" disabled={step === 'sending'} className={row + ' border-t border-edge font-[620] text-ink disabled:text-ink-4'}>
                        {step === 'sending' ? 'Sending…' : 'Email me a link'} <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                      </button>
                    </form>
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
