// components/kit-row.tsx
//
// The style kit's download (meter and button, used at the foot of the Kit
// tab) and the footer line that leads to it from the other tabs. DESIGN.md,
// Figma variables, the captures and the token files in one zip. Free accounts get
// three a month; Pro has no limit. The server decides — this row only says
// what it decided. No pop-ups, no countdowns.
'use client'

import { useState } from 'react'
import { Package, ArrowDown, ArrowRight } from '@phosphor-icons/react'
import { useAccount, openSignIn } from '@/lib/account-client'
import { downloadKit } from '@/lib/kit/download-kit'
import { track } from '@/lib/analytics'
import { BTN } from '@/components/member-card'

type Phase = 'idle' | 'packing' | 'saved' | 'limit' | 'failed'

/** The first of next month (UTC), when the free three come back. */
function resetsOn(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function KitAction({ siteId }: { siteId: number }) {
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
    <div className="flex items-center gap-3 w-full min-w-0">
      <span role="status" className={'flex-1 min-w-0 truncate text-[12px] ' + (phase === 'limit' || phase === 'failed' ? 'text-ink-2' : 'text-ink-4')}>
        {note}{atLimit && <> · <a href="/pro" className="underline underline-offset-2 text-ink-2 hover:text-ink">Go Pro</a><span className="max-sm:hidden"> for no limit</span></>}
      </span>
      <button
        type="button" onClick={get} disabled={phase === 'packing'}
        className={BTN.primary}
      >
        {phase === 'packing' ? 'Packing…' : phase === 'saved' ? 'Saved' : signedIn ? <><ArrowDown className="w-3.5 h-3.5" weight="bold" /> Download kit</> : 'Get it free'}
      </button>
    </div>
  )
}

/** The footer line on the other tabs: what the kit is for, one tap to see it. */
export function KitLink({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button" onClick={onOpen}
      className="group flex-shrink-0 w-full border-t border-edge-faint px-4 h-11 flex items-center gap-2 text-left hover:bg-foreground/[0.03] transition-colors"
    >
      <Package className="w-3.5 h-3.5 shrink-0 text-ink-3" weight="bold" />
      <span className="text-[13px] font-[600] tracking-[-0.01em] text-ink whitespace-nowrap">Build in this style</span>
      <span className="flex-1 min-w-0 truncate text-[12px] text-ink-4">Its colours and type for AI tools, Figma and code</span>
      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-ink-4 group-hover:text-ink transition-colors" weight="bold" />
    </button>
  )
}
