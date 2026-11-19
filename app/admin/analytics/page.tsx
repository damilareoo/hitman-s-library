'use client'

// /admin/analytics: our own visit counter (lib/read/analytics.ts). One filter
// at the top decides whose visits every number on the page counts: people
// (the default, no team cookie), one teammate, or everyone. Private: the data
// route requires the admin session, so without it this page only points to
// the sign-in.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check } from '@phosphor-icons/react'
import { CARD } from '@/components/member-card'
import type { Analytics, Range } from '@/lib/read/analytics'
import { FunnelFlow, Heatmap, SourcesOverTime, WorldMap } from './charts'

const RANGE_LABEL: Record<Range, string> = { 1: '24 hours', 7: '7 days', 30: '30 days', 90: '90 days' }
const RANGE_SHORT: Record<Range, string> = { 1: '24h', 7: '7d', 30: '30d', 90: '90d' }

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
const listNames = (n: string[]) => n.length < 2 ? (n[0] ?? '') : `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}`
const pct = (v: number) => `${Math.round(v * 100)}%`
const compact = (v: number) => v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(v)

type Delta = { text: string; tone: 'up' | 'down' | 'flat' }
function delta(now: number, before: number): Delta {
  if (!before) return now ? { text: 'New', tone: 'up' } : { text: '—', tone: 'flat' }
  const c = (now - before) / before
  if (Math.abs(c) < 0.005) return { text: '0%', tone: 'flat' }
  return { text: `${c > 0 ? '↑' : '↓'} ${Math.round(Math.abs(c) * 100)}%`, tone: c > 0 ? 'up' : 'down' }
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
  const [who, setWho] = useState('people')
  const [members, setMembers] = useState<string[]>([])
  const [data, setData] = useState<Analytics | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'signin' | 'error'>('loading')

  const load = useCallback(async (d: Range, w: string) => {
    setState(s => (s === 'ready' ? s : 'loading'))
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}&who=${encodeURIComponent(w)}`, { cache: 'no-store' })
      if (res.status === 401 || res.status === 503) return setState('signin')
      if (!res.ok) return setState('error')
      const body: Analytics = await res.json()
      setData(body)
      setMembers(body.members)
      setState('ready')
    } catch { setState('error') }
  }, [])

  useEffect(() => { load(days, who) }, [days, who, load])

  const whoOptions = useMemo(() => [
    { value: 'people', label: 'Visitors' },
    ...members.map(m => ({ value: m, label: m })),
    { value: 'all', label: 'Everyone' },
  ], [members])

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
          <Segmented label="Whose visits" value={who} onChange={setWho} options={whoOptions} />
          <Segmented label="Period" value={String(days)} onChange={v => setDays(Number(v) as Range)}
            options={([1, 7, 30, 90] as Range[]).map(r => ({ value: String(r), label: RANGE_SHORT[r] }))} />
        </div>

        {state === 'ready' && members.length === 0 && (
          <p className={`${CARD.meta} text-pretty`}>
            To see your visits and Florence&apos;s apart, make a link for each of you in Team below, then open it once in every browser and phone you use.
          </p>
        )}

        {state === 'signin' &&<Notice title="Sign in first" body={<>Open <Link href="/admin" className="underline underline-offset-2">Admin</Link>, enter the passcode, then come back.</>} />}
        {state === 'error' && <Notice title="Couldn't load" body="The numbers didn't come back. Try again in a moment." />}
        {state === 'loading' && !data && <Notice title="Loading" body="Counting…" />}
        {data && <Dashboard a={data} reload={() => load(days, who)} />}
      </main>
    </div>
  )
}

/** One track, one thumb (DESIGN.md › Segmented controls). Cells size to their labels. */
function Segmented({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  const track = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)
  useLayoutEffect(() => {
    const el = track.current?.querySelector<HTMLElement>(`[data-v="${CSS.escape(value)}"]`)
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth })
  }, [value, options])
  return (
    <div ref={track} role="radiogroup" aria-label={label}
      className="relative inline-flex h-8 p-[3px] rounded-[10px] bg-foreground/[0.05] dark:bg-foreground/[0.07] max-w-full overflow-x-auto">
      {thumb && (
        <span aria-hidden className={[
          'absolute top-[3px] left-0 h-[26px] rounded-[7px] bg-card pointer-events-none',
          'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]',
          'dark:bg-[rgba(var(--foreground-rgb),0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
          'transition-[transform,width] duration-[var(--dur-2)] ease-[var(--ease-sig)] motion-reduce:transition-none',
        ].join(' ')} style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />
      )}
      {options.map(o => (
        <button key={o.value} data-v={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`relative z-[1] h-[26px] px-3 rounded-[7px] text-[12px] font-medium leading-none whitespace-nowrap transition-colors duration-[var(--dur-2)] focus-visible:outline-2 focus-visible:outline-pro ${value === o.value ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
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

type Metric = 'visitors' | 'views' | 'clicks'
const METRICS: { id: Metric; label: string; unit: [string, string] }[] = [
  { id: 'visitors', label: 'Unique visitors', unit: ['visitor', 'visitors'] },
  { id: 'views', label: 'Page views', unit: ['view', 'views'] },
  { id: 'clicks', label: 'Clicks', unit: ['click', 'clicks'] },
]

function Dashboard({ a, reload }: { a: Analytics; reload: () => void }) {
  const t = a.totals
  const [metric, setMetric] = useState<Metric>('visitors')
  const empty = !t.views.now && !t.clicks.now
  const scope = a.who === 'people' ? 'Visitors only, your team left out.'
    : a.who === 'all' ? 'Everyone, your team included.'
    : `Only ${a.who}'s own visits, from browsers opened with their team link.`

  return (
    <>
      <section className={CARD.shell} aria-label="Totals and chart">
        <div role="tablist" aria-label="Metric" className="grid grid-cols-3 border-b border-edge">
          {METRICS.map((m, i) => {
            const d = delta(t[m.id].now, t[m.id].before)
            const on = metric === m.id
            return (
              <button key={m.id} role="tab" aria-selected={on} type="button" onClick={() => setMetric(m.id)}
                className={`relative flex flex-col justify-start text-left px-4 py-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pro ${i ? 'border-l border-edge' : ''} ${on ? '' : 'bg-foreground/[0.025] hover:bg-foreground/[0.04]'}`}>
                <span className={`block text-[12px] font-[500] ${on ? 'text-ink-2' : 'text-ink-4'}`}>{m.label}</span>
                <span className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className={`text-[26px] max-sm:text-[21px] leading-none font-[640] tracking-[-0.03em] tabular-nums ${on ? 'text-ink' : 'text-ink-3'}`}>{fmt(t[m.id].now)}</span>
                  <span className={`text-[12px] font-[560] tabular-nums ${d.tone === 'down' ? 'text-error-ink' : d.tone === 'up' ? 'text-ink-2' : 'text-ink-4'}`}>{d.text}</span>
                </span>
                {m.id === 'visitors' && a.lookalikes.visitors > 0 && (
                  <span className="mt-1.5 block text-[11.5px] text-ink-4 tabular-nums">
                    {fmt(a.lookalikes.visitors)} may be {listNames([...new Set(a.lookalikes.setups.map(x => x.name))])}
                  </span>
                )}
                {on && <span aria-hidden className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-foreground" />}
              </button>
            )
          })}
        </div>
        <AreaChart a={a} metric={metric} />
        <div className={`${CARD.foot} px-4 justify-between`}>
          <span className={`${CARD.meta} truncate`}>{scope}</span>
          <span className={`${CARD.meta} flex items-center gap-3 shrink-0`}>
            <span className="flex items-center gap-1.5"><i className="w-3 h-[2px] rounded bg-foreground" />{RANGE_LABEL[a.days]}</span>
            <span className="flex items-center gap-1.5"><i className="w-3 h-0 border-t-[2px] border-dashed border-foreground/30" />Before</span>
          </span>
        </div>
      </section>

      {empty && (
        <Notice
          title="Nothing counted yet"
          body={a.who === 'people'
            ? 'No visitor activity in this period. Open your team link on each of your browsers so your own visits stay out of these numbers.'
            : 'Nothing counted for this filter in this period.'}
        />
      )}

      <Heatmap a={a} />

      {a.insights.length > 0 && (
        <section className={CARD.shell}>
          <div className={CARD.head}><span>What stands out</span><span className={CARD.pill}>{a.insights.length}</span></div>
          <ul className="px-4 py-1">
            {a.insights.map(line => (
              <li key={line} className={`${CARD.body} text-ink-2 py-2.5 border-b border-edge-faint last:border-0 text-pretty`}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Paired by length so neither column runs on alone. */}
      <div className="grid gap-4 md:grid-cols-2 items-start">
        <Table
          title="Sources"
          top={<SourcesOverTime a={a} />}
          cols={['Visitors', 'Clicks']}
          rows={a.sources.map(s => ({
            key: s.name,
            label: <>{s.name}{s.isNew && <span className="ml-2 text-[10.5px] font-[600] text-pro-ink uppercase tracking-[0.08em]">New</span>}</>,
            value: s.visitors,
            cells: [s.visitors, s.clicks],
          }))}
          empty="No visits yet."
          foot={a.campaigns.length ? `Campaigns: ${a.campaigns.map(c => `${c.name} (${c.sessions})`).join(', ')}` : 'Add ?ref=x to links you post to name the platform.'}
        />
        <Table
          title="Clicks"
          cols={['Clicks', 'Visitors']}
          rows={a.clicks.map(c => ({ key: c.kind, label: KIND_LABEL[c.kind] ?? c.kind.replace(/_/g, ' '), value: c.count, cells: [c.count, c.visitors] }))}
          empty="No clicks yet."
        />
        <FunnelFlow steps={a.funnel} />
        <Audience dims={a.dims} />
        <Table
          title="Sites"
          cols={['Opened', 'Visited', 'Copied']}
          rows={a.sites.map(s => ({ key: s.name, label: /^\d+$/.test(s.name) ? `Site #${s.name}` : s.name, value: Math.max(s.views, s.opens), cells: [Math.max(s.views, s.opens), s.outbound, s.takes] })).sort((x, y) => y.value - x.value).slice(0, 10)}
          empty="No sites opened yet."
        />
        <Table
          title="Pages"
          cols={['Views', 'Entries']}
          rows={a.pages.slice(0, 10).map(p => ({ key: p.path, label: p.path, value: p.views, cells: [p.views, p.landings] }))}
          empty="No views yet."
        />
        <Engagement e={a.engagement} />
        <Team team={a.team} lookalikes={a.lookalikes} reload={reload} />
      </div>
    </>
  )
}

/** A smooth line through the points that never overshoots (monotone cubic). */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : ''
  const n = pts.length, d: number[] = [], m: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]))
  m[0] = d[0]; m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i] }
  }
  let p = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = (x1 - x0) / 3
    p += `C${x0 + h},${y0 + m[i] * h} ${x1 - h},${y1 - m[i + 1] * h} ${x1},${y1}`
  }
  return p
}

