// components/taste-signup.tsx
// Weekly digest signup (taste radar): the taste vector is the average of the
// visitor's favorited sites, recomputed on every subscribe. No account, no
// password — the email row plus the favorites list is the whole profile.
'use client'

import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

export function TasteSignup() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | { error: string }>('idle')
  // The invite sells with the goods: the three latest arrivals as a teaser
  // strip, fetched once with the popover. Stale on failure — the form below
  // is the point, the strip is the perfume.
  const [teasers, setTeasers] = useState<Array<{ id: string; title: string; thumbnail: string | null }>>([])
  useEffect(() => {
    fetch('/api/design/filter-advanced?limit=3')
      .then(r => r.json())
      .then(data => {
        const rows = Array.isArray(data.designs) ? data.designs : []
        setTeasers(
          rows.slice(0, 3).map((d: any) => ({
            id: String(d.id),
            title: d.title || d.url,
            thumbnail: d.thumbnail_url ?? null,
          })),
        )
      })
      .catch(() => {})
  }, [])
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
        posthog.capture('digest_subscribed', { favorite_count: favoriteIds.length })
        setState('done')
        setEmail('')
      }
    } catch {
      setState({ error: 'Could not reach the server.' })
    }
  }

  return (
    <div className="px-3 pb-3">
      {teasers.length > 0 && state === 'idle' && (
        <div className="flex gap-1.5 mb-3" aria-hidden="true">
          {teasers.map(t => (
            <span key={t.id} className="flex-1 h-[52px] rounded-[6px] overflow-hidden border border-edge bg-muted block">
              {t.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
              ) : null}
            </span>
          ))}
        </div>
      )}
      <p className="text-titletext text-ink leading-snug mb-1">
        Get sites like these weekly.
      </p>
      <p className="text-meta text-ink-3 leading-relaxed mb-3">
        {favoriteCount === 0
          ? 'Five new arrivals matched to the library, every Monday.'
          : `Five new arrivals matched to your ${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}, every Monday.`}
      </p>
      {state === 'done' ? (
        <p className="text-meta text-ink-3 leading-relaxed">
          You&apos;re in. First digest lands with the next additions.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
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
              className="min-w-0 flex-1 h-9 px-2.5 text-bodytext bg-muted/60 border border-edge rounded-[6px] text-foreground placeholder:text-ink-4 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
            />
            <button
              onClick={submit}
              disabled={state === 'sending' || favoriteCount === 0}
              className="shrink-0 h-9 px-3.5 rounded-[6px] bg-foreground text-background text-bodytext font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {state === 'sending' ? '…' : 'Join'}
            </button>
          </div>
          {favoriteCount === 0 && (
            <p className="mt-2 text-micro text-ink-4 leading-relaxed">
              Heart sites to tune it to your taste.
            </p>
          )}
          {typeof state === 'object' && (
            <p className="mt-1.5 text-meta text-[var(--color-error)]">{state.error}</p>
          )}
        </>
      )}
    </div>
  )
}
