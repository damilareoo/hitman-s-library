// lib/search/handle.ts
// GET /api/search/pro: signed in → Pro → a real query → ranked ids. Never cached.
import { NO_STORE, problem } from '@/lib/auth/request'
import { parseSearchQuery, searchIndex, type SearchEntry } from './search'

export interface SearchDeps {
  user: (req: Request) => Promise<{ id: string; cookies: string[] } | null>
  isPro: (userId: string) => Promise<boolean>
  index: () => Promise<SearchEntry[]>
}

export async function handleProSearch(req: Request, deps: SearchDeps): Promise<Response> {
  const me = await deps.user(req)
  if (!me) return problem(401, 'signed-out')
  if (!(await deps.isPro(me.id))) return problem(402, 'pro', me.cookies)
  const q = parseSearchQuery(new URL(req.url).searchParams)
  if (q.empty) return problem(400, 'empty-query', me.cookies)
  const ids = searchIndex(await deps.index(), q).slice(0, 200)
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of me.cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ ids, total: ids.length }), { headers })
}
