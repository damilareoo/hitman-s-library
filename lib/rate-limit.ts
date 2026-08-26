// lib/rate-limit.ts
import { createHash } from 'crypto'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Never store the raw address. The hash is enough to count against, and the
 * salt means the table is not a rainbow-table-able list of everyone who has
 * ever used the site.
 */
export function hashIp(ip: string): string {
  const salt = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? 'hitmans-library'
  return createHash('sha256').update(salt + ':' + ip).digest('hex').slice(0, 32)
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Count-in-a-window limiter, backed by Postgres.
 *
 * An in-process Map would be simpler and is the usual reach, but serverless
 * instances share no memory and are recycled constantly — a counter held in one
 * would reset on every cold start and be trivially outrun by spreading requests
 * across instances. Neon is already on the request path, so the durable version
 * costs one more query and actually holds.
 */
export async function checkRateLimit(
  ipHash: string,
  kind: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const rows = await sql`
      SELECT COUNT(*)::int AS used,
             EXTRACT(EPOCH FROM (MIN(created_at) + make_interval(secs => ${windowSeconds}) - NOW()))::int AS retry_after
      FROM rate_events
      WHERE ip_hash = ${ipHash}
        AND kind = ${kind}
        AND created_at > NOW() - make_interval(secs => ${windowSeconds})
    `

    const used = rows[0]?.used ?? 0
    if (used >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, rows[0]?.retry_after ?? windowSeconds),
      }
    }

    await sql`INSERT INTO rate_events (ip_hash, kind) VALUES (${ipHash}, ${kind})`

    return { ok: true, remaining: limit - used - 1, retryAfterSeconds: 0 }
  } catch (err) {
    // A limiter that fails closed would take the whole feature down with the
    // database hiccup. Log loudly and let the request through — the SSRF guard
    // and the honeypot are still in front of everything that matters.
    console.error('[rate-limit] check failed, allowing request:', err)
    return { ok: true, remaining: 0, retryAfterSeconds: 0 }
  }
}

/** Old rows are noise; nothing reads beyond the window. */
export async function pruneRateEvents(): Promise<void> {
  await sql`DELETE FROM rate_events WHERE created_at < NOW() - INTERVAL '24 hours'`.catch(() => null)
}
