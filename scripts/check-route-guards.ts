// scripts/check-route-guards.ts
//
// Two static checks that keep the API safe as it grows:
// - every non-GET route handler is guarded by admin auth, the cron secret or
//   the rate limiter;
// - no SQL is built from strings (sql.unsafe, or sql() called with a
//   concatenated or template string). Tagged templates and sql.query with $n
//   placeholders are parameterised and allowed.
//
//   bun scripts/check-route-guards.ts      (exit 1 on any finding)

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export interface SourceFile { path: string; source: string }

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
const GUARDS = [/requireAdmin\(/, /CRON_SECRET/, /checkRateLimit\(/]
// A handler that genuinely needs no guard says so right above it, with a reason.
const DECLARED_NONE = /\/\/ guard: none\s+[—-]\s+\S.{8,}\n\s*$/
const HANDLER = /export\s+(?:async\s+function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g

export function findUnguardedHandlers(files: SourceFile[]): { path: string; method: string }[] {
  const out: { path: string; method: string }[] = []
  for (const f of files) {
    const starts = [...f.source.matchAll(HANDLER)].map(m => ({ method: m[1], at: m.index ?? 0 }))
    starts.forEach((h, i) => {
      if (!WRITE_METHODS.includes(h.method)) return
      const body = f.source.slice(h.at, starts[i + 1]?.at ?? f.source.length)
      if (DECLARED_NONE.test(f.source.slice(Math.max(0, h.at - 300), h.at))) return
      if (!GUARDS.some(g => g.test(body))) out.push({ path: f.path, method: h.method })
    })
  }
  return out
}

const RAW_SQL = [/\bsql\.unsafe\(/, /\bsql\(\s*['"][^'"]*['"]\s*\+/, /\bsql\(\s*`[^`]*\$\{/]

export function findRawSql(files: SourceFile[]): { path: string; line: number }[] {
  const out: { path: string; line: number }[] = []
  for (const f of files) {
    f.source.split('\n').forEach((text, i) => {
      if (RAW_SQL.some(r => r.test(text))) out.push({ path: f.path, line: i + 1 })
    })
  }
  return out
}

function walk(dir: string, match: (p: string) => boolean, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, match, acc)
    else if (match(p)) acc.push(p)
  }
  return acc
}

if (import.meta.main) {
  const read = (p: string): SourceFile => ({ path: p, source: readFileSync(p, 'utf8') })
  const routes = walk('app/api', p => p.endsWith('route.ts')).map(read)
  const code = [...walk('app', p => /\.tsx?$/.test(p)), ...walk('lib', p => /\.tsx?$/.test(p) && !p.endsWith('.test.ts'))].map(read)
  const unguarded = findUnguardedHandlers(routes)
  const raw = findRawSql(code)
  for (const u of unguarded) console.log(`unguarded ${u.method} ${u.path}`)
  for (const r of raw) console.log(`raw sql ${r.path}:${r.line}`)
  console.log(`${unguarded.length} unguarded handlers, ${raw.length} raw sql`)
  process.exit(unguarded.length + raw.length > 0 ? 1 : 0)
}
