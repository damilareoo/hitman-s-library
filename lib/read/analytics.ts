// lib/read/analytics.ts
// What /admin/analytics shows, read from `hits` (our own counter). Every
// figure is split into people and team: a visitor counts as team if any hit
// from that browser ever carried a team cookie, so visits from before the
// "this is me" link was opened are moved to the team side too.
import { getSql } from '@/lib/db'

export const RANGES = [1, 7, 30, 90] as const
export type Range = (typeof RANGES)[number]

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
  SELECT DISTINCT ON (session) session, visitor, source, referrer, campaign, path AS landed_on, who, cur
  FROM h WHERE landing ORDER BY session, at
)`

const SITE_NAME = `CASE WHEN h.site ~ '^[0-9]+$'
  THEN coalesce(regexp_replace(ds.source_url, '^https?://(www\\.)?([^/?#]+).*$', '\\2'), h.site)
  ELSE h.site END`

const n = (v: unknown) => Number(v ?? 0)

export interface Analytics {
  days: Range
  updatedAt: string
  totals: Record<'views' | 'visitors' | 'sessions' | 'clicks' | 'teamViews' | 'teamClicks', { now: number; before: number }>
  series: { at: string; people: number; team: number; visitors: number }[]
  bucket: 'hour' | 'day'
  sources: { name: string; sessions: number; visitors: number; clicks: number; isNew: boolean }[]
  campaigns: { name: string; sessions: number }[]
  dims: Record<'device' | 'browser' | 'os' | 'country', { name: string; visitors: number }[]>
  pages: { path: string; views: number; landings: number }[]
  sites: { name: string; views: number; opens: number; outbound: number; takes: number }[]
  clicks: { kind: string; people: number; team: number }[]
  funnel: { step: string; visitors: number }[]
  engagement: { returning: number; visitors: number; bounce: number; pagesPerSession: number; medianMinutes: number }
  team: { name: string; views: number; clicks: number; lastSeen: string }[]
  insights: string[]
}

export async function loadAnalytics(days: Range): Promise<Analytics> {
  const sql = getSql()
  const q = (body: string) => sql.query(`${BASE} ${body}`, [days]) as Promise<any[]>
  const bucket = days === 1 ? 'hour' : 'day'

  const [totals, series, sources, campaigns, dims, pages, sites, clicks, funnel, engagement, returning, team] = await Promise.all([
    q(`SELECT cur,
         count(*) FILTER (WHERE kind = 'view' AND who IS NULL) AS views,
         count(DISTINCT visitor) FILTER (WHERE who IS NULL) AS visitors,
         count(DISTINCT session) FILTER (WHERE who IS NULL) AS sessions,
         count(*) FILTER (WHERE kind <> 'view' AND who IS NULL) AS clicks,
         count(*) FILTER (WHERE kind = 'view' AND who IS NOT NULL) AS team_views,
         count(*) FILTER (WHERE kind <> 'view' AND who IS NOT NULL) AS team_clicks
       FROM h GROUP BY cur`),
    q(`SELECT date_trunc('${bucket}', at) AS at,
         count(*) FILTER (WHERE kind = 'view' AND who IS NULL) AS people,
         count(*) FILTER (WHERE kind = 'view' AND who IS NOT NULL) AS team,
         count(DISTINCT visitor) FILTER (WHERE who IS NULL) AS visitors
       FROM h WHERE cur GROUP BY 1 ORDER BY 1`),
    q(`, seen AS (SELECT DISTINCT source FROM hits WHERE landing AND at <= now() - make_interval(days => $1::int))
       SELECT s.source AS name, count(DISTINCT s.session) AS sessions, count(DISTINCT s.visitor) AS visitors,
         count(h.id) FILTER (WHERE h.kind <> 'view') AS clicks,
         bool_and(seen.source IS NULL) AS is_new
       FROM s JOIN h USING (session) LEFT JOIN seen ON seen.source = s.source
       WHERE s.cur AND s.who IS NULL AND h.cur
       GROUP BY 1 ORDER BY 2 DESC LIMIT 20`),
    q(`SELECT campaign AS name, count(*) AS sessions FROM s WHERE cur AND who IS NULL AND campaign IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
    q(`SELECT dim, name, visitors FROM (
         SELECT 'device' AS dim, device AS name, count(DISTINCT visitor) AS visitors FROM h WHERE cur AND who IS NULL GROUP BY 2
         UNION ALL SELECT 'browser', browser, count(DISTINCT visitor) FROM h WHERE cur AND who IS NULL GROUP BY 2
         UNION ALL SELECT 'os', os, count(DISTINCT visitor) FROM h WHERE cur AND who IS NULL GROUP BY 2
         UNION ALL SELECT 'country', coalesce(country, '??'), count(DISTINCT visitor) FROM h WHERE cur AND who IS NULL GROUP BY 2
       ) d ORDER BY dim, visitors DESC`),
    q(`SELECT path, count(*) FILTER (WHERE kind = 'view') AS views, count(*) FILTER (WHERE landing) AS landings
       FROM h WHERE cur AND who IS NULL AND path IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 12`),
    q(`SELECT ${SITE_NAME} AS name,
         count(*) FILTER (WHERE h.kind = 'view') AS views,
         count(*) FILTER (WHERE h.kind = 'open') AS opens,
         count(*) FILTER (WHERE h.kind = 'outbound') AS outbound,
         count(*) FILTER (WHERE h.kind IN ('export', 'copy')) AS takes
       FROM h LEFT JOIN design_sources ds ON ds.id::text = h.site
       WHERE h.cur AND h.who IS NULL AND h.site IS NOT NULL
       GROUP BY 1 ORDER BY count(*) FILTER (WHERE h.kind IN ('view', 'open')) DESC, 1 LIMIT 15`),
    q(`SELECT kind, count(*) FILTER (WHERE who IS NULL) AS people, count(*) FILTER (WHERE who IS NOT NULL) AS team
       FROM h WHERE cur AND kind <> 'view' GROUP BY 1 ORDER BY 2 DESC, 3 DESC`),
    q(`SELECT
         count(DISTINCT visitor) AS visited,
         count(DISTINCT visitor) FILTER (WHERE kind = 'open' OR path LIKE '/site/%') AS opened,
         count(DISTINCT visitor) FILTER (WHERE kind IN ('copy', 'export')) AS took,
         count(DISTINCT visitor) FILTER (WHERE kind = 'outbound') AS outbound,
         count(DISTINCT visitor) FILTER (WHERE kind = 'pricing_viewed' OR path = '/pro') AS pricing,
         count(DISTINCT visitor) FILTER (WHERE kind = 'checkout_opened') AS checkout,
         count(DISTINCT visitor) FILTER (WHERE kind = 'upgraded') AS upgraded
       FROM h WHERE cur AND who IS NULL`),
    q(`SELECT count(*) AS sessions,
         count(*) FILTER (WHERE hits = 1) AS bounced,
         coalesce(avg(views), 0) AS pages,
         coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs) FILTER (WHERE hits > 1), 0) AS median_secs
       FROM (SELECT session, count(*) AS hits, count(*) FILTER (WHERE kind = 'view') AS views,
               extract(epoch FROM max(at) - min(at)) AS secs
             FROM h WHERE cur AND who IS NULL GROUP BY session) x`),
    q(`, cv AS (SELECT DISTINCT visitor FROM h WHERE cur AND who IS NULL)
       SELECT count(*) AS visitors,
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM hits o WHERE o.visitor = cv.visitor AND o.at <= now() - make_interval(days => $1::int))
                          OR (SELECT count(DISTINCT session) FROM h WHERE h.visitor = cv.visitor AND h.cur) > 1) AS returning
       FROM cv`),
    q(`SELECT who AS name, count(*) FILTER (WHERE kind = 'view') AS views, count(*) FILTER (WHERE kind <> 'view') AS clicks, max(at) AS last_seen
       FROM h WHERE cur AND who IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`),
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
    updatedAt: new Date().toISOString(),
    bucket,
    totals: {
      views: pair('views'), visitors: pair('visitors'), sessions: pair('sessions'), clicks: pair('clicks'),
      teamViews: pair('team_views'), teamClicks: pair('team_clicks'),
    },
    series: series.map(r => ({ at: new Date(r.at).toISOString(), people: n(r.people), team: n(r.team), visitors: n(r.visitors) })),
    sources: sources.map(r => ({ name: r.name ?? 'Direct', sessions: n(r.sessions), visitors: n(r.visitors), clicks: n(r.clicks), isNew: Boolean(r.is_new) })),
    campaigns: campaigns.map(r => ({ name: r.name, sessions: n(r.sessions) })),
    dims: dimsOut,
    pages: pages.map(r => ({ path: r.path, views: n(r.views), landings: n(r.landings) })),
    sites: sites.map(r => ({ name: r.name, views: n(r.views), opens: n(r.opens), outbound: n(r.outbound), takes: n(r.takes) })),
    clicks: clicks.map(r => ({ kind: r.kind, people: n(r.people), team: n(r.team) })),
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
    insights: [],
  }
  out.insights = insightsFor(out)
  return out
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
