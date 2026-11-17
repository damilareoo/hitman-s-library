// app/api/cron/x-post/route.ts
// The daily @hitmanslibrary post (cron, every day 14:00 UTC). Picks today's
// post from the library with lib/x/compose (templates over stored rows, no
// model), attaches the site's card when scripts/x-card.ts has rendered one,
// sends it, and records it in x_posts.
//
// Sends only when X_POSTING=on and the four X_* secrets are set; otherwise, or
// with ?dry=1, it answers with the post it would have sent. ?dry=1&at=YYYY-MM-DD
// previews another day.
import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { composeDailyPost } from '@/lib/x/compose'
import { loadCandidates, postTime } from '@/lib/x/candidates'
import { postToX, uploadImage, xCredsFromEnv } from '@/lib/x/client'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sql = getSql()
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'
  const at = req.nextUrl.searchParams.get('at')
  const now = dryRun && at ? postTime(at) : new Date()

  // Never twice in one day, whatever fires the route.
  if (!dryRun && req.nextUrl.searchParams.get('force') !== '1') {
    const today = await sql`SELECT 1 FROM x_posts WHERE tweet_id IS NOT NULL AND posted_at > now() - interval '20 hours' LIMIT 1`
    if (today.length) return NextResponse.json({ done: true, skipped: 'already posted today' })
  }

  const post = composeDailyPost(await loadCandidates(sql as never), now)
  if (!post) return NextResponse.json({ done: true, skipped: 'nothing to post' })
  const card = post.sourceId
    ? ((await sql`SELECT image_url FROM x_cards WHERE source_id = ${post.sourceId}`)[0] as { image_url: string } | undefined)?.image_url ?? null
    : null

  const creds = xCredsFromEnv()
  const live = process.env.X_POSTING === 'on' && creds && !dryRun
  if (!live) return NextResponse.json({ done: true, dry: true, post, card, reason: creds ? undefined : 'X credentials not set' })

  // A card that fails to load or upload never blocks the post.
  let mediaIds: string[] = []
  if (card) {
    try {
      const img = await fetch(card)
      if (!img.ok) throw new Error(`card ${img.status}`)
      mediaIds = [await uploadImage(await img.arrayBuffer(), img.headers.get('content-type') ?? 'image/png', creds)]
    } catch (err) {
      console.error('[x-post] card skipped:', err instanceof Error ? err.message : err)
    }
  }

  try {
    const { id } = await postToX(post.text, creds, fetch, mediaIds)
    await sql`INSERT INTO x_posts (kind, source_id, text, tweet_id) VALUES (${post.kind}, ${post.sourceId}, ${post.text}, ${id})`
    return NextResponse.json({ done: true, posted: id, withImage: mediaIds.length > 0, post })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sql`INSERT INTO x_posts (kind, source_id, text, error) VALUES (${post.kind}, ${post.sourceId}, ${post.text}, ${message.slice(0, 500)})`
    console.error('[x-post]', message)
    return NextResponse.json({ error: 'Post failed', detail: message.slice(0, 200) }, { status: 502 })
  }
}