/** A round axis top and a whole-number step, for 3–4 gridlines. */
function niceScale(max: number): { top: number; step: number } {
  const raw = Math.max(max, 1) / 3, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag
  const step = Math.max(1, Math.ceil((f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag))
  return { top: Math.max(step, Math.ceil(max / step) * step), step }
}

function AreaChart({ a, metric }: { a: Analytics; metric: Metric }) {
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(720)
  const [hover, setHover] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const slots = useMemo(() => {
    // Every slot in the period, so a quiet day reads as zero, not as a gap. Buckets are UTC.
    const step = a.bucket === 'hour' ? 3600e3 : 86400e3
    const count = a.bucket === 'hour' ? 24 : a.days
    const end = new Date()
    if (a.bucket === 'hour') end.setUTCMinutes(0, 0, 0)
    else end.setUTCHours(0, 0, 0, 0)
    const key = (iso: string) => a.bucket === 'hour' ? iso.slice(0, 13) : iso.slice(0, 10)
    const by = new Map(a.series.map(s => [key(s.at), s]))
    return Array.from({ length: count }, (_, i) => {
      const at = new Date(end.getTime() - (count - 1 - i) * step)
      const s = by.get(key(at.toISOString()))
      return { at, visitors: s?.visitors ?? 0, views: s?.views ?? 0, clicks: s?.clicks ?? 0, prevVisitors: s?.prevVisitors ?? 0, prevViews: s?.prevViews ?? 0, prevClicks: s?.prevClicks ?? 0 }
    })
  }, [a])

  const prevKey = (`prev${metric[0].toUpperCase()}${metric.slice(1)}`) as 'prevVisitors' | 'prevViews' | 'prevClicks'
  const cur = slots.map(s => s[metric]), prev = slots.map(s => s[prevKey])
  const { top, step } = niceScale(Math.max(...cur, ...prev, 1))
  const H = 220, padL = 36, padR = 8, padT = 12, padB = 26
  const iw = Math.max(1, W - padL - padR), ih = H - padT - padB
  const x = (i: number) => padL + (slots.length === 1 ? iw / 2 : (i / (slots.length - 1)) * iw)
  const y = (v: number) => padT + ih - (v / top) * ih
  const line = smoothPath(cur.map((v, i) => [x(i), y(v)]))
  const before = smoothPath(prev.map((v, i) => [x(i), y(v)]))
  const area = line ? `${line}L${x(slots.length - 1)},${padT + ih}L${x(0)},${padT + ih}Z` : ''
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)

  const label = (d: Date, long = false) => a.bucket === 'hour'
    ? d.toLocaleTimeString('en', { hour: 'numeric', timeZone: 'UTC' }) + (long ? ' UTC' : '')
    : d.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC', ...(long ? { weekday: 'short' } : {}) })
  const xTicks = (() => {
    const want = W < 480 ? 3 : 6
    const every = Math.max(1, Math.ceil((slots.length - 1) / (want - 1)))
    const out: number[] = []
    for (let i = 0; i < slots.length; i += every) out.push(i)
    if (out[out.length - 1] !== slots.length - 1) {
      if (slots.length - 1 - out[out.length - 1] < every / 2) out.pop()
      out.push(slots.length - 1)
    }
    return out
  })()

  const unit = METRICS.find(m => m.id === metric)!.unit
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - padL) / iw) * (slots.length - 1))
    setHover(Math.max(0, Math.min(slots.length - 1, i)))
  }
  const h = hover != null ? slots[hover] : null
  const tipLeft = hover != null ? Math.min(Math.max(x(hover), padL + 70), W - 80) : 0

  return (
    <div ref={box} className="relative px-0 pt-3 pb-1 select-none">
      <svg width={W} height={H} className="block touch-none" role="img"
        aria-label={`${unit[1]} per ${a.bucket}, ${RANGE_LABEL[a.days]}`}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="an-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="text-foreground">
          {ticks.map(v => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v) + 0.5} y2={y(v) + 0.5} stroke="currentColor" strokeOpacity={v ? 0.07 : 0.16} />
              <text x={padL - 8} y={y(v)} dy="0.32em" textAnchor="end" fill="currentColor" fillOpacity="0.45" fontSize="11" className="tabular-nums">{compact(v)}</text>
            </g>
          ))}
          {xTicks.map(i => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === slots.length - 1 ? 'end' : 'middle'} fill="currentColor" fillOpacity="0.45" fontSize="11" className="tabular-nums">{label(slots[i].at)}</text>
          ))}
          <path d={before} fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d={area} fill="url(#an-fill)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          {hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="currentColor" strokeOpacity="0.25" />
              <circle cx={x(hover)} cy={y(prev[hover])} r="3" fill="var(--popover)" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
              <circle cx={x(hover)} cy={y(cur[hover])} r="4" fill="currentColor" stroke="var(--popover)" strokeWidth="2" />
            </>
          )}
        </g>
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-1 -translate-x-1/2 min-w-[150px] rounded-[10px] border border-edge-strong bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.08)] px-3 py-2"
          style={{ left: tipLeft }} aria-live="polite">
          <p className="text-[11.5px] text-ink-4 tabular-nums">{label(h.at, true)}</p>
          <p className="mt-1 flex items-center justify-between gap-4 text-[13px] tabular-nums">
            <span className="flex items-center gap-1.5 text-ink-3"><i className="w-2 h-2 rounded-full bg-foreground" />{unit[1][0].toUpperCase() + unit[1].slice(1)}</span>
            <span className="font-[620] text-ink">{fmt(h[metric])}</span>
          </p>
          <p className="mt-0.5 flex items-center justify-between gap-4 text-[12px] tabular-nums text-ink-4">
            <span>Period before</span><span>{fmt(h[prevKey])}</span>
          </p>
        </div>
      )}
    </div>
  )
}

