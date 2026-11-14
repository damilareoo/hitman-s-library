// components/trends-report.tsx
// Trends: what the sites added to the library in the last 30 days do
// differently from the ones before them. It leads with three plain findings
// (open to everyone). Pro members then get each typeface and accent colour as
// a row they can read in words ("6% of new sites · was 1%"), see in two
// labelled bars, and open: three of the newest sites that show it, and the
// whole row runs the search for the rest. Every section is one card.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CaretRight } from '@phosphor-icons/react'
import { BTN, CARD, ICON } from '@/components/member-card'
import { FadeImg } from '@/components/fade-img'
import { useAccount, openSignIn } from '@/lib/account-client'
import type { Trends, TrendRow } from '@/lib/trends/compute'

type Report =
  | (Trends & { pro: true; findings: string[] })
  | { pro: false; findings: string[]; recentCount: number; earlierCount: number }

const pct = (x: number) => `${Math.round(x * 100)}%`
const FAMILY_SWATCH: Record<string, string> = { Red: '#d9412b', Orange: '#e8862a', Yellow: '#e2b52a', Green: '#3f9d5a', Teal: '#2a9d9a', Blue: '#2f6be0', Purple: '#7a4fd6', Pink: '#d65a9a' }

function Card({ title, aside, note, children }: { title: string; aside?: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section className={CARD.shell}>
      <div className={CARD.head}><span>{title}</span>{aside}</div>
      <div className={CARD.pad + ' py-2'}>{children}</div>
      {note && <div className={CARD.foot + ' px-4'}><span className={CARD.meta}>{note}</span></div>}
    </section>
  )
}

/** The legend, once per card: what the two bars mean. */
const Legend = () => (
  <span className="flex items-center gap-3 text-[11.5px] text-ink-4">
    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-foreground/70" />Now</span>
    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-foreground/20" />Before</span>
  </span>
)

/** One trend: its name, the change in words, two bars, three sites, and a way in. */
function Row({ href, label, swatch, now, before, max, examples }: {
  href: string; label: string; swatch?: string; now: number; before: number; max: number; examples: TrendRow['examples']
}) {
  const w = (x: number) => `${max > 0 ? Math.max(2, Math.round((x / max) * 100)) : 0}%`
  return (
    <li className="border-t border-edge-faint first:border-t-0">
      <Link href={href} className="group -mx-2 px-2 py-3 rounded-[10px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 hover:bg-foreground/[0.03] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]">
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[14px] font-[560] text-ink truncate">
            {swatch && <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{ background: swatch }} />}
            {label}
          </span>
          <span className="block mt-0.5 text-[12.5px] text-ink-3">{pct(now)} of new sites · was {pct(before)}</span>
          <span className="mt-2 flex flex-col gap-1 max-w-[240px]" aria-hidden="true">
            <span className="h-1.5 rounded-full bg-foreground/70" style={{ width: w(now) }} />
            <span className="h-1.5 rounded-full bg-foreground/20" style={{ width: w(before) }} />
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="flex -space-x-2 max-sm:hidden">
            {examples.map(e => (
              <span key={e.slug} title={e.slug} className="w-9 h-9 rounded-full overflow-hidden border-2 border-popover bg-muted">
                {e.thumb && <FadeImg src={e.thumb} className="w-full h-full object-cover object-top" />}
              </span>
            ))}
          </span>
          <CaretRight className={ICON.inline + ' text-ink-4 group-hover:text-ink transition-colors'} weight="bold" />
        </span>
      </Link>
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
        <p className={CARD.label}>{month}</p>
        <h1 className="mt-2 text-display text-foreground">Trends</h1>
        <p className="mt-2 text-bodytext text-ink-3 text-balance">
          {r
            ? <>What the {r.recentCount} sites added to the library in the last 30 days do differently from the {r.earlierCount} before them.</>
            : <>What the newest sites in the library do differently.</>}
        </p>
      </div>

      {failed && <p className="text-meta text-ink-4">Trends are unavailable right now.</p>}
      {!r && !failed && <div className="h-48 rounded-[16px] bg-foreground/[0.03]" aria-busy="true" />}

      {r && (
        <div className="flex flex-col gap-4">
          <Card title="This month" note="From sites added to Hitman’s Library, not the whole web.">
            <ol className="py-2 flex flex-col gap-3">
              {r.findings.map((f, i) => (
                <li key={f} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 text-[15px] leading-[1.45] text-ink">
                  <span className="text-ink-4 tabular-nums">{i + 1}</span>{f}
                </li>
              ))}
            </ol>
          </Card>

          {r.pro ? (
            <>
              {(() => {
                const rows = r.fonts.slice(0, 8).map(f => ({ ...f, now: r.recentCount ? f.recent / r.recentCount : 0, before: r.earlierCount ? f.earlier / r.earlierCount : 0 }))
                const max = Math.max(...rows.flatMap(x => [x.now, x.before]))
                return (
                  <Card title="Typefaces" aside={<Legend />} note="Open a typeface to see every site using it.">
                    <ul>{rows.map(x => <Row key={x.name} href={`/?font=${encodeURIComponent(x.name)}`} label={x.name} now={x.now} before={x.before} max={max} examples={x.examples} />)}</ul>
                  </Card>
                )
              })()}
              {(() => {
                const rows = r.hues.filter(h => h.name !== 'Neutral' && h.hex)
                const max = Math.max(...rows.flatMap(x => [x.recent, x.earlier]))
                return (
                  <Card title="Accent colours" aside={<Legend />} note="Each site’s most vivid colour, grouped by family. Open one to see sites near it.">
                    <ul>{rows.map(h => <Row key={h.name} href={`/?pal=${h.hex!.replace('#', '')}`} label={h.name} swatch={FAMILY_SWATCH[h.name]} now={h.recent} before={h.earlier} max={max} examples={h.examples} />)}</ul>
                  </Card>
                )
              })()}
              <Card title="At a glance">
                <dl className="py-2 grid grid-cols-2">
                  {[
                    { k: 'set a serif', v: r.serif },
                    { k: 'are dark pages', v: r.dark },
                  ].map(({ k, v }, i) => (
                    <div key={k} className={i ? 'pl-4 border-l border-edge' : ''}>
                      <dd className="text-[32px] font-[640] tracking-[-0.03em] leading-none text-ink tabular-nums">{pct(v.recent)}</dd>
                      <dt className="mt-2 text-[12.5px] text-ink-3">of new sites {k} · was {pct(v.earlier)}</dt>
                    </div>
                  ))}
                </dl>
              </Card>
            </>
          ) : (
            <section className={CARD.shell}>
              <div className={CARD.head}><span>The full report</span><span className={CARD.proPill}>Pro</span></div>
              <div className={CARD.pad + ' py-4'}>
                <p className={CARD.title}>See the sites behind every trend</p>
                <p className={CARD.body + ' mt-1'}>Each typeface and colour on the rise, with the newest sites using it, one tap from all of them. Updated daily, and emailed to you each month.</p>
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
