'use client'

// The analytics page's secondary charts: when people visit (hour × day),
// where new visitors came from over time, where they are (dot map), and the
// visit-to-Pro flow. Sequential encodings use the ink at rising opacity so they
// sit in the page's monochrome; sources, the one categorical chart, use a fixed
// validated palette (dataviz reference slots 1–5, light and dark steps) and
// colour follows the source's name, never its rank.
import { useMemo, useState } from 'react'
import { CARD } from '@/components/member-card'
import type { Analytics } from '@/lib/read/analytics'
import WORLD from '@/lib/admin/world-dots.json'

const fmt = (v: number) => v.toLocaleString('en')
const pct = (v: number) => `${Math.round(v * 100)}%`
const plural = (v: number, one: string, many = one + 's') => `${fmt(v)} ${v === 1 ? one : many}`

/** Ink at an opacity for a sequential value: never fully invisible, sqrt so small counts still read. */
const inkFor = (v: number, max: number) => v <= 0 ? 'rgba(var(--foreground-rgb),0.06)' : `rgba(var(--foreground-rgb),${(0.22 + 0.73 * Math.sqrt(v / Math.max(1, max))).toFixed(3)})`

/** Tooltip shell shared by every chart. */
function Tip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-edge-strong bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.08)] px-3 py-2 text-[12.5px] whitespace-nowrap tabular-nums"
      style={{ left: x, top: y - 8 }}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* When people visit: 7 × 24, in the viewer's own time zone            */
/* ------------------------------------------------------------------ */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hourName = (h: number) => new Date(2026, 0, 5, h).toLocaleTimeString('en', { hour: 'numeric' })

export function Heatmap({ a }: { a: Analytics }) {
  const [hover, setHover] = useState<{ d: number; h: number; x: number; y: number } | null>(null)
  const { grid, max, best, total } = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0))
    for (const r of a.hours) {
      const t = new Date(r.at)
      grid[(t.getDay() + 6) % 7][t.getHours()] += r.visitors
    }
    let max = 0, best = { d: 0, h: 0, v: 0 }, total = 0
    grid.forEach((row, d) => row.forEach((v, h) => { total += v; if (v > max) max = v; if (v > best.v) best = { d, h, v } }))
    return { grid, max, best, total }
  }, [a.hours])
  const zone = useMemo(() => {
    try { return new Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? '' } catch { return '' }
  }, [])

  return (
    <section className={CARD.shell}>
      <div className={CARD.head}><span>When people visit</span><span className="text-[12px] text-ink-4">Visitors per hour · your time{zone ? `, ${zone}` : ''}</span></div>
      {!total ? <p className={`${CARD.body} px-4 py-4`}>No visits in this period.</p> : (
        <div className="relative px-4 pt-4 pb-3 overflow-x-auto" onPointerLeave={() => setHover(null)}>
          <div className="grid gap-[2px] min-w-[520px]" style={{ gridTemplateColumns: '34px repeat(24, minmax(0, 1fr))' }}>
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-[10.5px] text-ink-4 tabular-nums text-left leading-none pb-1.5">{h % 3 === 0 ? hourName(h).replace(' ', '').toLowerCase() : ''}</span>
            ))}
            {grid.map((row, d) => (
              <Row key={d} label={DAYS[d]}>
                {row.map((v, h) => (
                  <span key={h} role="img" aria-label={`${DAYS[d]} ${hourName(h)}: ${plural(v, 'visitor')}`}
                    className={`h-[18px] rounded-[3px] ${hover && hover.d === d && hover.h === h ? 'outline outline-2 outline-offset-1 outline-foreground/60' : ''}`}
                    style={{ background: inkFor(v, max) }}
                    onPointerEnter={e => {
                      const box = (e.currentTarget.offsetParent as HTMLElement).getBoundingClientRect(), r = e.currentTarget.getBoundingClientRect()
                      setHover({ d, h, x: r.left - box.left + r.width / 2, y: r.top - box.top })
                    }} />
                ))}
              </Row>
            ))}
          </div>
          {hover && (
            <Tip x={hover.x} y={hover.y}>
              <span className="text-ink-4">{DAYS[hover.d]} {hourName(hover.h)}–{hourName((hover.h + 1) % 24)}</span>
              <span className="ml-3 font-[620] text-ink">{plural(grid[hover.d][hover.h], 'visitor')}</span>
            </Tip>
          )}
        </div>
      )}
      {total > 0 && (
        <div className={`${CARD.foot} px-4 justify-between`}>
          <span className={`${CARD.meta} truncate`}>Busiest: {DAYS[best.d]} around {hourName(best.h)}. Post a little before then.</span>
          <span className={`${CARD.meta} flex items-center gap-1.5 shrink-0 max-sm:hidden`}>
            Fewer
            {[0.06, 0.3, 0.55, 0.8, 0.95].map(o => <i key={o} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: `rgba(var(--foreground-rgb),${o})` }} />)}
            More
          </span>
        </div>
      )}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-[11px] text-ink-4 self-center">{label}</span>
      {children}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Sources over time: stacked columns, colour by source name            */
