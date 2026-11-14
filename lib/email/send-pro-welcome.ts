// lib/email/send-pro-welcome.ts
// Sends the Pro welcome email for one member, in their own hearted colours
// (read for those sites only, so the webhook never builds the whole search
// index). With no hearts yet, the email uses the default warm GIF.
import { getSql } from '@/lib/db'
import { proWelcomeEmail } from './pro-welcome'
import type { Swatch } from '@/lib/pro/palette'

export async function sendProWelcome(userId: string): Promise<void> {
  const [u] = await getSql()`
    SELECT u.email, u.name, u.member_no, COALESCE(d.favorite_ids, '{}') AS favs
      FROM users u LEFT JOIN user_data d ON d.user_id = u.id WHERE u.id = ${userId}::uuid`
  if (!u?.email) return
  const favs = (u.favs as number[]).map(Number).filter(Number.isInteger).slice(0, 200)
  const rows = favs.length ? await getSql()`
    SELECT p->>'hex' AS hex
      FROM design_sources ds JOIN extraction_history eh ON eh.id = ds.current_extraction_id,
           jsonb_array_elements(CASE WHEN jsonb_typeof(eh.palette) = 'array' THEN eh.palette ELSE '[]'::jsonb END) p
     WHERE ds.id = ANY(${favs}::int[]) AND p->>'hex' ~* '^#[0-9a-f]{6}$'` : []
  const swatches: Swatch[] = rows.map(r => [String(r.hex).toLowerCase(), ''] as Swatch)
  const { subject, html, text } = proWelcomeEmail({ name: u.name ?? '', memberNo: Number(u.member_no), swatches })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_PRO_FROM || "Hitman's Library <pro@hitmanslibrary.xyz>", to: u.email, subject, html, text }),
  })
  if (!res.ok) throw new Error(`resend ${res.status}`)
}
