// components/pro-card.tsx
//
// The Pro offer: one card in the member-card language. One price for
// everyone, shown by Paddle in your currency where it can, a Monthly/Yearly
// switch, and one action. Checkout is a transaction our server
// made for your account; Paddle's overlay takes the payment.
'use client'

import { useEffect, useState } from 'react'
import { MagnifyingGlass, ArrowUp, ArrowRight, PlugsConnected, Eye, TrendUp } from '@phosphor-icons/react'
import { ProMark } from '@/components/pro-mark'
import { CARD, BTN } from '@/components/member-card'
import { useAccount, openSignIn, ACCOUNT_EVENT } from '@/lib/account-client'
import { loadPaddle, localPrices, onPaddleEvent, setPaddleCustomer, type LocalPrices } from '@/lib/paddle/client'
import { DEFAULT_INTERVAL } from '@/data/price-groups'
import { track } from '@/lib/analytics'

const FEATURES = [
  { Icon: MagnifyingGlass, text: 'Search by palette, font and contrast' },
  { Icon: PlugsConnected, text: 'The library inside Claude, Cursor and more' },
  { Icon: Eye, text: 'Redesign alerts, and every site’s history' },
  { Icon: TrendUp, text: 'Monthly trends: type and colour on the rise' },
  { Icon: ArrowUp, text: 'Your site requests reviewed first' },
]

type Phase = 'idle' | 'opening' | 'finishing' | 'failed'

export function ProCard() {
  const { status, pro, paddleCustomerId } = useAccount()
  useEffect(() => { setPaddleCustomer(paddleCustomerId) }, [paddleCustomerId])
  const [prices, setPrices] = useState<LocalPrices | null>(null)
  const [interval, setInterval_] = useState<'month' | 'year'>(DEFAULT_INTERVAL)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    track('pricing_viewed')
    localPrices().then(setPrices).catch(() => setPrices(null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After payment, wait for the webhook to land, then the account says Pro.
  useEffect(() => onPaddleEvent(name => {
    if (name === 'checkout.completed') {
      setPhase('finishing')
      track('upgraded')
      let tries = 0
      const t = window.setInterval(() => {
        window.dispatchEvent(new Event(ACCOUNT_EVENT))
        if (++tries > 15) window.clearInterval(t)
      }, 1500)
    }
    if (name === 'checkout.closed') setPhase(p => (p === 'opening' ? 'idle' : p))
  }), [])

  async function getPro() {
    if (status !== 'signed-in') return openSignIn('join')
    setPhase('opening')
    track('checkout_opened', { interval })
    try {
      const [P, res] = await Promise.all([
        loadPaddle(),
        fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ interval }) }),
      ])
      // A subscription that's past due: fix the card in Paddle, don't buy twice.
      if (res.status === 409) { setPhase('idle'); return manage() }
      if (!res.ok) throw new Error(String(res.status))
      const { transactionId, email } = await res.json()
      P.Checkout.open({
        transactionId,
        customer: { email },
        settings: { displayMode: 'overlay', theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light', allowLogout: false },
      })
    } catch {
      setPhase('failed')
    }
  }

  async function manage() {
    const res = await fetch('/api/billing/portal', { method: 'POST' }).catch(() => null)
    const body = res?.ok ? await res.json() : null
    if (body?.url) window.location.href = body.url
  }

  const save = prices && prices.monthCents > 0 ? Math.round((1 - prices.yearCents / (prices.monthCents * 12)) * 100) : 20
  const price = prices ? (interval === 'month' ? prices.month : prices.year) : null

  return (
    <div className="w-full max-w-[380px]">
      <section className={CARD.shell + ' shadow-[0_28px_70px_-28px_rgba(0,0,0,0.35)]'}>
        <div className={CARD.head}>
          <span>Membership</span>
          {pro ? <span className={CARD.proPill}>Active</span> : <span className="text-ink-4">Cancel any time</span>}
        </div>

        <ProMark />
        <div className="px-4 pt-1 pb-4">
          <h1 className="text-[20px] font-[630] tracking-[-0.025em] leading-[1.2] text-ink text-balance">
            {pro || phase === 'finishing' ? (pro ? "You're Pro. Thanks for backing the library." : 'Finishing up…') : 'Every style in the library, ready to build with.'}
          </h1>
          <ul className="mt-3 space-y-1.5">
            {FEATURES.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
                <Icon className="w-3.5 h-3.5 shrink-0 text-ink-4" weight="bold" /> {text}
              </li>
            ))}
          </ul>

          {!pro && (
            <>
              <div className="mt-5 flex items-end justify-between gap-3">
                <p className="flex items-baseline gap-1">
                  <span className="text-[26px] font-[640] tracking-[-0.03em] text-ink min-w-[3ch]">{price ?? '—'}</span>
                  <span className="text-[13px] text-ink-3">/ {interval === 'month' ? 'month' : 'year'}</span>
                </p>
                <div role="radiogroup" aria-label="Billing" className="flex gap-1.5 pb-1">
                  {(['month', 'year'] as const).map(i => (
                    <button
                      key={i} role="radio" aria-checked={interval === i} onClick={() => setInterval_(i)}
                      className={BTN.chip(interval === i)}
                    >
                      {i === 'month' ? 'Monthly' : `Yearly −${save}%`}
                    </button>
                  ))}
                </div>
              </div>
              <p className={CARD.meta + ' mt-1'}>Shown in your currency where we can.</p>
              {phase === 'failed' && <p role="status" className="mt-2 text-[12.5px] text-[#c8382f] dark:text-[#ff8a80]">Checkout didn&apos;t open. Try again.</p>}
            </>
          )}
        </div>

        <div className={CARD.foot + ' pl-4 pr-2'}>
          {pro ? (
            <>
              <span className={CARD.meta}>Everything below is yours</span>
              <button onClick={manage} className={CARD.footBtn + ' ml-auto'}>Manage subscription</button>
            </>
          ) : (
            <>
              <span className={CARD.meta}>14-day refund · <a href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</a></span>
              <button
                onClick={getPro} disabled={phase === 'opening' || phase === 'finishing'}
                className={BTN.primary + ' ml-auto'}
              >
                {phase === 'opening' ? 'Opening…' : status === 'signed-in' ? <>Get Pro <ArrowRight className="w-3.5 h-3.5" weight="bold" /></> : <>Sign in to get Pro <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>}
              </button>
            </>
          )}
        </div>
      </section>
      <p className="mt-4 text-center text-[12.5px] text-ink-4">Browsing, hearts and sets stay free.</p>
    </div>
  )
}
