// components/ai-tools-card.tsx
// Pro: connect the library to Claude, Cursor and other AI tools. Make a key,
// copy one ready-made line for your tool, and the library's search, sites and
// design tokens are there while you build. The key is shown once; after that only its
// first characters, with when it was last used and a way to revoke it.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Check, Key } from '@phosphor-icons/react'
import { BTN, CARD } from '@/components/member-card'
import { useCopied } from '@/lib/use-copied'

interface KeyRow { id: string; prefix: string; created_at: string; last_used_at: string | null }
type Tool = 'claude' | 'cursor' | 'other'

const ENDPOINT = 'https://hitmanslibrary.xyz/api/mcp'
const snippet = (tool: Tool, key: string) => {
  if (tool === 'claude') return `claude mcp add --transport http hitmans-library ${ENDPOINT} --header "Authorization: Bearer ${key}"`
  if (tool === 'cursor') return JSON.stringify({ mcpServers: { 'hitmans-library': { url: ENDPOINT, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)
  return `URL: ${ENDPOINT}\nHeader: Authorization: Bearer ${key}`
}
const TOOLS: { id: Tool; label: string; where: string }[] = [
  { id: 'claude', label: 'Claude Code', where: 'Run this in your terminal.' },
  { id: 'cursor', label: 'Cursor', where: 'Add this to ~/.cursor/mcp.json.' },
  { id: 'other', label: 'Other', where: 'Any tool that takes a remote MCP server.' },
]
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never')

export function AiToolsCard() {
  const [keys, setKeys] = useState<KeyRow[] | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('claude')
  const [busy, setBusy] = useState(false)
  const copy = useCopied()

  const load = useCallback(() => {
    fetch('/api/keys').then(r => r.json()).then(b => setKeys(Array.isArray(b.keys) ? b.keys : [])).catch(() => setKeys([]))
  }, [])
  useEffect(load, [load])

  async function create() {
    setBusy(true)
    const r = await fetch('/api/keys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null)
    const b = r?.ok ? await r.json() : null
    if (b?.key) { setFresh(b.key); load() }
    setBusy(false)
  }
  async function revoke(id: string) {
    await fetch('/api/keys', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null)
    load()
  }
  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); copy.markCopied('snippet') } catch { /* clipboard unavailable */ }
  }

  const shown = fresh ?? 'YOUR_KEY'
  const t = TOOLS.find(x => x.id === tool)!

  return (
    <section className={CARD.shell + ' w-full'}>
      <div className={CARD.head}>
        <span>Your AI tools</span>
        <span className="text-ink-4">Claude, Cursor and more</span>
      </div>
      <div className={CARD.pad + ' py-4'}>
        <p className={CARD.title}>Build with the library</p>
        <p className={CARD.body + ' mt-1'}>Ask your AI tool for a site’s type and colours as a starting point for your own design, and it pulls the real values from here.</p>

        <div role="tablist" aria-label="Your tool" className="mt-4 flex gap-1.5">
          {TOOLS.map(x => (
            <button key={x.id} role="tab" aria-selected={tool === x.id} onClick={() => setTool(x.id)} className={BTN.chip(tool === x.id)}>{x.label}</button>
          ))}
        </div>
        <div className="mt-2.5 relative rounded-[10px] border border-edge bg-foreground/[0.025]">
          <pre className="p-3 pr-11 text-[12px] leading-[1.5] text-ink-2 whitespace-pre-wrap break-all font-mono">{snippet(tool, shown)}</pre>
          <button onClick={() => copyText(snippet(tool, shown))} aria-label="Copy" title="Copy" className={BTN.icon + ' absolute top-1 right-1'}>
            {copy.copiedId === 'snippet' ? <Check className="w-4 h-4" weight="bold" /> : <Copy className="w-4 h-4" weight="bold" />}
          </button>
        </div>
        <p className={CARD.meta + ' mt-1.5'}>
          {fresh ? 'Your new key is in the line above. Copy it now: it won’t be shown again.' : t.where}
        </p>

        {keys && keys.length > 0 && (
          <ul className="mt-4">
            {keys.map(k => (
              <li key={k.id} className="flex items-center gap-2.5 h-10 border-t border-edge-faint">
                <Key className="w-3.5 h-3.5 text-ink-4 shrink-0" weight="bold" />
                <span className="font-mono text-[12.5px] text-ink">{k.prefix}…</span>
                <span className={CARD.meta}>made {when(k.created_at)} · used {when(k.last_used_at)}</span>
                <button onClick={() => revoke(k.id)} className={BTN.ghost + ' ml-auto !h-7'}>Revoke</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={CARD.foot + ' pl-4 pr-2'}>
        <span className={CARD.meta}>Read-only. Revoke a key any time.</span>
        <button onClick={create} disabled={busy || (keys?.length ?? 0) >= 5} className={BTN.primary + ' ml-auto'}>
          {busy ? 'Making…' : keys && keys.length ? 'New key' : 'Make a key'}
        </button>
      </div>
    </section>
  )
}
