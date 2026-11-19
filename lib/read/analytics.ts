// lib/read/analytics.ts
// What /admin/analytics shows, read from `hits` (our own counter). Every
// figure is split into people and team: a visitor counts as team if any hit
// from that browser ever carried a team cookie, so visits from before the
// "this is me" link was opened are moved to the team side too.
import { getSql } from '@/lib/db'

export const RANGES = [1, 7, 30, 90] as const
export type Range = (typeof RANGES)[number]

/** Whose visits the page counts: people (no team cookie), everyone, or one teammate by name. */
export type Who = 'people' | 'all' | { member: string }

// $1 = days. `h` holds this period and the one before it (`cur` marks which).
const BASE = `
WITH tv AS (SELECT visitor, max(team) AS team FROM hits WHERE team IS NOT NULL GROUP BY visitor),
h AS (
  SELECT hits.id, hits.at, hits.kind, hits.visitor, hits.session, hits.path, hits.site, hits.target,
         hits.source, hits.referrer, hits.campaign, hits.landing, hits.device, hits.browser, hits.os, hits.country,
         coalesce(hits.team, tv.team) AS who,
         hits.at > now() - make_interval(days => $1::int) AS cur
  FROM hits LEFT JOIN tv USING (visitor)
  WHERE hits.at > now() - make_interval(days => 2 * $1::int)
),
s AS (
  SELECT DISTINCT ON (session) session, visitor, at, source, referrer, campaign, path AS landed_on, who, cur
  FROM h WHERE landing ORDER BY session, at
)`

const SITE_NAME = `CASE WHEN h.site ~ '^[0-9]+$'
  THEN coalesce(regexp_replace(ds.source_url, '^https?://(www\\.)?([^/?#]+).*$', '\\2'), h.site)
  ELSE h.site END`

const n = (v: unknown) => Number(v ?? 0)

export interface Analytics {
  days: Range
  updatedAt: string
  who: 'people' | 'all' | string
  /** Every teammate name ever seen, for the filter. */
  members: string[]
  totals: Record<'views' | 'visitors' | 'sessions' | 'clicks' | 'teamViews' | 'teamClicks', { now: number; before: number }>
  /** One row per bucket of this period; `prev*` is the same slot one period earlier. */
  series: { at: string; views: number; visitors: number; clicks: number; prevViews: number; prevVisitors: number; prevClicks: number }[]
  bucket: 'hour' | 'day'
  /** Hour by hour (UTC) for the period, for the when-people-visit heatmap; the page shifts it to local time. */
  hours: { at: string; views: number; visitors: number }[]
  /** New visitors per bucket by where they came from, for sources over time. */
  sourceSeries: { at: string; source: string; visitors: number }[]
  sources: { name: string; sessions: number; visitors: number; clicks: number; isNew: boolean }[]
  campaigns: { name: string; sessions: number }[]
  dims: Record<'device' | 'browser' | 'os' | 'country', { name: string; visitors: number }[]>
  pages: { path: string; views: number; landings: number }[]
  sites: { name: string; views: number; opens: number; outbound: number; takes: number }[]
  clicks: { kind: string; count: number; visitors: number }[]
  funnel: { step: string; visitors: number }[]
  engagement: { returning: number; visitors: number; bounce: number; pagesPerSession: number; medianMinutes: number }
  team: { name: string; views: number; clicks: number; lastSeen: string }[]
  /**
   * Visitors counted as people whose browser setup (browser, system, device,
   * country) matches one seen on a team-linked browser. A guess, so the page
   * shows them beside the totals rather than taking them out. Visitors view only.
   */
  lookalikes: { visitors: number; setups: { name: string; browser: string; os: string; device: string; country: string; visitors: number }[] }
  insights: string[]
}

