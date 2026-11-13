// components/pro-card.tsx
//
// The Pro offer: one card in the member-card language. One price for
// everyone, shown by Paddle in your currency where it can, a Monthly/Yearly
// switch, and one action. Checkout is a transaction our server
// made for your account; Paddle's overlay takes the payment.
'use client'

import { useEffect, useState } from 'react'
import { Package, MagnifyingGlass, ArrowUp, ArrowRight } from '@phosphor-icons/react'
import { ColourStrip } from '@/components/colour-strip'
import { CARD } from '@/components/member-card'
import { useAccount, openSignIn, KITS_EVENT } from '@/lib/account-client'
import { loadPaddle, localPrices, onPaddleEvent, setPaddleCustomer, type LocalPrices } from '@/lib/paddle/client'
import { DEFAULT_INTERVAL } from '@/data/price-groups'
import { track } from '@/lib/analytics'

const FEATURES = [
  { Icon: Package, text: 'Unlimited style kits' },
  { Icon: MagnifyingGlass, text: 'Search by palette, font and contrast' },
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
        window.dispatchEvent(new Event(KITS_EVENT))
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
    <div className="w-full max-w-[400px]">
      <section className={CARD.shell + ' shadow-[0_28px_70px_-28px_rgba(0,0,0,0.35)]'}>
        <ColourStrip />
        <div className={CARD.pad + ' h-10 flex items-center justify-between'}>
          <p className={CARD.label}>Pro</p>
          {pro && <p className={CARD.number}>Active</p>}
        </div>
        <div className={CARD.pad + ' pt-1'}>
          <h1 className="text-[24px] font-[640] tracking-[-0.03em] leading-[1.1] text-ink text-balance">
            {pro || phase === 'finishing' ? (pro ? "You're Pro." : 'Finishing up…') : 'Every style in the library, ready to build with.'}
          </h1>
          <ul className="mt-5 space-y-2.5">
            {FEATURES.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
                <Icon className="w-4 h-4 shrink-0 text-ink-3" weight="bold" /> {text}
              </li>
            ))}
          </ul>
        </div>

        {pro ? (
          <div className={CARD.pad + ' pt-6 pb-4'}>
            <p className={CARD.meta}>Thanks for backing the library.</p>
            <button onClick={manage} className={CARD.meta + ' mt-1 underline underline-offset-4 hover:text-ink'}>Manage subscription</button>
          </div>
        ) : (
          <div className={CARD.pad + ' pt-6 pb-4'}>
            <div role="radiogroup" aria-label="Billing" className="grid grid-cols-2 p-[3px] rounded-[10px] bg-foreground/[0.05]">
              {(['month', 'year'] as const).map(i => (
                <button
                  key={i} role="radio" aria-checked={interval === i}
                  onClick={() => setInterval_(i)}
                  className={'h-8 rounded-[7px] text-[12.5px] font-[600] transition-colors ' + (interval === i ? 'bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-ink-3 hover:text-ink')}
                >
                  {i === 'month' ? 'Monthly' : <>Yearly <span className="font-[500] text-[#E8A04A]">save {save}%</span></>}
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="text-[28px] font-[640] tracking-[-0.03em] text-ink min-w-[3ch]">{price ?? '—'}</span>
              <span className="text-[13.5px] text-ink-3">/ {interval === 'month' ? 'month' : 'year'}</span>
            </p>
            <p className={CARD.meta + ' mt-1'}>Shown in your currency where we can.</p>
            <button
              onClick={getPro} disabled={phase === 'opening' || phase === 'finishing'}
              className="mt-4 w-full h-11 rounded-[10px] flex items-center justify-center gap-2 bg-foreground text-background text-[14px] font-[600] tracking-[-0.01em] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition"
            >
              {phase === 'opening' ? 'Opening checkout…' : status === 'signed-in' ? <>Get Pro <ArrowRight className="w-4 h-4" weight="bold" /></> : <>Sign in to get Pro <ArrowRight className="w-4 h-4" weight="bold" /></>}
            </button>
            {phase === 'failed' && <p role="status" className="mt-2 text-[12.5px] text-[#c8382f] dark:text-[#ff8a80]">Checkout didn&apos;t open. Try again.</p>}
            <p className={CARD.meta + ' mt-3'}>
              Cancel any time. Full refund within 14 days. <a href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</a> · <a href="/refunds" className="underline underline-offset-2 hover:text-ink">Refunds</a>
            </p>
          </div>
        )}
      </section>
      <p className="mt-4 text-center text-[12.5px] text-ink-4">Browsing, hearts, sets and three kits a month stay free.</p>
    </div>
  )
}
