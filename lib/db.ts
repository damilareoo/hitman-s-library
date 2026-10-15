// lib/db.ts
// Lazy Neon client. `neon(url)` throws when DATABASE_URL is unset, so calling
// it at module top-level crashes `next build` during page-data collection.
// This defers creation until the first actual query, so imports are safe.
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let cached: NeonQueryFunction<false, false> | null = null

function realSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not configured')
  if (!cached) cached = neon(url)
  return cached
}

export function getSql(): NeonQueryFunction<false, false> {
  const fn: any = (...args: any[]) => (realSql() as any)(...args)
  return new Proxy(fn, {
    get(_t, prop) {
      return (realSql() as any)[prop]
    },
    apply(_t, _this, args) {
      return (realSql() as any)(...args)
    },
  })
}
