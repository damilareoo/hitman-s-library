// lib/email/send-pro-welcome.ts
// Sends the Pro welcome email for one member, in their own hearted colours
// (from the cached search index, so this costs one small query and a send).
import { getSql } from '@/lib/db'
import { searchIndexCached } from '@/lib/search/load'
import { proWelcomeEmail } from './pro-welcome'
import type { Swatch } from '@/lib/pro/palette'

export async function sendProWelcome(userId: string): Promise<void> {
  const [u] = await getSql()`
    SELECT u.email, u.name, u.member_no, COALESCE(d.favorite_ids, '{}') AS favs
      FROM users u LEFT JOIN user_data d ON d.user_id = u.id WHERE u.id = ${userId}::uuid`
  if (!u?.email) return
  const favs = new Set<number>((u.favs as number[]).map(Number))
  const index = await searchIndexCached()
  const mine: Swatch[] = index.filter(e => favs.has(e.id)).flatMap(e => e.colors.map(c => [c, ''] as Swatch))
  const swatches = mine.length >= 12 ? mine : [...mine, ...index.slice(0, 60).flatMap(e => e.colors.map(c => [c, ''] as Swatch))]
  const { subject, html, text } = proWelcomeEmail({ name: u.name ?? '', memberNo: Number(u.member_no), swatches })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_PRO_FROM ?? "Hitman's Library <pro@hitmanslibrary.xyz>", to: u.email, subject, html, text }),
  })
  if (!res.ok) throw new Error(`resend ${res.status}`)
}
