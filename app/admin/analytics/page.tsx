'use client'

// /admin/analytics: our own visit counter (lib/read/analytics.ts), with
// people and the team kept apart. Private: the data route requires the admin
// session, so without it this page only points to the sign-in.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check } from '@phosphor-icons/react'
import { CARD, BTN } from '@/components/member-card'
import type { Analytics, Range } from '@/lib/read/analytics'

const RANGE_LABEL: Record<Range, string> = { 1: '24 hours', 7: '7 days', 30: '30 days', 90: '90 days' }

const KIND_LABEL: Record<string, string> = {
  open: 'Opened a site',
  outbound: 'Visited the real site',
  copy: 'Copied colours',
  export: 'Exported a theme',
  design_favorite_toggled: 'Saved a site',
  collection_membership_updated: 'Added to a collection',
  color_filter_applied: 'Filtered by colour',
  pro_search_used: 'Used Pro search',
  site_request_submitted: 'Requested a site',
  digest_subscribed: 'Subscribed to the digest',
  digest_unsubscribed: 'Unsubscribed',
  pricing_viewed: 'Saw Pro pricing',
  checkout_opened: 'Opened checkout',
  upgraded: 'Upgraded to Pro',
}

const fmt = (v: number) => v.toLocaleString('en')
const count = (v: number, one: string, many = one + 's') => `${fmt(v)} ${v === 1 ? one : many}`
const pct = (v: number) => `${Math.round(v * 100)}%`

function change(now: number, before: number): string {
  if (!before) return now ? 'new' : '—'
  const c = (now - before) / before
  if (Math.abs(c) < 0.005) return 'no change'
  return `${c > 0 ? '↑' : '↓'} ${Math.round(Math.abs(c) * 100)}%`
}

const countryName = (() => {
  let names: Intl.DisplayNames | null = null
  try { names = new Intl.DisplayNames(['en'], { type: 'region' }) } catch { /* old browser */ }
  return (code: string) => {
    if (!code || code === '??' || code === 'XX' || code === 'T1') return 'Unknown'
    try { return names?.of(code) ?? code } catch { return code }
  }
})()

