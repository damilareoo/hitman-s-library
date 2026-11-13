// components/kit-row.tsx
//
// The style kit, one row above the free theme copies. DESIGN.md, Figma
// variables, the captures and the token files in one zip. Free accounts get
// three a month; Pro has no limit. The server decides — this row only says
// what it decided. No pop-ups, no countdowns.
'use client'

import { useState } from 'react'
import { Package, ArrowDown } from '@phosphor-icons/react'
import { useAccount, openSignIn } from '@/lib/account-client'
import { downloadKit } from '@/lib/kit/download-kit'
import { track } from '@/lib/analytics'

type Phase = 'idle' | 'packing' | 'saved' | 'limit' | 'failed'

/** The first of next month (UTC), when the free three come back. */
function resetsOn(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function KitRow({ siteId }: { siteId: number }) {
  const { status, pro, kits } = useAccount()
  const [phase, setPhase] = useState<Phase>('idle')
  if (status === 'loading') return null

  const left = kits ? Math.max(0, kits.limit - kits.used) : 0
  const signedIn = status === 'signed-in'

  async function get() {
    if (!signedIn) return openSignIn('join')
    setPhase('packing')
    const r = await downloadKit(siteId)
    if (r === 'signed-out') { setPhase('idle'); return openSignIn('signin') }
    if (r === 'ok') track('kit_downloaded', { pro: Boolean(pro) })
    if (r === 'limit') track('kit_limit_reached')
    setPhase(r === 'ok' ? 'saved' : r)
    if (r === 'ok') setTimeout(() => setPhase('idle'), 2400)
  }

  const note =
    phase === 'failed' ? "Couldn't pack it. Try again"
    : !signedIn ? 'Free with an account'
    : pro ? 'Pro, no limit'
    : phase === 'limit' || left === 0 ? `0 left until ${resetsOn()}`
    : `${left} of ${kits?.limit ?? 3} left this month`
  const atLimit = signedIn && !pro && (phase === 'limit' || left === 0)

  return (
    <div className="flex-shrink-0 border-t border-edge-faint px-4 h-11 flex items-center gap-3">
      <span className="flex items-center gap-2 shrink-0 whitespace-nowrap text-[13px] font-[600] tracking-[-0.01em] text-ink" title="DESIGN.md, Figma variables, captures and token files in one zip">
        <Package className="w-3.5 h-3.5 text-ink-3" weight="bold" /> Style kit
      </span>
      <span role="status" className={'flex-1 min-w-0 truncate text-right text-[12px] ' + (phase === 'limit' || phase === 'failed' ? 'text-ink-2' : 'text-ink-4')}>
        {note}{atLimit && <span className="max-sm:hidden"> · Pro has no limit</span>}
      </span>
      <button
        type="button" onClick={get} disabled={phase === 'packing'}
        title="DESIGN.md, Figma variables, captures and token files in one zip"
        className="shrink-0 h-7 px-2.5 rounded-[6px] flex items-center gap-1.5 text-[12.5px] font-[600] tracking-[-0.01em] bg-foreground text-background hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition"
      >
        {phase === 'packing' ? 'Packing…' : phase === 'saved' ? 'Saved' : signedIn ? <><ArrowDown className="w-3 h-3" weight="bold" /> Download</> : 'Get it'}
      </button>
    </div>
  )
}
