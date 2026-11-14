// components/taste-signup.tsx
// Weekly digest signup (taste radar): the taste vector is the average of the
// visitor's favorited sites, recomputed on every subscribe. No account, no
// password — the email row plus the favorites list is the whole profile.
'use client'

import { CARD, BTN, FIELD, FIELD_INPUT } from '@/components/member-card'

import { useState, useEffect } from 'react'
import { track } from '@/lib/analytics'
import { FadeImg } from '@/components/fade-img'

export interface Teaser { id: string; title: string; thumbnail: string | null }

export function TasteSignup({ latest }: { latest?: Teaser[] }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | { error: string }>('idle')
  // The invite sells with the goods: the three latest arrivals as a teaser
  // strip. They come in with the page (no fetch on open), so the strip is
  // there the moment the card opens; images fade into reserved boxes.
  const teasers = (latest ?? []).slice(0, 3)
  // Hearts write this key; the count gates Join and tunes the hint. Read on
  // mount and on storage events — no shared state needed for one number.
  const [favoriteCount, setFavoriteCount] = useState(0)
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem('hl:favorites')
        const parsed: unknown = raw ? JSON.parse(raw) : []
        setFavoriteCount(Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite).length : 0)
      } catch {
        setFavoriteCount(0)
      }
    }
    read()
    window.addEventListener('storage', read)
    window.addEventListener('focus', read)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener('focus', read)
    }
  }, [])
  // One quiet line until it earns more room: the sidebar holds thirteen
  // shelves already, and an always-open form crowds them out. Opens itself
  // once hearts exist — that is exactly when it becomes relevant.

  async function submit() {
    if (state === 'sending') return
    setState('sending')
    try {
      const raw = localStorage.getItem('hl:favorites')
      const favoriteIds: number[] = raw ? JSON.parse(raw).map(Number).filter(Number.isFinite) : []
      const res = await fetch('/api/taste/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), favoriteIds }),
      })
      const data = await res.json()
      if (!res.ok) setState({ error: data.error ?? 'That did not go through.' })
      else {
        track('digest_subscribed', { favorite_count: favoriteIds.length })
        setState('done')
        setEmail('')
      }
    } catch {
      setState({ error: 'Could not reach the server.' })
    }
  }

  return (
    <div className="px-4 pt-4 pb-4">
      {teasers.length > 0 && state === 'idle' && (
        <div className="flex gap-1.5 mb-4" aria-hidden="true">
          {teasers.map(t => (
            <span key={t.id} className="flex-1 h-[48px] rounded-[6px] overflow-hidden ring-1 ring-inset ring-foreground/10 bg-muted block">
              {t.thumbnail ? <FadeImg src={t.thumbnail} className="w-full h-full object-cover object-top" /> : null}
            </span>
          ))}
        </div>
      )}
      <p className={CARD.title}>Get sites like these weekly</p>
      <p className={CARD.body + ' mt-1'}>
        {favoriteCount === 0
          ? 'Five new arrivals matched to the library, every Monday.'
          : `Five new arrivals matched to your ${favoriteCount} heart${favoriteCount === 1 ? '' : 's'}, every Monday.`}
      </p>
      {state === 'done' ? (
        <p className={CARD.body + ' mt-3 text-ink'}>You&apos;re in. The first digest lands with the next additions.</p>
      ) : (
        <>
          <div className={FIELD + ' mt-4'}>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              aria-label="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              className={FIELD_INPUT}
            />
            <button
              onClick={submit}
              disabled={state === 'sending' || favoriteCount === 0}
              className={BTN.inField}
            >
              {state === 'sending' ? 'Joining…' : 'Join'}
            </button>
          </div>
          {favoriteCount === 0 && <p className={CARD.meta + ' mt-2'}>Heart a few sites first to tune it to your taste.</p>}
          {typeof state === 'object' && <p className="mt-2 text-[12.5px] text-[#c8382f] dark:text-[#ff8a80]">{state.error}</p>}
        </>
      )}
    </div>
  )
}
