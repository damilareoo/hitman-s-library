import { describe, expect, test } from 'bun:test'
import { handleMcp, type McpDeps } from './server'

const KEY = 'hl_' + 'a'.repeat(52)
const rpc = (body: unknown, key: string | null = KEY) => new Request('https://hitmanslibrary.xyz/api/mcp', {
  method: 'POST', body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(key ? { authorization: `Bearer ${key}` } : {}) },
})
const deps = (over: Partial<McpDeps> = {}): McpDeps => ({
  auth: async k => (k === KEY ? { userId: 'u1', keyId: 'k1' } : null),
  allowed: async () => true,
  search: async a => [{ site: 'goodside.studio', name: 'Goodside', url: 'https://goodside.studio', kind: 'Studio', colors: ['#111111'], fonts: ['Epicene'], query: a.query ?? null } as never],
  site: async ref => (ref === 'goodside.studio' ? { site: 'goodside.studio', name: 'Goodside' } as never : null),
  tokens: async ref => (ref === 'goodside.studio' ? { site: 'goodside.studio', files: [{ name: 'theme.css', content: ':root{}' }] } : null),
  ...over,
})
const json = async (r: Response) => r.json() as Promise<any>

describe('handleMcp', () => {
  test('no key or a wrong key → 401 with a Bearer challenge', async () => {
    const r = await handleMcp(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, null), deps())
    expect(r.status).toBe(401)
    expect(r.headers.get('www-authenticate')).toContain('Bearer')
    expect((await handleMcp(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'hl_wrong'), deps())).status).toBe(401)
  })
  test('initialize names the server and offers tools', async () => {
    const b = await json(await handleMcp(rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }), deps()))
    expect(b.result.serverInfo.name).toBe('hitmans-library')
    expect(b.result.capabilities.tools).toBeDefined()
    expect(b.result.protocolVersion).toBe('2025-06-18')
  })
  test('a notification is accepted with no body', async () => {
    expect((await handleMcp(rpc({ jsonrpc: '2.0', method: 'notifications/initialized' }), deps())).status).toBe(202)
  })
  test('tools/list: search_sites, get_site, get_tokens', async () => {
    const b = await json(await handleMcp(rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }), deps()))
    expect(b.result.tools.map((t: { name: string }) => t.name)).toEqual(['search_sites', 'get_site', 'get_tokens'])
  })
  test('tools/call returns text content', async () => {
    const b = await json(await handleMcp(rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_tokens', arguments: { site: 'goodside.studio' } } }), deps()))
    expect(b.result.content[0].type).toBe('text')
    expect(b.result.content[0].text).toContain('theme.css')
  })
  test('a site that is not in the library is a tool error, not a crash', async () => {
    const b = await json(await handleMcp(rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_site', arguments: { site: 'nope.example' } } }), deps()))
    expect(b.result.isError).toBe(true)
  })
  test('unknown method → JSON-RPC method not found', async () => {
    const b = await json(await handleMcp(rpc({ jsonrpc: '2.0', id: 5, method: 'resources/list' }), deps()))
    expect(b.error.code).toBe(-32601)
  })
  test('rate limited → 429', async () => {
    expect((await handleMcp(rpc({ jsonrpc: '2.0', id: 6, method: 'tools/list' }), deps({ allowed: async () => false }))).status).toBe(429)
  })
  test('GET (no event stream offered) → 405', async () => {
    expect((await handleMcp(new Request('https://hitmanslibrary.xyz/api/mcp', { headers: { authorization: `Bearer ${KEY}` } }), deps())).status).toBe(405)
  })
})