interface Row { key: string; label: React.ReactNode; value: number; cells: number[] }

/** Ranked rows with a bar behind each, and one column heading per number. */
function Table({ title, cols, rows, empty, foot, top }: { title: string; cols: string[]; rows: Row[]; empty: string; foot?: string; top?: React.ReactNode }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}>
        <span>{title}</span>
        {rows.length > 0 && (
          <span className="flex">
            {cols.map(c => <span key={c} className="w-[58px] text-right text-[11px] text-ink-4">{c}</span>)}
          </span>
        )}
      </div>
      {top}
      <div className="flex-1">
        {!rows.length ? <p className={`${CARD.body} px-4 py-4`}>{empty}</p> : (
          <ul className="px-2 py-2">
            {rows.map(r => (
              <li key={r.key} className="relative flex items-center h-9 px-2 rounded-[8px] text-[13px]">
                <span aria-hidden className="absolute inset-y-1 left-0 rounded-[6px] bg-foreground/[0.055]" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
                <span className="relative flex-1 min-w-0 truncate text-ink-2 pr-3">{r.label}</span>
                {r.cells.map((c, i) => (
                  <span key={i} className={`relative w-[58px] text-right tabular-nums ${i === 0 ? 'text-ink font-[560]' : 'text-ink-4'}`}>{fmt(c)}</span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
      {foot && <div className={`${CARD.foot} px-4`}><span className={`${CARD.meta} truncate`}>{foot}</span></div>}
    </section>
  )
}

function Audience({ dims }: { dims: Analytics['dims'] }) {
  const tabs = [['device', 'Device'], ['browser', 'Browser'], ['os', 'System'], ['country', 'Country']] as const
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('device')
  const all = dims[tab]
  const total = all.reduce((s, d) => s + d.visitors, 0)
  const rows = all.slice(0, 8)
  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}>
        <span>Audience</span>
        <span role="tablist" aria-label="Breakdown" className="flex items-center gap-0.5 -mr-2">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`h-7 px-2 rounded-[8px] text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-pro ${tab === id ? 'bg-foreground/[0.07] text-ink' : 'text-ink-4 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </span>
      </div>
      {dims.country.length > 0 && <WorldMap countries={dims.country} name={countryName} />}
      {!rows.length ? <p className={`${CARD.body} px-4 py-4`}>No visitors yet.</p> : (
        <>
          {/* Cloudflare-style share bar: the whole audience at a glance. */}
          <div className="px-4 pt-3">
            <div className="flex h-2 rounded-full overflow-hidden gap-[2px]" aria-hidden>
              {rows.map((d, i) => <span key={d.name} className="h-full" style={{ width: `${(d.visitors / total) * 100}%`, background: `rgba(var(--foreground-rgb), ${0.85 - i * 0.1})` }} />)}
            </div>
          </div>
          <ul className="px-2 py-2">
            {rows.map((d, i) => (
              <li key={d.name} className="flex items-center h-8 px-2 text-[13px]">
                <i aria-hidden className="w-2 h-2 rounded-[3px] mr-2.5 shrink-0" style={{ background: `rgba(var(--foreground-rgb), ${0.85 - i * 0.1})` }} />
                <span className="flex-1 min-w-0 truncate text-ink-2 pr-3">{tab === 'country' ? countryName(d.name) : d.name}</span>
                <span className="w-[58px] text-right tabular-nums text-ink font-[560]">{fmt(d.visitors)}</span>
                <span className="w-[58px] text-right tabular-nums text-ink-4">{pct(d.visitors / total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Engagement({ e }: { e: Analytics['engagement'] }) {
  const items = [
    ['Came back', e.visitors ? pct(e.returning / e.visitors) : '—', 'of visitors'],
    ['Left after one page', pct(e.bounce), 'of visits'],
    ['Pages per visit', e.pagesPerSession ? e.pagesPerSession.toFixed(1) : '—', 'on average'],
    ['Typical visit', e.medianMinutes ? (e.medianMinutes < 1 ? `${Math.round(e.medianMinutes * 60)}s` : `${e.medianMinutes.toFixed(1)} min`) : '—', 'median'],
  ]
  return (
    <section className={CARD.shell}>
      <div className={CARD.head}>Engagement</div>
      <dl className="grid grid-cols-2">
        {items.map(([k, v, note], i) => (
          <div key={k} className={`px-4 py-4 border-edge-faint ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t' : ''}`}>
            <dt className="text-[12px] text-ink-4">{k}</dt>
            <dd className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[20px] leading-none font-[640] tracking-[-0.02em] tabular-nums text-ink">{v}</span>
              <span className="text-[11.5px] text-ink-4">{note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Team({ team, lookalikes, reload }: { team: Analytics['team']; lookalikes: Analytics['lookalikes']; reload: () => void }) {
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

  const max = Math.max(1, ...team.map(m => m.views + m.clicks))
  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}>
        <span>Team</span>
        {team.length > 0 && <span className="flex">{['Views', 'Clicks'].map(c => <span key={c} className="w-[58px] text-right text-[11px] text-ink-4">{c}</span>)}</span>}
      </div>
      <div className="flex-1">
        {!team.length ? <p className={`${CARD.body} px-4 py-4`}>No team visits in this period. Make a link, then open it once on each browser and phone you use.</p> : (
          <ul className="px-2 py-2">
            {team.map(m => (
              <li key={m.name} className="relative flex items-center h-9 px-2 text-[13px]">
                <span aria-hidden className="absolute inset-y-1 left-0 rounded-[6px] bg-foreground/[0.055]" style={{ width: `${Math.max(1.5, ((m.views + m.clicks) / max) * 100)}%` }} />
                <span className="relative flex-1 min-w-0 truncate text-ink-2 pr-3">{m.name}</span>
                <span className="relative w-[58px] text-right tabular-nums text-ink font-[560]">{fmt(m.views)}</span>
                <span className="relative w-[58px] text-right tabular-nums text-ink-4">{fmt(m.clicks)}</span>
              </li>
            ))}
          </ul>
        )}
        {lookalikes.setups.length > 0 && (
          <div className="border-t border-edge-faint px-4 pt-3 pb-2">
            <p className="text-[12px] font-[500] text-ink-3">Look like the team</p>
            <p className={`${CARD.meta} mt-0.5 text-pretty`}>No team link, but the same browser, system, device and country as one of you. Still counted as visitors.</p>
            <ul className="mt-2">
              {lookalikes.setups.map(x => (
                <li key={`${x.name}${x.browser}${x.os}${x.device}${x.country}`} className="flex items-center h-8 text-[13px]">
                  <span className="flex-1 min-w-0 truncate text-ink-2 pr-3">{x.name} <span className="text-ink-4">· {x.browser} · {x.os} · {x.device} · {countryName(x.country)}</span></span>
                  <span className="w-[58px] text-right tabular-nums text-ink font-[560]">{fmt(x.visitors)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {link && <p className={`${CARD.meta} px-4 pb-3 break-all`}>{link}</p>}
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
