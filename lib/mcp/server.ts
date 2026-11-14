// lib/mcp/server.ts
//
// Hitman's Library as an MCP server (Streamable HTTP, JSON responses only).
// A Pro member's personal key lets Claude, Cursor and similar tools search the
// library, open a site, and pull its design tokens while they build. Read-only:
// a key can never write, and every call is rate-limited per key.
import { NO_STORE } from '@/lib/auth/request'

export interface SiteSummary { site: string; name: string; url: string; kind: string; colors: string[]; fonts: string[] }
export interface SearchArgs { query?: string; kind?: string; palette?: string[]; font?: string; readable?: 'AA' | 'AAA'; limit?: number }

export interface McpDeps {
  auth: (key: string) => Promise<{ userId: string; keyId: string } | null>
  allowed: (keyId: string) => Promise<boolean>
  search: (args: SearchArgs) => Promise<SiteSummary[]>
  site: (ref: string) => Promise<Record<string, unknown> | null>
  tokens: (ref: string) => Promise<{ site: string; files: { name: string; content: string }[] } | null>
}

const PROTOCOL = '2025-06-18'
const INSTRUCTIONS = "Hitman's Library is a curated library of well-designed websites with their colours, typefaces and captures. Use search_sites to find references (by words, kind, palette, font or text contrast), get_site for one site's palette, fonts and screenshots, and get_tokens for ready-to-use design tokens (CSS variables, a Tailwind theme, tokens.json, DESIGN.md). Sites are named by their address, e.g. goodside.studio. Treat sites as references and inspiration for the user's own design: combine ideas, keep the user's brand, never reproduce a site's logos, wording, images or layouts, and point out fonts that need a paid licence."

const SITE_ARG = { type: 'object', properties: { site: { type: 'string', description: 'The site address as the library names it (e.g. goodside.studio), its full URL, or its id.' } }, required: ['site'] }
const TOOLS = [
  {
    name: 'search_sites',
    title: 'Search the library',
    description: 'Find well-designed sites by words, kind, palette, font or readable text contrast. Returns up to 20 sites with their colours and fonts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to match in the site name, address, kind or tags.' },
        kind: { type: 'string', description: 'Kind of site, e.g. Studio, Portfolio, AI, Developer, Store, Money, Editorial.' },
        palette: { type: 'array', items: { type: 'string' }, description: 'Up to 6 hex colours the site should be close to, e.g. ["#ff5526"].' },
        font: { type: 'string', description: 'A typeface name (or part of one) the site uses.' },
        readable: { type: 'string', enum: ['AA', 'AAA'], description: 'Only sites whose main text contrast passes WCAG AA or AAA.' },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
    },
    annotations: { readOnlyHint: true },
  },
  { name: 'get_site', title: 'Open a site', description: "One site's palette (with each colour's share of the page), typefaces by role, and desktop and mobile capture URLs.", inputSchema: SITE_ARG, annotations: { readOnlyHint: true } },
  { name: 'get_tokens', title: "Get a site's design tokens", description: "A site's design tokens as files: theme.css (CSS variables), tailwind.css (Tailwind v4 theme), tokens.json, figma-variables.json and DESIGN.md.", inputSchema: SITE_ARG, annotations: { readOnlyHint: true } },
]

const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...NO_STORE, ...extra } })
const rpcError = (id: unknown, code: number, message: string, status = 200, extra: Record<string, string> = {}) =>
  reply({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, status, extra)
const toolText = (id: unknown, value: unknown, isError = false) =>
  reply({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) } })

export async function handleMcp(req: Request, deps: McpDeps): Promise<Response> {
  if (req.method !== 'POST') return reply({ error: 'This MCP server answers POST only.' }, 405, { allow: 'POST' })
  const key = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  const who = key ? await deps.auth(key) : null
  const challenge = { 'www-authenticate': 'Bearer realm="hitmanslibrary", error="invalid_token"' }
  if (!who) return rpcError(null, -32001, 'A Pro key is required. Create one at https://hitmanslibrary.xyz/pro', 401, challenge)
  if (!(await deps.allowed(who.keyId))) return rpcError(null, -32002, 'Too many requests. Try again in a minute.', 429, { 'retry-after': '60' })

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> }
  try { msg = await req.json() } catch { return rpcError(null, -32700, 'Parse error', 400) }
  if (!msg || Array.isArray(msg) || typeof msg.method !== 'string') return rpcError(null, -32600, 'Invalid request', 400)
  // Notifications (no id) need no answer.
  if (msg.id === undefined) return reply(null, 202)

  switch (msg.method) {
    case 'initialize':
      return reply({ jsonrpc: '2.0', id: msg.id, result: {
        protocolVersion: typeof msg.params?.protocolVersion === 'string' ? msg.params.protocolVersion : PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'hitmans-library', title: "Hitman's Library", version: '1.0.0' },
        instructions: INSTRUCTIONS,
      } })
    case 'ping':
      return reply({ jsonrpc: '2.0', id: msg.id, result: {} })
    case 'tools/list':
      return reply({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } })
    case 'tools/call': {
      const name = msg.params?.name
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>
      const ref = typeof args.site === 'string' ? args.site.trim() : ''
      try {
        if (name === 'search_sites') {
          const palette = Array.isArray(args.palette) ? args.palette.filter((c): c is string => typeof c === 'string').slice(0, 6) : undefined
          const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(20, Math.floor(args.limit))) : 10
          const sites = await deps.search({
            query: typeof args.query === 'string' ? args.query.slice(0, 80) : undefined,
            kind: typeof args.kind === 'string' ? args.kind.slice(0, 40) : undefined,
            palette, font: typeof args.font === 'string' ? args.font.slice(0, 40) : undefined,
            readable: args.readable === 'AA' || args.readable === 'AAA' ? args.readable : undefined,
            limit,
          })
          return toolText(msg.id, sites.length ? { sites } : 'No sites match. Try fewer filters or other words.')
        }
        if (name === 'get_site' || name === 'get_tokens') {
          if (!ref) return toolText(msg.id, 'Give the site as its address, e.g. goodside.studio.', true)
          const out = name === 'get_site' ? await deps.site(ref) : await deps.tokens(ref)
          return out ? toolText(msg.id, out) : toolText(msg.id, `${ref} isn't in the library. Use search_sites to find a site.`, true)
        }
        return rpcError(msg.id, -32602, `Unknown tool: ${String(name)}`)
      } catch {
        return toolText(msg.id, 'Something went wrong reading the library. Try again.', true)
      }
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`)
  }
}
