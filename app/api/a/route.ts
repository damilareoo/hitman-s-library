// app/api/a/route.ts
// Our own visit counter. The browser sends one small beacon per page view or
// tracked click (lib/beacon/client.ts); this stores it in `hits`. The short
// path keeps it off ad-block lists that catch /analytics and /collect, which
// is most of what PostHog and Cloudflare's beacon miss.
import { NextRequest } from 'next/server'
import { getSql } from '@/lib/db'
import { agentOf, clip, isBot, sourceOf } from '@/lib/beacon/parse'
import { teamFromCookie } from '@/lib/beacon/team'

const OWN = 'hitmanslibrary.xyz'
const KINDS = /^[a-z][a-z_]{1,39}$/
const none = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })

function hostOf(u: unknown): string | null {
  if (typeof u !== 'string' || !u) return null
  try { return new URL(u).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
}

// guard: none — every visitor's browser sends this; origin-checked, bot-filtered, size-capped, insert-only
export async function POST(req: NextRequest) {
  // Only our own pages report. A forged beacon could still be sent by hand,
  // but not from someone else's page in a visitor's browser.
  const origin = hostOf(req.headers.get('origin'))
  if (origin && origin !== OWN && !origin.endsWith('.' + OWN) && origin !== 'localhost') return none()

  const ua = req.headers.get('user-agent')
  if (isBot(ua)) return none()

  let b: any
  try {
    const text = await req.text()
    if (text.length > 4000) return none()
    b = JSON.parse(text)
  } catch { return none() }

  const kind = typeof b?.k === 'string' && KINDS.test(b.k) ? b.k : null
  const visitor = clip(b?.v, 40)
  const session = clip(b?.s, 40)
  if (!kind || !visitor || !session) return none()

  const referrer = hostOf(b.r)
  const agent = agentOf(ua!)
  const team = await teamFromCookie(req.headers.get('cookie'))
  const landing = b.l === true

  try {
    await getSql()`
      INSERT INTO hits (kind, visitor, session, team, path, site, target, source, referrer, campaign, landing, device, browser, os, country)
      VALUES (
        ${kind}, ${visitor}, ${session}, ${team}, ${clip(b.p, 300)}, ${clip(b.site, 120)}, ${clip(b.t, 120)},
        ${landing ? sourceOf(referrer, clip(b.src, 60), OWN, agent.browser) : null},
        ${landing ? referrer : null}, ${landing ? clip(b.c, 80) : null}, ${landing},
        ${agent.device}, ${agent.browser}, ${agent.os}, ${clip(req.headers.get('cf-ipcountry'), 2)}
      )`
  } catch { /* a lost hit is not worth an error page */ }
  return none()
}
