// app/api/cron/x-post/route.ts
// The daily @hitmanslibrary post (cron, every day 14:00 UTC). Picks today's
// post from the library with lib/x/compose (templates over stored rows, no
// model), sends it, and records it in x_posts.
//
// Sends only when X_POSTING=on and the four X_* secrets are set; otherwise, or
// with ?dry=1, it answers with the post it would have sent.
import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { cleanTitle } from '@/lib/clean-title'
import { siteSlug } from '@/lib/site-slug'
import { nameColors } from '@/lib/tokens/roles'
import { siteName } from '@/lib/read/site-page'
import { composeDailyPost, type Candidate } from '@/lib/x/compose'
import { postToX, xCredsFromEnv } from '@/lib/x/client'

export const maxDuration = 30

const NOT_A_FONT = /^(true|false|null|undefined|inherit|initial|unset|normal|none|serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace)$/i

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sql = getSql()
  // ?dry=1&at=2026-11-22 previews the post a given day would get.
  const at = req.nextUrl.searchParams.get('at')
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'
  const now = dryRun && at && !Number.isNaN(Date.parse(at)) ? new Date(at + 'T14:00:00Z') : new Date()

  // Never twice in one day, whatever fires the route.
  const today = await sql`SELECT 1 FROM x_posts WHERE tweet_id IS NOT NULL AND posted_at > now() - interval '20 hours' LIMIT 1`
  if (today.length && !dryRun && req.nextUrl.searchParams.get('force') !== '1') return NextResponse.json({ done: true, skipped: 'already posted today' })

  const [sites, colors, fonts] = await Promise.all([
    sql`
      SELECT ds.id, ds.source_url, ds.source_name, ds.created_at,
             (SELECT max(p.posted_at) FROM x_posts p WHERE p.source_id = ds.id AND p.tweet_id IS NOT NULL) AS last_posted_at
      FROM design_sources ds
      WHERE ds.screenshot_url IS NOT NULL
    `,
    sql`SELECT source_id, hex_value, oklch, area_share FROM design_colors`,
    sql`SELECT source_id, font_family, role FROM design_typography WHERE role IN ('heading', 'body', 'mono')`,
  ])
  const colorsBy = new Map<number, any[]>()
  for (const c of colors as any[]) (colorsBy.get(c.source_id) ?? colorsBy.set(c.source_id, []).get(c.source_id)!).push(c)
  const fontsBy = new Map<number, { role: string; family: string }[]>()
  for (const f of fonts as any[]) {
    const family = String(f.font_family ?? '').replace(/^["']|["']$/g, '').trim()
    if (family.length < 2 || NOT_A_FONT.test(family)) continue
    ;(fontsBy.get(f.source_id) ?? fontsBy.set(f.source_id, []).get(f.source_id)!).push({ role: f.role, family })
  }

  const cands: Candidate[] = (sites as any[]).map(s => ({
    id: s.id,
    name: siteName(cleanTitle(s.source_name, s.source_url), s.source_url),
    slug: siteSlug(s.source_url),
    addedAt: new Date(s.created_at).toISOString(),
    colors: nameColors(colorsBy.get(s.id) ?? []).map(c => ({ role: c.role, hex: c.hex })),
    fonts: fontsBy.get(s.id) ?? [],
    lastPostedAt: s.last_posted_at ? new Date(s.last_posted_at).toISOString() : null,
  }))

  const post = composeDailyPost(cands, now)
  if (!post) return NextResponse.json({ done: true, skipped: 'nothing to post' })

  const creds = xCredsFromEnv()
  const live = process.env.X_POSTING === 'on' && creds && !dryRun
  if (!live) return NextResponse.json({ done: true, dry: true, post, reason: creds ? undefined : 'X credentials not set' })

  try {
    const { id } = await postToX(post.text, creds)
    await sql`INSERT INTO x_posts (kind, source_id, text, tweet_id) VALUES (${post.kind}, ${post.sourceId}, ${post.text}, ${id})`
    return NextResponse.json({ done: true, posted: id, post })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sql`INSERT INTO x_posts (kind, source_id, text, error) VALUES (${post.kind}, ${post.sourceId}, ${post.text}, ${message.slice(0, 500)})`
    console.error('[x-post]', message)
    return NextResponse.json({ error: 'Post failed', detail: message.slice(0, 200) }, { status: 502 })
  }
}
