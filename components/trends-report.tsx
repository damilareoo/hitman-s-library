// components/trends-report.tsx
// The trends report: what the last 30 days of additions do differently from
// everything before them. The display-type card is open to everyone; the rest
// is Pro, and a Pro card says so in its place. Every section is one card with
// the shared anatomy: tinted header, one idea, quiet footer note.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BTN, CARD } from '@/components/member-card'
import { useAccount, openSignIn } from '@/lib/account-client'
import type { Trends } from '@/lib/trends/compute'

type Report = (Trends & { pro: true }) | { pro: false; recentCount: number; earlierCount: number; serif: Trends['serif'] }

const pct = (x: number) => `${Math.round(x * 100)}%`
const FAMILY_SWATCH: Record<string, string> = { Red: '#d9412b', Orange: '#e8862a', Yellow: '#e2b52a', Green: '#3f9d5a', Teal: '#2a9d9a', Blue: '#2f6be0', Purple: '#7a4fd6', Pink: '#d65a9a' }

function Delta({ now, before }: { now: number; before: number }) {
  const d = Math.round((now - before) * 100)
  if (Math.abs(d) < 2) return <span className="text-ink-4">steady</span>
  return <span className={d > 0 ? 'text-ink' : 'text-ink-4'}>{d > 0 ? '↑' : '↓'} {Math.abs(d)} pts</span>
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={CARD.shell}>
      <div className={CARD.head}><span>{title}</span></div>
      <div className={CARD.pad + ' py-4'}>{children}</div>
      {note && <div className={CARD.foot + ' px-4'}><span className={CARD.meta}>{note}</span></div>}
    </section>
  )
}

/** One row: a label, a bar for the newest sites, a tick for the earlier ones.
 *  Bars are scaled to the largest value in their card, so small shares read. */
function Row({ label, swatch, now, before, max }: { label: string; swatch?: string; now: number; before: number; max: number }) {
  const w = (x: number) => pct(max > 0 ? Math.min(1, x / max) : 0)
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_96px_72px] items-center gap-3 py-2 border-t border-edge-faint first:border-t-0">
      <span className="flex items-center gap-2 min-w-0 text-[13.5px] text-ink truncate">
        {swatch && <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{ background: swatch }} />}
        {label}
      </span>
      <span className="relative h-1.5 rounded-full bg-foreground/[0.07]" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full bg-foreground/60" style={{ width: w(now) }} />
        <span className="absolute -top-1 w-px h-3.5 bg-foreground/40" style={{ left: w(before) }} />
      </span>
      <span className="text-right text-[12.5px] tabular-nums"><span className="sr-only">{pct(now)} now, {pct(before)} before: </span><Delta now={now} before={before} /></span>
    </li>
  )
}

export function TrendsReport() {
  const { status, pro } = useAccount()
  const [r, setR] = useState<Report | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let off = false
    fetch('/api/trends').then(res => res.json()).then(b => { if (!off) { if (b.error) setFailed(true); else setR(b) } }).catch(() => { if (!off) setFailed(true) })
    return () => { off = true }
  }, [pro])

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-display text-foreground mb-2">Trends</h1>
        <p className="text-bodytext text-ink-3">
          {r ? <>What the {r.recentCount} sites added in the last 30 days do differently from the {r.earlierCount} before them.</> : <>What the newest sites do differently.</>}
          {' '}{month}.
        </p>
      </div>

      {failed && <p className="text-meta text-ink-4">Trends are unavailable right now.</p>}
      {!r && !failed && <div className="h-40 rounded-[16px] bg-foreground/[0.03]" aria-busy="true" />}

      {r && (
        <div className="flex flex-col gap-4">
          <Card title="Display type" note="A serif anywhere in a site's headings or body counts.">
            <p className="flex items-baseline gap-3">
              <span className="text-[40px] font-[640] tracking-[-0.03em] leading-none text-ink tabular-nums">{pct(r.serif.recent)}</span>
              <span className="text-[13.5px] text-ink-3">of new sites set a serif, against {pct(r.serif.earlier)} before. <Delta now={r.serif.recent} before={r.serif.earlier} /></span>
            </p>
          </Card>

          {r.pro ? (
            <>
              <Card title="Typefaces" note="Share of sites using each face. Bar: last 30 days. Tick: before.">
                {(() => {
                  const rows = r.fonts.slice(0, 8).map(f => ({ name: f.name, now: r.recentCount ? f.recent / r.recentCount : 0, before: r.earlierCount ? f.earlier / r.earlierCount : 0 }))
                  const max = Math.max(...rows.flatMap(x => [x.now, x.before]))
                  return <ul>{rows.map(x => <Row key={x.name} label={x.name} now={x.now} before={x.before} max={max} />)}</ul>
                })()}
              </Card>
              <Card title="Accent colours" note="Each site's most saturated colour, by family.">
                {(() => {
                  const rows = r.hues.filter(h => h.name !== 'Neutral')
                  const max = Math.max(...rows.flatMap(x => [x.recent, x.earlier]))
                  return <ul>{rows.map(h => <Row key={h.name} label={h.name} swatch={FAMILY_SWATCH[h.name]} now={h.recent} before={h.earlier} max={max} />)}</ul>
                })()}
              </Card>
              <Card title="Kinds of site">
                {(() => {
                  const max = Math.max(...r.kinds.flatMap(x => [x.recent, x.earlier]))
                  return <ul>{r.kinds.map(k => <Row key={k.name} label={k.name} now={k.recent} before={k.earlier} max={max} />)}</ul>
                })()}
              </Card>
              <Card title="Dark pages" note="A page whose largest colour is near black.">
                <p className="flex items-baseline gap-3">
                  <span className="text-[40px] font-[640] tracking-[-0.03em] leading-none text-ink tabular-nums">{pct(r.dark.recent)}</span>
                  <span className="text-[13.5px] text-ink-3">of new sites are dark, against {pct(r.dark.earlier)} before. <Delta now={r.dark.recent} before={r.dark.earlier} /></span>
                </p>
              </Card>
            </>
          ) : (
            <section className={CARD.shell}>
              <div className={CARD.head}><span>The full report</span><span className={CARD.proPill}>Pro</span></div>
              <div className={CARD.pad + ' py-4'}>
                <p className={CARD.title}>Typefaces, colours and kinds on the rise</p>
                <p className={CARD.body + ' mt-1'}>Which faces are spreading, which accent colours are fading, how many new sites go dark. Updated daily, and emailed to you each month.</p>
              </div>
              <div className={CARD.foot + ' justify-end'}>
                {status === 'signed-in'
                  ? <Link href="/pro" className={BTN.primary}>Get Pro</Link>
                  : <button onClick={() => openSignIn('join')} className={BTN.primary}>Join to see it</button>}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