/* ------------------------------------------------------------------ */

// Fixed per source so a source keeps its colour across periods and filters.
const SOURCE_SLOT: Record<string, number> = { Direct: 1, Google: 2, X: 3, TikTok: 4, LinkedIn: 5 }
const SLOT_VARS = ['--src-1', '--src-2', '--src-3', '--src-4', '--src-5']
const OTHER = 'rgba(var(--foreground-rgb),0.22)'
const VIZ_CSS = `
.an-viz { --src-1:#2a78d6; --src-2:#eb6834; --src-3:#1baf7a; --src-4:#eda100; --src-5:#e87ba4; }
.dark .an-viz { --src-1:#3987e5; --src-2:#d95926; --src-3:#199e70; --src-4:#c98500; --src-5:#d55181; }`

export function SourcesOverTime({ a }: { a: Analytics }) {
  const [hover, setHover] = useState<number | null>(null)
  const model = useMemo(() => {
    const step = a.bucket === 'hour' ? 3600e3 : 86400e3
    const count = a.bucket === 'hour' ? 24 : a.days
    const end = new Date()
    if (a.bucket === 'hour') end.setUTCMinutes(0, 0, 0); else end.setUTCHours(0, 0, 0, 0)
    const key = (iso: string) => a.bucket === 'hour' ? iso.slice(0, 13) : iso.slice(0, 10)

    const totals = new Map<string, number>()
    for (const r of a.sourceSeries) totals.set(r.source, (totals.get(r.source) ?? 0) + r.visitors)
    // Up to four named series; known sources keep their slot, the rest fold into Other.
    const ranked = [...totals.entries()].sort((x, y) => y[1] - x[1]).map(([n]) => n)
    const named = ranked.filter(n => n in SOURCE_SLOT).slice(0, 4)
    const series = [...named, ...(ranked.some(n => !named.includes(n)) ? ['Other'] : [])]
    const color = (n: string) => n === 'Other' ? OTHER : `var(${SLOT_VARS[SOURCE_SLOT[n] - 1]})`

    const slots = Array.from({ length: count }, (_, i) => {
      const at = new Date(end.getTime() - (count - 1 - i) * step)
      return { at, k: key(at.toISOString()), v: Object.fromEntries(series.map(s => [s, 0])) as Record<string, number> }
    })
    const byKey = new Map(slots.map(s => [s.k, s]))
    for (const r of a.sourceSeries) {
      const s = byKey.get(key(r.at)); if (!s) continue
      const name = named.includes(r.source) ? r.source : 'Other'
      s.v[name] += r.visitors
    }
    const sum = (n: string) => slots.reduce((t, s) => t + s.v[n], 0)
    return { slots, series, color, sum, max: Math.max(1, ...slots.map(s => series.reduce((t, n) => t + s.v[n], 0))) }
  }, [a])

  const label = (d: Date) => a.bucket === 'hour'
    ? d.toLocaleTimeString('en', { hour: 'numeric', timeZone: 'UTC' })
    : d.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const H = 120, n = model.slots.length
  const total = model.series.reduce((t, s) => t + model.sum(s), 0)
  if (!total) return null
  const h = hover != null ? model.slots[hover] : null

  return (
    <div className="an-viz px-4 pt-3 pb-1 border-b border-edge">
      <style>{VIZ_CSS}</style>
      {/* Legend with totals: names never rely on colour alone. */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-3 tabular-nums">
        {model.series.map(s => (
          <li key={s} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: model.color(s) }} />{s}<span className="text-ink-4">{fmt(model.sum(s))}</span></li>
        ))}
      </ul>
      <div className="relative mt-3" onPointerLeave={() => setHover(null)}>
        <div className="flex items-end h-[120px]" style={{ gap: n > 40 ? 1 : 3 }}>
          {model.slots.map((s, i) => {
            const t = model.series.reduce((x, k) => x + s.v[k], 0)
            return (
              <div key={s.k} className="relative flex-1 h-full flex flex-col-reverse gap-[2px]"
                style={{ opacity: hover != null && hover !== i ? 0.5 : 1 }}
                onPointerEnter={() => setHover(i)}>
                {t === 0 ? <span className="h-[2px] rounded-full bg-foreground/[0.08]" /> : model.series.filter(k => s.v[k] > 0).map((k, j, arr) => (
                  <span key={k} style={{ height: `${(s.v[k] / model.max) * (H - 2 * arr.length)}px`, background: model.color(k) }}
                    className={j === arr.length - 1 ? 'rounded-t-[4px]' : ''} />
                ))}
              </div>
            )
          })}
        </div>
        {h && hover != null && (
          <div className="pointer-events-none absolute z-10 -top-2 -translate-y-full rounded-[10px] border border-edge-strong bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.08)] px-3 py-2 text-[12.5px] tabular-nums min-w-[140px]"
            style={{ left: `clamp(0px, calc(${((hover + 0.5) / n) * 100}% - 70px), calc(100% - 140px))` }}>
            <p className="text-ink-4">{label(h.at)}</p>
            {model.series.map(k => (
              <p key={k} className="mt-0.5 flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-ink-3"><i className="w-2 h-2 rounded-[2px]" style={{ background: model.color(k) }} />{k}</span>
                <span className="text-ink font-[560]">{fmt(h.v[k])}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <div className={`${CARD.meta} flex justify-between mt-1.5 tabular-nums`}>
        <span>{label(model.slots[0].at)}</span><span>{label(model.slots[n - 1].at)}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* World: dot map, one dot per land cell, shaded by visitors            */
/* ------------------------------------------------------------------ */

const world = WORLD as { w: number; h: number; step: number; codes: string[]; dots: number[] }

export function WorldMap({ countries, name }: { countries: { name: string; visitors: number }[]; name: (code: string) => string }) {
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null)
  const by = useMemo(() => new Map(countries.map(c => [c.name, c.visitors])), [countries])
  const max = Math.max(1, ...countries.map(c => c.visitors))
  const dots = useMemo(() => {
    const out: { x: number; y: number; code: string }[] = []
    for (let i = 0; i < world.dots.length; i += 3) out.push({ x: world.dots[i], y: world.dots[i + 1], code: world.codes[world.dots[i + 2]] })
    return out
  }, [])
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const sx = world.w / r.width, px = (e.clientX - r.left) * sx, py = (e.clientY - r.top) * sx
    let best: (typeof dots)[number] | null = null, bd = (world.step * 1.2) ** 2
    for (const d of dots) { const dd = (d.x - px) ** 2 + (d.y - py) ** 2; if (dd < bd) { bd = dd; best = d } }
    setHover(best ? { code: best.code, x: e.clientX - r.left, y: e.clientY - r.top } : null)
  }
  const v = hover ? by.get(hover.code) ?? 0 : 0
  return (
    <div className="relative px-4 pt-4">
      <svg viewBox={`0 0 ${world.w} ${world.h}`} className="w-full h-auto block touch-none" role="img"
        aria-label={`Visitors by country: ${countries.slice(0, 5).map(c => `${name(c.name)} ${c.visitors}`).join(', ')}`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {dots.map((d, i) => {
          const c = by.get(d.code) ?? 0
          const on = hover?.code === d.code
          return <circle key={i} cx={d.x} cy={d.y} r={world.step * 0.36} fill={c ? inkFor(c, max) : 'rgba(var(--foreground-rgb),0.14)'}
            stroke={on ? 'rgba(var(--foreground-rgb),0.9)' : undefined} strokeWidth={on ? 1.5 : undefined} />
        })}
      </svg>
      {hover && (
        <Tip x={hover.x + 16} y={hover.y + 16}>
          <span className="text-ink-3">{name(hover.code)}</span>
          <span className="ml-3 font-[620] text-ink">{plural(v, 'visitor')}</span>
        </Tip>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Visit to Pro: stepped bars with the drop between steps               */
/* ------------------------------------------------------------------ */

export function FunnelFlow({ steps }: { steps: Analytics['funnel'] }) {
  const top = steps[0]?.visitors || 0
  return (
    <section className={`${CARD.shell} flex flex-col`}>
      <div className={CARD.head}><span>From visit to Pro</span><span className="text-[12px] text-ink-4">Share of everyone who visited</span></div>
      {!top ? <p className={`${CARD.body} px-4 py-4`}>No visits yet.</p> : (
        <ol className="px-4 py-3">
          {steps.map((s, i) => {
            const prev = i ? steps[i - 1].visitors : 0
            const kept = prev ? s.visitors / prev : 1
            return (
              <li key={s.step}>
                {i > 0 && (
                  <p className="h-5 pl-[2px] flex items-center gap-1.5 text-[11px] text-ink-4 tabular-nums">
                    <span aria-hidden className="w-px h-full bg-edge-strong ml-[5px]" />
                    {prev ? (kept >= 1 ? 'all continued' : `${pct(1 - kept)} dropped off`) : '—'}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-[132px] shrink-0 text-[13px] text-ink-2 truncate">{s.step}</span>
                  <div className="flex-1 h-6 rounded-[6px] bg-foreground/[0.04] overflow-hidden">
                    <div className="h-full rounded-[6px]" style={{ width: `${Math.max(s.visitors ? 2 : 0, (s.visitors / top) * 100)}%`, background: `rgba(var(--foreground-rgb),${0.85 - i * 0.08})` }} />
                  </div>
                  <span className="w-[38px] text-right text-[13px] font-[560] text-ink tabular-nums">{fmt(s.visitors)}</span>
                  <span className="w-[38px] text-right text-[12px] text-ink-4 tabular-nums">{pct(s.visitors / top)}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
