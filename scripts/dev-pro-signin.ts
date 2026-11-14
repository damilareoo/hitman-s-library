#!/usr/bin/env bun
// scripts/dev-pro-signin.ts
//
// Local only: sign the second local address (pro.localhost:8799) in as the Pro
// owner account, so the free site (localhost:8799, signed out) and the Pro
// site can be compared side by side. Browsers keep cookies per host, so the
// two addresses are two separate visitors on the same local server.
//
// Makes a normal one-time sign-in link (the same flow as the email link,
// valid 15 minutes, single use) and opens it in the default browser. The link
// is never printed. Press Continue on the page that opens.
//
//   bun scripts/dev-pro-signin.ts
import { getSql } from '@/lib/db'
import { generateToken, hashToken } from '@/lib/auth/session'

const HOST = 'http://pro.localhost:8799'

async function main() {
  const sql = getSql()
  const [owner] = await sql`SELECT u.email FROM users u JOIN pro_users p ON p.user_id = u.id ORDER BY u.member_no LIMIT 1`
  if (!owner) throw new Error('No Pro account found')
  const token = generateToken()
  await sql`DELETE FROM login_tokens WHERE email = ${owner.email}`
  await sql`INSERT INTO login_tokens (id, email, next, expires_at) VALUES (${await hashToken(token)}, ${owner.email}, ${'/'}, ${new Date(Date.now() + 15 * 60_000)})`
  Bun.spawn(['open', `${HOST}/api/auth/email/callback?token=${token}`])
  console.log(`Opened a one-time sign-in for your Pro account at ${HOST}. Press Continue.`)
}

main().then(() => process.exit(0), err => { console.error(err.message); process.exit(1) })
