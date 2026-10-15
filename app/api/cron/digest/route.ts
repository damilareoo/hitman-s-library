// app/api/cron/digest/route.ts
// Taste radar weekly send (cron, Mondays 08:00 UTC). Zero curation: each
// subscriber gets the k new additions nearest their taste vector, rendered
// from stored rows. ?dry=1 reports what would send without sending.
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSql } from '@/lib/db'
import { cleanTitle } from '@/lib/clean-title'
import { UNSORTED, displayKind } from '@/lib/categories'

export const maxDuration = 60

const sql = getSql()
const BUDGET_MS = 50_000
const K = 5
const SITE_HOST = 'https://hitmanslibrary.xyz'
const SERIF_STACK = "Georgia, 'Times New Roman', serif"
const NEUTRAL_GROUND = '#f2f0ea'

function siteUrl(id: number): string {
  return `${SITE_HOST}/?site=${id}`
}

/** "Conduit | AI agents…" → "Conduit". Greeting names stay short like
 *  a person would say them; card titles keep their full form. */
export function shortName(title: string): string {
  const cut = title.split(/[|—–·:➔-]/)[0].trim()
  return cut || title
}

/** "damilare.osei" → "Damilare". The list only holds emails, so the prefix
 *  is the kindest available name. */
function greetingName(email: string): string {
  const prefix = email.split('@')[0].split(/[._-]+/).filter(Boolean)[0] ?? ''
  return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'there'
}

/** A tint derived from the site's own first palette color; neutral when the
 *  color is dark or missing, so text always sits readable. */
function tintFor(hex: string | null): string {
  if (!hex) return NEUTRAL_GROUND
  const m = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return NEUTRAL_GROUND
  const lum = (i: number) => {
    const v = parseInt(m.substr(i, 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const l = 0.2126 * lum(0) + 0.7152 * lum(2) + 0.0722 * lum(4)
  return l > 0.45 ? hex : NEUTRAL_GROUND
}

function greetingLine(names: string[]): string {
  if (names.length === 1) return `explore new design references from ${names[0]}.`
  if (names.length === 2) return `explore new design references from ${names[0]} and ${names[1]}.`
  names = names.map(shortName)
  if (names.length === 1) return `explore new design references from ${names[0]}.`
  if (names.length === 2) return `explore new design references from ${names[0]} and ${names[1]}.`
  if (names.length === 3) return `explore new design references from ${names[0]}, ${names[1]} and ${names[2]}.`
  return `explore new design references from ${names[0]}, ${names[1]}, ${names[2]} and more.`
}

interface DigestSite {
  id: number
  title: string
  kind: string
  thumbnail: string | null
  url: string
  accent: string | null
}

export function digestHtml(
  name: string,
  sites: DigestSite[],
  unsubUrl: string,
): string {
  // Group by kind in first-seen order: "New in AI", "New in Store", …
  const groups: Array<{ kind: string; sites: DigestSite[] }> = []
  for (const s of sites) {
    const g = groups.find(g => g.kind === s.kind)
    if (g) g.sites.push(s)
    else groups.push({ kind: s.kind, sites: [s] })
  }
  const sections = groups
    .map(
      g => `
      <p style="margin:28px 0 12px 0;font-family:${SERIF_STACK};font-size:24px;font-weight:700;color:#111;">New in ${g.kind}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${tintFor(g.sites[0]?.accent ?? null)};border-radius:14px;">
        <tr><td style="padding:20px;">
          ${g.sites
            .map(
              s => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background:#ffffff;border-radius:10px;border:1px solid #e5e5e5;">
            <tr><td style="padding:12px;">
              ${s.thumbnail ? `<a href="${siteUrl(s.id)}"><img src="${s.thumbnail}" alt="" width="536" style="display:block;width:100%;max-width:536px;border-radius:6px;border:1px solid #eeeeee;" /></a>` : ''}
              <p style="margin:10px 0 2px 0;font-size:17px;font-weight:600;">
                <a href="${siteUrl(s.id)}" style="color:#111;text-decoration:none;">${s.title}</a>
              </p>
              <p style="margin:0;font-size:13px;color:#666;"><a href="${s.url}" style="color:#666;">${domainOf(s.url)}</a></p>
            </td></tr>
          </table>`,
            )
            .join('')}
        </td></tr>
      </table>`,
    )
    .join('')
  const preheader = `New in ${[...new Set(sites.map(s => s.kind))].slice(0, 3).join(', ')} — picked for your taste.`
  return `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <div style="max-width:600px;margin:0 auto;padding:40px 20px 32px 20px;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td width="40" style="vertical-align:middle;"><img src="${SITE_HOST}/icon-192.png" alt="Hitman's Library" width="36" height="36" style="display:block;width:36px;height:36px;" /></td>
          <td style="vertical-align:middle;padding-left:10px;font-size:14px;font-weight:600;color:#111;">Hitman's Library</td>
        </tr>
      </table>
      <p style="margin:0 0 8px 0;font-family:${SERIF_STACK};font-size:42px;font-weight:700;line-height:1.1;">Weekly Digest</p>
      <p style="margin:0 0 8px 0;font-size:16px;color:#555;">Hi ${name}, ${greetingLine(sites.map(s => s.title))}</p>
      ${sections}
      <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #e5e5e5;padding-top:16px;">
        Matched to the sites you favorited. <a href="${unsubUrl}" style="color:#999;">Unsubscribe</a>
      </p>
    </div>
  </body></html>`
}

function digestText(name: string, sites: DigestSite[], unsubUrl: string): string {
  const lines = sites.map(s => `- ${s.title} (${s.kind}): ${siteUrl(s.id)}`)
  return `Weekly Digest\n\nHi ${name}, ${greetingLine(sites.map(s => s.title))}\n\n${lines.join('\n')}\n\nMatched to the sites you favorited. Unsubscribe: ${unsubUrl}`
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
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
                (SELECT hex_value FROM design_colors WHERE source_id = ds.id AND hex_value IS NOT NULL ORDER BY id LIMIT 1) AS first_hex
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
      accent: (n.first_hex as string) ?? null,
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
