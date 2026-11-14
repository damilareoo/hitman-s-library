#!/usr/bin/env bun
// scripts/send-trends.ts
// The monthly trends briefing (GitHub Actions, the 1st of each month).
// One email per Pro member per month, recorded in trend_sends so a re-run
// never mails twice. Resend's free tier allows 100 a day; it stops before.
//
//   bun scripts/send-trends.ts          send
//   bun scripts/send-trends.ts --dry    print the findings, send nothing
import { getSql } from '@/lib/db'
import { loadTrendSites } from '@/lib/trends/load'
import { computeTrends } from '@/lib/trends/compute'
import { trendsEmail, findings } from '@/lib/email/trends-briefing'

async function main() {
  const dry = process.argv.includes('--dry')
  const sql = getSql()
  const t = computeTrends(await loadTrendSites())
  const now = new Date()
  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
  const mail = trendsEmail(t, month)
  if (dry) { console.log(findings(t).join('\n')); return }
  const members = await sql`
    SELECT u.id, u.email FROM users u JOIN pro_users p ON p.user_id = u.id
     WHERE NOT EXISTS (SELECT 1 FROM trend_sends s WHERE s.user_id = u.id AND s.month = ${monthKey}::date)
     LIMIT 90`
  let sent = 0
  for (const m of members) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_PRO_FROM ?? "Hitman's Library <pro@hitmanslibrary.xyz>", to: m.email, ...mail }),
    }).catch(() => null)
    if (res?.ok) { await sql`INSERT INTO trend_sends (user_id, month) VALUES (${m.id}, ${monthKey}::date) ON CONFLICT DO NOTHING`; sent++ }
  }
  console.log(JSON.stringify({ members: members.length, sent }))
}

main().then(() => process.exit(0), err => { console.error(err); process.exit(1) })
