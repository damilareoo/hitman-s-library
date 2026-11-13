// lib/kit/download-kit.ts
//
// Ask the server for a site's kit (it checks the session and the meter), fetch
// the captures, zip everything in the browser and save it. A capture that
// can't be fetched doesn't fail the kit: its link goes in a note instead.
'use client'

import { zipStore } from './zip'
import { themeSlug } from '@/lib/theme-tokens'
import { KITS_EVENT } from '@/lib/account-client'

export type KitResult = 'ok' | 'signed-out' | 'limit' | 'failed'

interface KitBody {
  title: string
  files: { name: string; content: string }[]
  captures: { name: string; url: string }[]
}

export async function downloadKit(id: number): Promise<KitResult> {
  const res = await fetch(`/api/kit/${id}`, { method: 'POST', credentials: 'same-origin' }).catch(() => null)
  if (!res) return 'failed'
  if (res.status === 401) return 'signed-out'
  if (res.status === 402) { window.dispatchEvent(new Event(KITS_EVENT)); return 'limit' }
  if (!res.ok) return 'failed'
  const body: KitBody = await res.json()

  const folder = `kit-${themeSlug(body.title)}`
  const enc = new TextEncoder()
  const entries = body.files.map(f => ({ name: `${folder}/${f.name}`, data: enc.encode(f.content) }))
  const missing: string[] = []
  await Promise.all(body.captures.map(async c => {
    try {
      const r = await fetch(c.url, { mode: 'cors', credentials: 'omit' })
      if (!r.ok) throw new Error(String(r.status))
      entries.push({ name: `${folder}/${c.name}`, data: new Uint8Array(await r.arrayBuffer()) })
    } catch {
      missing.push(`${c.name}: ${c.url}`)
    }
  }))
  if (missing.length) {
    entries.push({ name: `${folder}/captures-missing.txt`, data: enc.encode(`These captures couldn't be packed. They're public at:\n\n${missing.join('\n')}\n`) })
  }

  const blob = new Blob([zipStore(entries) as BlobPart], { type: 'application/zip' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${folder}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  window.dispatchEvent(new Event(KITS_EVENT))
  return 'ok'
}