export async function loadAnalytics(days: Range, who: Who = 'people'): Promise<Analytics> {
  const sql = getSql()
  const member = typeof who === 'object' ? who.member : null
  const params = member ? [days, member] : [days]
  const q = (body: string) => sql.query(`${BASE} ${body}`, params) as Promise<any[]>
  // For queries that don't take the filter: Postgres rejects a parameter it can't place.
  const qAll = (body: string) => sql.query(`${BASE} ${body}`, [days]) as Promise<any[]>
  const bucket = days === 1 ? 'hour' : 'day'
  // The filter, for a table alias ('' for bare h). Team-only figures below ignore it.
  const W = (t = '') => member ? `${t}who = $2` : who === 'all' ? 'TRUE' : `${t}who IS NULL`

  const [totals, series, sources, campaigns, dims, pages, sites, clicks, funnel, engagement, returning, team, members, hours, sourceSeries, lookalikes] = await Promise.all([
    q(`SELECT cur,
         count(*) FILTER (WHERE kind = 'view' AND ${W()}) AS views,
         count(DISTINCT visitor) FILTER (WHERE ${W()}) AS visitors,
         count(DISTINCT session) FILTER (WHERE ${W()}) AS sessions,
         count(*) FILTER (WHERE kind <> 'view' AND ${W()}) AS clicks,
         count(*) FILTER (WHERE kind = 'view' AND who IS NOT NULL) AS team_views,
         count(*) FILTER (WHERE kind <> 'view' AND who IS NOT NULL) AS team_clicks
       FROM h GROUP BY cur`),
    // The period before is shifted forward by one period so its slots line up with this one's.
    q(`SELECT date_trunc('${bucket}', CASE WHEN cur THEN at ELSE at + make_interval(days => $1::int) END) AS at, cur,
         count(*) FILTER (WHERE kind = 'view') AS views,
         count(DISTINCT visitor) AS visitors,
         count(*) FILTER (WHERE kind <> 'view') AS clicks
       FROM h WHERE ${W()} GROUP BY 1, 2 ORDER BY 1`),
    q(`, seen AS (SELECT DISTINCT source FROM hits WHERE landing AND at <= now() - make_interval(days => $1::int))
       SELECT s.source AS name, count(DISTINCT s.session) AS sessions, count(DISTINCT s.visitor) AS visitors,
         count(h.id) FILTER (WHERE h.kind <> 'view') AS clicks,
         bool_and(seen.source IS NULL) AS is_new
       FROM s JOIN h USING (session) LEFT JOIN seen ON seen.source = s.source
       WHERE s.cur AND ${W('s.')} AND h.cur
       GROUP BY 1 ORDER BY 2 DESC LIMIT 20`),
    q(`SELECT campaign AS name, count(*) AS sessions FROM s WHERE cur AND ${W()} AND campaign IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
    q(`SELECT dim, name, visitors FROM (
         SELECT 'device' AS dim, device AS name, count(DISTINCT visitor) AS visitors FROM h WHERE cur AND ${W()} GROUP BY 2
         UNION ALL SELECT 'browser', browser, count(DISTINCT visitor) FROM h WHERE cur AND ${W()} GROUP BY 2
         UNION ALL SELECT 'os', os, count(DISTINCT visitor) FROM h WHERE cur AND ${W()} GROUP BY 2
         UNION ALL SELECT 'country', coalesce(country, '??'), count(DISTINCT visitor) FROM h WHERE cur AND ${W()} GROUP BY 2
       ) d ORDER BY dim, visitors DESC`),
    q(`SELECT path, count(*) FILTER (WHERE kind = 'view') AS views, count(*) FILTER (WHERE landing) AS landings
       FROM h WHERE cur AND ${W()} AND path IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 12`),
    q(`SELECT ${SITE_NAME} AS name,
         count(*) FILTER (WHERE h.kind = 'view') AS views,
         count(*) FILTER (WHERE h.kind = 'open') AS opens,
         count(*) FILTER (WHERE h.kind = 'outbound') AS outbound,
         count(*) FILTER (WHERE h.kind IN ('export', 'copy')) AS takes
       FROM h LEFT JOIN design_sources ds ON ds.id::text = h.site
       WHERE h.cur AND ${W('h.')} AND h.site IS NOT NULL
       GROUP BY 1 ORDER BY count(*) FILTER (WHERE h.kind IN ('view', 'open')) DESC, 1 LIMIT 15`),
    q(`SELECT kind, count(*) AS count, count(DISTINCT visitor) AS visitors
       FROM h WHERE cur AND kind <> 'view' AND ${W()} GROUP BY 1 ORDER BY 2 DESC, 3 DESC`),
    q(`SELECT
         count(DISTINCT visitor) AS visited,
         count(DISTINCT visitor) FILTER (WHERE kind = 'open' OR path LIKE '/site/%') AS opened,
         count(DISTINCT visitor) FILTER (WHERE kind IN ('copy', 'export')) AS took,
         count(DISTINCT visitor) FILTER (WHERE kind = 'outbound') AS outbound,
         count(DISTINCT visitor) FILTER (WHERE kind = 'pricing_viewed' OR path = '/pro') AS pricing,
         count(DISTINCT visitor) FILTER (WHERE kind = 'checkout_opened') AS checkout,
         count(DISTINCT visitor) FILTER (WHERE kind = 'upgraded') AS upgraded
       FROM h WHERE cur AND ${W()}`),
    q(`SELECT count(*) AS sessions,
         count(*) FILTER (WHERE hits = 1) AS bounced,
         coalesce(avg(views), 0) AS pages,
         coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs) FILTER (WHERE hits > 1), 0) AS median_secs
       FROM (SELECT session, count(*) AS hits, count(*) FILTER (WHERE kind = 'view') AS views,
               extract(epoch FROM max(at) - min(at)) AS secs
             FROM h WHERE cur AND ${W()} GROUP BY session) x`),
    q(`, cv AS (SELECT DISTINCT visitor FROM h WHERE cur AND ${W()})
       SELECT count(*) AS visitors,
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM hits o WHERE o.visitor = cv.visitor AND o.at <= now() - make_interval(days => $1::int))
                          OR (SELECT count(DISTINCT session) FROM h WHERE h.visitor = cv.visitor AND h.cur) > 1) AS returning
       FROM cv`),
    qAll(`SELECT who AS name, count(*) FILTER (WHERE kind = 'view') AS views, count(*) FILTER (WHERE kind <> 'view') AS clicks, max(at) AS last_seen
       FROM h WHERE cur AND who IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`),
    sql.query(`SELECT DISTINCT team AS name FROM hits WHERE team IS NOT NULL ORDER BY 1`) as Promise<any[]>,
    q(`SELECT date_trunc('hour', at) AS at, count(*) FILTER (WHERE kind = 'view') AS views, count(DISTINCT visitor) AS visitors
       FROM h WHERE cur AND ${W()} GROUP BY 1 ORDER BY 1`),
    q(`SELECT date_trunc('${bucket}', at) AS at, coalesce(source, 'Direct') AS source, count(DISTINCT visitor) AS visitors
       FROM s WHERE cur AND ${W()} GROUP BY 1, 2 ORDER BY 1`),
    // Each teammate's setups (browser, system, device, country), learned from their
    // team-linked visits; then people this period on one of those setups.
    who === 'people' ? qAll(`, ts AS (SELECT DISTINCT team AS name, browser, os, device, country FROM hits WHERE team IS NOT NULL),
       m AS (SELECT h.visitor, ts.name, h.browser, h.os, h.device, coalesce(h.country, '??') AS country
             FROM h JOIN ts ON ts.browser IS NOT DISTINCT FROM h.browser AND ts.os IS NOT DISTINCT FROM h.os
                           AND ts.device IS NOT DISTINCT FROM h.device AND ts.country IS NOT DISTINCT FROM h.country
             WHERE h.cur AND h.who IS NULL)
       SELECT name, browser, os, device, country, count(DISTINCT visitor) AS visitors,
              (SELECT count(DISTINCT visitor) FROM m) AS total
       FROM m GROUP BY 1, 2, 3, 4, 5 ORDER BY 6 DESC`) : Promise.resolve([] as any[]),
  ])

  const pick = (cur: boolean) => totals.find(r => r.cur === cur) ?? {}
  const [a, b] = [pick(true), pick(false)]
  const pair = (k: string) => ({ now: n(a[k]), before: n(b[k]) })

  const dimsOut = { device: [], browser: [], os: [], country: [] } as Analytics['dims']
  for (const r of dims) (dimsOut as any)[r.dim]?.push({ name: r.name ?? 'Other', visitors: n(r.visitors) })

  const f = funnel[0] ?? {}
  const e = engagement[0] ?? {}
  const sessions = n(e.sessions)

  const out: Analytics = {
    days,
    who: member ?? (who as 'people' | 'all'),
    members: members.map(r => r.name),
    updatedAt: new Date().toISOString(),
    bucket,
    totals: {
      views: pair('views'), visitors: pair('visitors'), sessions: pair('sessions'), clicks: pair('clicks'),
      teamViews: pair('team_views'), teamClicks: pair('team_clicks'),
    },
    series: mergeSeries(series),
    hours: hours.map(r => ({ at: new Date(r.at).toISOString(), views: n(r.views), visitors: n(r.visitors) })),
    sourceSeries: sourceSeries.map(r => ({ at: new Date(r.at).toISOString(), source: r.source, visitors: n(r.visitors) })),
    sources: sources.map(r => ({ name: r.name ?? 'Direct', sessions: n(r.sessions), visitors: n(r.visitors), clicks: n(r.clicks), isNew: Boolean(r.is_new) })),
    campaigns: campaigns.map(r => ({ name: r.name, sessions: n(r.sessions) })),
    dims: dimsOut,
    pages: pages.map(r => ({ path: r.path, views: n(r.views), landings: n(r.landings) })),
    sites: sites.map(r => ({ name: r.name, views: n(r.views), opens: n(r.opens), outbound: n(r.outbound), takes: n(r.takes) })),
    clicks: clicks.map(r => ({ kind: r.kind, count: n(r.count), visitors: n(r.visitors) })),
    funnel: [
      { step: 'Visited', visitors: n(f.visited) },
      { step: 'Opened a site', visitors: n(f.opened) },
      { step: 'Copied or exported', visitors: n(f.took) },
      { step: 'Visited a real site', visitors: n(f.outbound) },
      { step: 'Saw Pro pricing', visitors: n(f.pricing) },
      { step: 'Opened checkout', visitors: n(f.checkout) },
      { step: 'Upgraded', visitors: n(f.upgraded) },
    ],
    engagement: {
      visitors: n(returning[0]?.visitors),
      returning: n(returning[0]?.returning),
      bounce: sessions ? n(e.bounced) / sessions : 0,
      pagesPerSession: n(e.pages),
      medianMinutes: n(e.median_secs) / 60,
    },
    team: team.map(r => ({ name: r.name, views: n(r.views), clicks: n(r.clicks), lastSeen: new Date(r.last_seen).toISOString() })),
    lookalikes: {
      visitors: n(lookalikes[0]?.total),
      setups: lookalikes.map(r => ({ name: r.name, browser: r.browser ?? 'Unknown', os: r.os ?? 'Unknown', device: r.device ?? 'Unknown', country: r.country, visitors: n(r.visitors) })),
    },
    insights: [],
  }
  // Insights read as statements about real visitors, so only that view gets them.
  out.insights = who === 'people' ? insightsFor(out) : []
  return out
}

/** This period's slots and the shifted period-before slots, joined on the slot. */
function mergeSeries(rows: any[]): Analytics['series'] {
  const by = new Map<string, Analytics['series'][number]>()
  for (const r of rows) {
    const at = new Date(r.at).toISOString()
    const s = by.get(at) ?? { at, views: 0, visitors: 0, clicks: 0, prevViews: 0, prevVisitors: 0, prevClicks: 0 }
    if (r.cur) { s.views = n(r.views); s.visitors = n(r.visitors); s.clicks = n(r.clicks) }
    else { s.prevViews = n(r.views); s.prevVisitors = n(r.visitors); s.prevClicks = n(r.clicks) }
    by.set(at, s)
  }
  return [...by.values()].sort((a, b) => a.at.localeCompare(b.at))
}

const pct = (x: number) => `${Math.round(x * 100)}%`

/**
 * Plain lines on what Cloudflare and PostHog don't show: how much of the
 * traffic is the team, which platform brings people who actually click, what
 * the in-app browsers hide, where the funnel leaks.
 */
export function insightsFor(a: Analytics): string[] {
  const lines: string[] = []
  const t = a.totals
  const allViews = t.views.now + t.teamViews.now
  if (allViews && t.teamViews.now) {
    lines.push(`${pct(t.teamViews.now / allViews)} of all views were the team. Cloudflare and PostHog count these as visitors.`)
  }

  const ranked = a.sources.filter(s => s.sessions >= 3).map(s => ({ ...s, rate: s.clicks / s.sessions })).sort((x, y) => y.rate - x.rate)
  if (ranked.length >= 2) {
    const best = ranked[0]
    lines.push(`People from ${best.name} click the most: ${best.rate.toFixed(1)} clicks per visit.`)
  }
  const fresh = a.sources.filter(s => s.isNew && s.name !== 'Direct')
  if (fresh.length) lines.push(`New this period: ${fresh.slice(0, 3).map(s => s.name).join(', ')}.`)

  const inApp = a.dims.browser.filter(b => / app$/.test(b.name)).reduce((sum, b) => sum + b.visitors, 0)
  const visitors = t.visitors.now
  if (inApp && visitors) lines.push(`${pct(inApp / visitors)} of people browsed inside the X, LinkedIn or Instagram apps, which hide where they came from.`)

  const direct = a.sources.find(s => s.name === 'Direct')
  if (direct && visitors && direct.visitors / visitors > 0.5) {
    lines.push(`${pct(direct.visitors / visitors)} arrived with no source. Add ?ref=x or ?ref=linkedin to links you post.`)
  }

  const siteLandings = a.pages.filter(p => p.path.startsWith('/site/')).reduce((s, p) => s + p.landings, 0)
  if (siteLandings) lines.push(`${siteLandings} ${siteLandings === 1 ? "visit" : "visits"} started on a site's own page, from search or a shared link.`)

  const mobile = a.dims.device.find(d => d.name === 'Mobile')?.visitors ?? 0
  if (visitors && mobile / visitors >= 0.3) lines.push(`${pct(mobile / visitors)} of people were on a phone.`)

  const [visited, opened, took] = a.funnel.map(s => s.visitors)
  if (visited >= 5) {
    lines.push(`${pct(opened / visited)} of people opened a site, and ${pct(took / visited)} copied or exported something.`)
  }

  const looked = a.sites.find(s => s.views + s.opens >= 5 && s.takes === 0)
  if (looked) lines.push(`${looked.name} is looked at a lot but nobody copied from it yet.`)

  const eng = a.engagement
  if (eng.visitors >= 5) lines.push(`${pct(eng.returning / eng.visitors)} of people came back more than once. ${pct(eng.bounce)} of visits ended on the first page.`)

  if (t.views.before >= 10 && t.views.now) {
    const change = (t.views.now - t.views.before) / t.views.before
    if (Math.abs(change) >= 0.2) lines.push(`Views are ${change > 0 ? 'up' : 'down'} ${pct(Math.abs(change))} on the period before.`)
  }
  return lines
}