export default function AnalyticsPage() {
  const [days, setDays] = useState<Range>(7)
  const [data, setData] = useState<Analytics | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'signin' | 'error'>('loading')

  const load = useCallback(async (d: Range) => {
    setState(s => (s === 'ready' ? s : 'loading'))
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, { cache: 'no-store' })
      if (res.status === 401 || res.status === 503) return setState('signin')
      if (!res.ok) return setState('error')
      setData(await res.json())
      setState('ready')
    } catch { setState('error') }
  }, [])

  useEffect(() => { load(days) }, [days, load])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-edge-strong bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-titletext truncate">Hitman&apos;s Library</h1>
            <span className="text-micro text-ink-3 border border-edge-strong px-1.5 py-0.5 rounded-[4px]">Analytics</span>
          </div>
          <Link href="/admin" className="flex items-center gap-1.5 text-meta text-ink-3 hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" weight="bold" />
            Admin
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-7 py-6 md:py-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Period" className="inline-flex items-center gap-1.5 flex-wrap">
            {([1, 7, 30, 90] as Range[]).map(r => (
              <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)} className={BTN.chip(days === r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
          {data && <p className={CARD.meta}>People only, unless it says team. Compared with the {RANGE_LABEL[days]} before.</p>}
        </div>

        {state === 'signin' && <Notice title="Sign in first" body={<>Open <Link href="/admin" className="underline underline-offset-2">Admin</Link>, enter the passcode, then come back.</>} />}
        {state === 'error' && <Notice title="Couldn't load" body="The numbers didn't come back. Try again in a moment." />}
        {state === 'loading' && !data && <Notice title="Loading" body="Counting…" />}
        {data && <Dashboard a={data} reload={() => load(days)} />}
      </main>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <section className={CARD.shell}>
      <div className={CARD.head}>{title}</div>
      <p className={`${CARD.body} px-4 py-4`}>{body}</p>
    </section>
  )
}

function Dashboard({ a, reload }: { a: Analytics; reload: () => void }) {
  const t = a.totals
  const empty = !t.views.now && !t.teamViews.now && !t.clicks.now
  return (
    <>
      <section className={CARD.shell} aria-label="Totals">
        <div className="grid grid-cols-2 md:grid-cols-4">
          <Stat label="Views" value={t.views.now} note={change(t.views.now, t.views.before)} />
          <Stat label="Unique visitors" value={t.visitors.now} note={change(t.visitors.now, t.visitors.before)} />
          <Stat label="Clicks" value={t.clicks.now} note={change(t.clicks.now, t.clicks.before)} />
          <Stat label="Team" value={t.teamViews.now + t.teamClicks.now} note={`${count(t.teamViews.now, 'view')} · ${count(t.teamClicks.now, 'click')}`} />
        </div>
      </section>

      {empty && (
        <Notice
          title="Nothing counted yet"
          body="Counting starts once this is live. Open your team link below on each of your browsers so your own visits stay out of the numbers."
        />
      )}

      <ViewsChart a={a} />

      {a.insights.length > 0 && (
        <section className={CARD.shell}>
          <div className={CARD.head}>What Cloudflare and PostHog don&apos;t show <span className={CARD.pill}>{a.insights.length}</span></div>
          <ul className="px-4 py-2">
            {a.insights.map(line => (
              <li key={line} className={`${CARD.body} text-ink-2 py-2 border-b border-edge-faint last:border-0 text-pretty`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Table
          title="Where people come from"
          detail="visitors · clicks"
          rows={a.sources.map(s => ({
            key: s.name,
            label: <>{s.name}{s.isNew && <span className="ml-2 text-[11px] font-[600] text-ink-4 uppercase tracking-[0.08em]">New</span>}</>,
            value: s.visitors,
            cells: [fmt(s.visitors), fmt(s.clicks)],
          }))}
          empty="No visits yet."
          foot={a.campaigns.length ? `Campaigns: ${a.campaigns.map(c => `${c.name} (${c.sessions})`).join(', ')}` : 'Add ?ref=x to links you post to name the platform.'}
        />
        <Table
          title="Clicks"
          detail="people · team"
          rows={a.clicks.map(c => ({ key: c.kind, label: KIND_LABEL[c.kind] ?? c.kind.replace(/_/g, ' '), value: c.people, cells: [fmt(c.people), fmt(c.team)] }))}
          empty="No clicks yet."
        />
        <Table
          title="Sites"
          detail="opened · visited · copied"
          rows={a.sites.map(s => ({ key: s.name, label: s.name, value: s.views + s.opens, cells: [fmt(Math.max(s.views, s.opens)), fmt(s.outbound), fmt(s.takes)] }))}
          empty="No sites opened yet."
        />
        <Funnel steps={a.funnel} />
        <Table
          title="Pages"
          detail="views · first page"
          rows={a.pages.map(p => ({ key: p.path, label: p.path, value: p.views, cells: [fmt(p.views), fmt(p.landings)] }))}
          empty="No views yet."
        />
        <Audience dims={a.dims} />
        <Engagement e={a.engagement} />
        <Team team={a.team} reload={reload} />
      </div>
    </>
  )
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="px-4 py-4 border-edge-faint [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l md:[&:not(:first-child)]:border-l">
      <p className={CARD.label}>{label}</p>
      <p className="mt-2.5 text-[26px] leading-none font-[640] tracking-[-0.03em] tabular-nums text-ink">{fmt(value)}</p>
      <p className={`${CARD.meta} mt-2 tabular-nums`}>{note}</p>
    </div>
  )
}

/** Daily (or hourly) views. People solid, the team as a pale cap on top. */
function ViewsChart({ a }: { a: Analytics }) {
  const [hover, setHover] = useState<number | null>(null)
  const slots = useMemo(() => {
    // Fill the gaps so a quiet day shows as a gap, not as nothing.
    const step = a.bucket === 'hour' ? 3600e3 : 86400e3
    const count = a.bucket === 'hour' ? 24 : a.days
    // Buckets are UTC, as the database groups them.
    const end = new Date()
    if (a.bucket === 'hour') end.setUTCMinutes(0, 0, 0)
    else end.setUTCHours(0, 0, 0, 0)
    const by = new Map(a.series.map(s => [a.bucket === 'hour' ? s.at.slice(0, 13) : s.at.slice(0, 10), s]))
    return Array.from({ length: count }, (_, i) => {
      const at = new Date(end.getTime() - (count - 1 - i) * step)
      const key = a.bucket === 'hour' ? at.toISOString().slice(0, 13) : at.toISOString().slice(0, 10)
      const s = by.get(key)
      return { at, people: s?.people ?? 0, team: s?.team ?? 0, visitors: s?.visitors ?? 0 }
    })
  }, [a])

  const max = Math.max(1, ...slots.map(s => s.people + s.team))
  const W = 720, H = 160, gap = slots.length > 60 ? 1 : 2
  const slot = W / slots.length
  const bw = Math.min(slot - gap, 36)
  const label = (d: Date) => a.bucket === 'hour'
    ? d.toLocaleTimeString('en', { hour: 'numeric' })
    : d.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const shown = hover != null ? slots[hover] : null
  const total = slots.reduce((s, x) => s + x.people, 0)

  return (
    <section className={CARD.shell}>
      <div className={CARD.head}>
        <span>Views</span>
        <span className="flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] bg-foreground/85" />People</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] bg-foreground/20" />Team</span>
        </span>
      </div>
      <div className="px-4 pt-4 pb-3">
        <p className={`${CARD.meta} h-5 tabular-nums`} aria-live="polite">
          {shown
            ? <><span className="text-ink font-[600]">{label(shown.at)}</span> · {count(shown.people, 'view')} · {count(shown.visitors, 'visitor')} · {fmt(shown.team)} team</>
            : <>{count(total, 'view')} from people in the last {RANGE_LABEL[a.days]}</>}
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[160px] mt-2 block" preserveAspectRatio="none" role="img" aria-label={`Views per ${a.bucket}`} onMouseLeave={() => setHover(null)}>
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="stroke-foreground/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {slots.map((s, i) => {
            const x = i * slot + (slot - bw) / 2
            const hp = (s.people / max) * (H - 4)
            const ht = (s.team / max) * (H - 4)
            const dim = hover != null && hover !== i
            return (
              <g key={i} opacity={dim ? 0.45 : 1}>
                {s.team > 0 && <rect x={x} width={bw} y={H - hp - ht - (hp ? 2 : 0)} height={ht} rx={Math.min(3, bw / 2)} className="fill-foreground/20" />}
                {s.people > 0 && <rect x={x} width={bw} y={H - hp} height={hp} rx={Math.min(3, bw / 2)} className="fill-foreground/85" />}
                <rect x={i * (W / slots.length)} width={W / slots.length} y="0" height={H} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
              </g>
            )
          })}
        </svg>
        <div className={`${CARD.meta} flex justify-between mt-2 tabular-nums`}>
          <span>{label(slots[0].at)}</span>
          <span>{label(slots[slots.length - 1].at)}</span>
        </div>
      </div>
    </section>
  )
}

interface Row { key: string; label: React.ReactNode; value: number; cells: string[] }

function Rows({ rows, empty }: { rows: Row[]; empty: string }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  if (!rows.length) return <p className={`${CARD.body} px-4 py-4`}>{empty}</p>
  return (
    <ul className="px-2 py-2">
      {rows.map(r => (
        <li key={r.key} className="relative flex items-center gap-3 h-9 px-2 rounded-[8px] text-[13px]">
          <span aria-hidden className="absolute inset-y-1 left-0 rounded-[6px] bg-foreground/[0.05]" style={{ width: `${(r.value / max) * 100}%` }} />
          <span className="relative flex-1 min-w-0 truncate text-ink-2">{r.label}</span>
          {r.cells.map((c, i) => (
            <span key={i} className={`relative w-12 text-right tabular-nums ${i === 0 ? 'text-ink font-[560]' : 'text-ink-3'}`}>{c}</span>
          ))}
        </li>
      ))}
    </ul>
  )
}

function Table({ title, detail, rows, empty, foot }: { title: string; detail: string; rows: Row[]; empty: string; foot?: string }) {
  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}><span>{title}</span><span className="text-[12px] text-ink-4">{detail}</span></div>
      <div className="flex-1"><Rows rows={rows} empty={empty} /></div>
      {foot && <div className={`${CARD.foot} px-4`}><span className={`${CARD.meta} truncate`}>{foot}</span></div>}
    </section>
  )
}

