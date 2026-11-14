// lib/pro/notify-watchers.ts
// After a re-check files a redesign, email every Pro member watching that
// site who hasn't been told about this snapshot yet. Each watch remembers the
// last snapshot it was emailed about, so a retry never mails twice.
import { getSql } from '@/lib/db'
import { cleanTitle } from '@/lib/clean-title'
import { siteSlug } from '@/lib/site-slug'
import { watchAlertEmail } from '@/lib/email/watch-alert'

type Snap = { screenshot_url: string | null; palette: { hex: string }[]; typography: { fontFamily: string }[] }
const look = (s: Snap | undefined) => ({
  capture: s?.screenshot_url ?? null,
  colors: (s?.palette ?? []).map(p => p.hex).filter(Boolean),
  fonts: [...new Set((s?.typography ?? []).map(t => t.fontFamily).filter(Boolean))],
})

export async function notifyWatchers(siteId: number, send = sendEmail): Promise<number> {
  const sql = getSql()
  const [site] = await sql`SELECT source_url, source_name, current_extraction_id FROM design_sources WHERE id = ${siteId}`
  if (!site?.current_extraction_id) return 0
  const watchers = await sql`
    SELECT w.user_id, w.last_alerted_extraction_id, u.email
      FROM watches w JOIN users u ON u.id = w.user_id JOIN pro_users p ON p.user_id = w.user_id
     WHERE w.source_id = ${siteId}
       AND (w.last_alerted_extraction_id IS NULL OR w.last_alerted_extraction_id < ${site.current_extraction_id})`
  let sent = 0
  for (const w of watchers) {
    const ids = [w.last_alerted_extraction_id, site.current_extraction_id].filter((x): x is number => x != null)
    const snaps = await sql`SELECT id, screenshot_url, palette, typography FROM extraction_history WHERE id = ANY(${ids}::int[])`
    const before = snaps.find(s => s.id === w.last_alerted_extraction_id) as Snap | undefined
    const after = snaps.find(s => s.id === site.current_extraction_id) as Snap | undefined
    const mail = watchAlertEmail({
      siteName: cleanTitle(site.source_name, site.source_url).split(/[|·–—:]/)[0].trim() || siteSlug(site.source_url),
      siteSlug: siteSlug(site.source_url),
      before: look(before), after: look(after),
    })
    if (await send(String(w.email), mail)) {
      await sql`UPDATE watches SET last_alerted_extraction_id = ${site.current_extraction_id} WHERE user_id = ${w.user_id} AND source_id = ${siteId}`
      sent++
    }
  }
  return sent
}

async function sendEmail(to: string, m: { subject: string; html: string; text: string }): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_PRO_FROM || "Hitman's Library <pro@hitmanslibrary.xyz>", to, ...m }),
  }).catch(() => null)
  return Boolean(res?.ok)
}
