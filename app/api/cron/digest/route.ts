// app/api/cron/digest/route.ts
// Taste radar weekly send (cron, Mondays 08:00 UTC). Zero curation: each
// subscriber gets the k new additions nearest their taste vector, rendered
// from stored rows. ?dry=1 reports what would send without sending.
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSql } from '@/lib/db'
import { cleanTitle } from '@/lib/clean-title'
import { UNSORTED, displayKind } from '@/lib/categories'
import { digestHtml, digestText, greetingLine, SITE_HOST, type DigestSite } from '@/lib/digest-email'

export const maxDuration = 60

const sql = getSql()
const BUDGET_MS = 50_000
const K = 5

/** "damilare.osei" → "Damilare". The list only holds emails, so the prefix
 *  is the kindest available name. */
function greetingName(email: string): string {
  const prefix = email.split('@')[0].split(/[._-]+/).filter(Boolean)[0] ?? ''
  return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'there'
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1'

  const subs = await sql`
    SELECT id, email, taste_vector::text AS vector, last_sent_at, unsub_token
    FROM taste_subscribers
    WHERE taste_vector IS NOT NULL
    ORDER BY id ASC
    LIMIT 100
  `
  if (!subs.length) return NextResponse.json({ done: true, sent: 0, message: 'No subscribers' })

  const resend = dry ? null : new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM ?? "Hitman's Library <digest@hitmanslibrary.xyz>"
  const start = Date.now()
  let sent = 0
  const preview: Array<{ email: string; sites: string[]; greeting?: string; html?: string }> = []

  for (const sub of subs) {
    if (Date.now() - start > BUDGET_MS) break
    const since: string = sub.last_sent_at ?? new Date(Date.now() - 7 * 864e5).toISOString()
    let neighbors: any[] = []
    try {
      neighbors = await sql.query(
        `SELECT ds.id, ds.source_url, ds.source_name, ds.kind, ds.screenshot_url, ds.thumbnail_optimized_url, ds.thumbnail_url,
                (SELECT COALESCE(array_agg(dc.hex_value ORDER BY dc.id) FILTER (WHERE dc.hex_value IS NOT NULL), '{}')
                 FROM design_colors dc WHERE dc.source_id = ds.id) AS colors
         FROM design_sources ds
         WHERE ds.created_at > $2 AND ds.screenshot_url IS NOT NULL AND ds.embedding IS NOT NULL
         ORDER BY ds.embedding <=> $1::vector
         LIMIT $3`,
        [sub.vector, since, K],
      )
    } catch (err) {
      console.error(`[digest] neighbor query failed for subscriber ${sub.id}:`, err)
      continue
    }
    if (!neighbors.length) {
      if (!dry) await sql`UPDATE taste_subscribers SET last_sent_at = NOW() WHERE id = ${sub.id}`.catch(() => null)
      continue
    }
    const sites = neighbors.map((n: any) => ({
      id: Number(n.id),
      title: cleanTitle(n.source_name, n.source_url),
      kind: displayKind(n.kind || UNSORTED),
      thumbnail: n.thumbnail_optimized_url || n.screenshot_url || n.thumbnail_url || null,
      url: n.source_url as string,
      colors: Array.isArray(n.colors) ? (n.colors as string[]).slice(0, 5) : [],
    }))
    if (dry) {
      const name = greetingName(sub.email as string)
      preview.push({
        email: sub.email as string,
        greeting: `Hi ${name}, ` + greetingLine(sites.map(s => s.title)),
        html: digestHtml(name, sites, `${SITE_HOST}/unsubscribe?token=${sub.unsub_token}`),
        sites: sites.map(s => s.title),
      })
      continue
    }
    try {
      const name = greetingName(sub.email as string)
      const unsubUrl = `${SITE_HOST}/unsubscribe?token=${sub.unsub_token}`
      const { error } = await resend!.emails.send({
        from,
        to: sub.email as string,
        subject: `New sites you'll like (${sites.length})`,
        html: digestHtml(name, sites, unsubUrl),
        text: digestText(name, sites, unsubUrl),
        // List-unsubscribe + one-click: inbox providers weigh these heavily,
        // and Apple/Gmail render native unsubscribe off them.
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      if (error) throw new Error(error.message)
      await sql`UPDATE taste_subscribers SET last_sent_at = NOW() WHERE id = ${sub.id}`.catch(() => null)
      sent++
    } catch (err) {
      console.error(`[digest] send failed for subscriber ${sub.id}:`, err)
    }
  }

  return NextResponse.json({ done: true, sent, ...(dry ? { preview } : {}) })
}