function Funnel({ steps }: { steps: Analytics['funnel'] }) {
  const top = steps[0]?.visitors || 0
  return (
    <Table
      title="From visit to Pro"
      detail="people · share"
      rows={steps.map(s => ({ key: s.step, label: s.step, value: s.visitors, cells: [fmt(s.visitors), top ? pct(s.visitors / top) : '—'] }))}
      empty="No visits yet."
    />
  )
}

function Audience({ dims }: { dims: Analytics['dims'] }) {
  const tabs = [['device', 'Device'], ['browser', 'Browser'], ['os', 'System'], ['country', 'Country']] as const
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('device')
  const rows = dims[tab].slice(0, 10).map(d => ({
    key: d.name,
    label: tab === 'country' ? countryName(d.name) : d.name,
    value: d.visitors,
    cells: [fmt(d.visitors)],
  }))
  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}>
        <span>Devices</span>
        <span role="group" aria-label="Breakdown" className="flex items-center gap-0.5 -mr-2">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
              className={`h-7 px-2 rounded-[8px] text-[12px] transition-colors ${tab === id ? 'bg-foreground/[0.07] text-ink' : 'text-ink-4 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </span>
      </div>
      <div className="flex-1"><Rows rows={rows} empty="No visitors yet." /></div>
    </section>
  )
}

function Engagement({ e }: { e: Analytics['engagement'] }) {
  const items = [
    ['Came back', e.visitors ? pct(e.returning / e.visitors) : '—'],
    ['Left after one page', pct(e.bounce)],
    ['Pages per visit', e.pagesPerSession ? e.pagesPerSession.toFixed(1) : '—'],
    ['Typical visit', e.medianMinutes ? (e.medianMinutes < 1 ? `${Math.round(e.medianMinutes * 60)}s` : `${e.medianMinutes.toFixed(1)} min`) : '—'],
  ]
  return (
    <section className={CARD.shell}>
      <div className={CARD.head}>How people stay</div>
      <dl className="grid grid-cols-2">
        {items.map(([k, v], i) => (
          <div key={k} className={`px-4 py-4 border-edge-faint ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t' : ''}`}>
            <dt className={CARD.label}>{k}</dt>
            <dd className="mt-2 text-[16px] font-[620] tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Team({ team, reload }: { team: Analytics['team']; reload: () => void }) {
  const [name, setName] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function make() {
    setError(null); setLink(null); setCopied(false)
    const res = await fetch('/api/admin/analytics/team-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return setError(body.error ?? 'Could not make a link.')
    setLink(body.link)
  }

  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setCopied(true); reload() } catch { /* clipboard unavailable */ }
  }

  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}><span>Team</span><span className="text-[12px] text-ink-4">views · clicks</span></div>
      <div className="flex-1">
        <Rows
          rows={team.map(m => ({ key: m.name, label: m.name, value: m.views + m.clicks, cells: [fmt(m.views), fmt(m.clicks)] }))}
          empty="No team visits yet. Make a link, then open it once on each browser and phone you use."
        />
        {link && (
          <p className={`${CARD.meta} px-4 pb-3 break-all`}>
            {link}
          </p>
        )}
        {error && <p className="px-4 pb-3 text-[12px] text-error-ink">{error}</p>}
      </div>
      <form className={CARD.foot} onSubmit={e => { e.preventDefault(); make() }}>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setLink(null) }}
          placeholder="Their name"
          aria-label="Teammate's name"
          maxLength={24}
          className="flex-1 min-w-0 h-8 px-2.5 bg-transparent text-[13px] outline-none placeholder:text-ink-4"
        />
        {link
          ? <button type="button" onClick={copy} className={CARD.footBtn}>{copied ? <Check className="w-3.5 h-3.5" weight="bold" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy link'}</button>
          : <button type="submit" disabled={!name.trim()} className={`${CARD.footBtn} disabled:opacity-40`}>Make link</button>}
      </form>
    </section>
  )
}
