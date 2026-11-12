import { describe, expect, test } from 'bun:test'
import { findUnguardedHandlers, findRawSql } from './check-route-guards'

const file = (source: string, path = 'app/api/x/route.ts') => ({ path, source })

describe('findUnguardedHandlers', () => {
  test('a POST with no guard is reported', () => {
    const r = findUnguardedHandlers([file(`export async function POST(req: Request) { return ok() }`)])
    expect(r).toEqual([{ path: 'app/api/x/route.ts', method: 'POST' }])
  })
  test('admin auth, the cron secret or the rate limiter count as guards', () => {
    expect(findUnguardedHandlers([file(`export async function POST(req) { const d = await requireAdmin(req) }`)])).toEqual([])
    expect(findUnguardedHandlers([file(`export async function DELETE(req) { if (h !== process.env.CRON_SECRET) {} }`)])).toEqual([])
    expect(findUnguardedHandlers([file(`export async function PUT(req) { await checkRateLimit(ip, 'k', 5, 60) }`)])).toEqual([])
  })
  test('a handler may declare it needs no guard, but only with a reason', () => {
    expect(findUnguardedHandlers([file(`// guard: none — only clears the caller's own cookie\nexport async function DELETE() {}`)])).toEqual([])
    expect(findUnguardedHandlers([file(`// guard: none\nexport async function DELETE() {}`)])).toHaveLength(1)
  })
  test('GET handlers are never reported', () => {
    expect(findUnguardedHandlers([file(`export async function GET() { return ok() }`)])).toEqual([])
  })
  test('each unguarded method is reported once', () => {
    const r = findUnguardedHandlers([file(`export async function POST() {}\nexport const PATCH = async () => {}`)])
    expect(r.map(x => x.method).sort()).toEqual(['PATCH', 'POST'])
  })
})

describe('findRawSql', () => {
  test('sql.unsafe and string-built sql() are reported', () => {
    expect(findRawSql([file('const r = await sql.unsafe(q)', 'lib/a.ts')])).toHaveLength(1)
    expect(findRawSql([file('const r = await sql("SELECT " + col)', 'lib/a.ts')])).toHaveLength(1)
    expect(findRawSql([file('const r = await sql(`SELECT ${col}`)', 'lib/a.ts')])).toHaveLength(1)
  })
  test('tagged templates and placeholder queries are fine', () => {
    expect(findRawSql([file('const r = await sql`SELECT * FROM t WHERE id = ${id}`', 'lib/a.ts')])).toEqual([])
    expect(findRawSql([file('const r = await sql.query(`SELECT * FROM t WHERE id = $1`, [id])', 'lib/a.ts')])).toEqual([])
  })
})
