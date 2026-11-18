// components/watch-button.tsx
// Watch a site for redesigns: one row at the foot of the panel's Save menu,
// beside the sets, drawn like them. Pro members tick it; anyone else sees
// the Pro tag and is taken to Pro (or to join, when signed out).
'use client'

import { useRouter } from 'next/navigation'
import { Check } from '@phosphor-icons/react'
import { useAccount, setWatching, openSignIn } from '@/lib/account-client'
import { CARD } from '@/components/member-card'

export function WatchRow({ siteId, siteName }: { siteId: number; siteName: string }) {
  const { status, pro, watching } = useAccount()
  const router = useRouter()
  const on = Boolean(pro && watching?.includes(siteId))

  function act() {
    if (pro) return void setWatching(siteId, !on)
    if (status === 'signed-in') router.push('/pro')
    else openSignIn('join')
  }

  return (
    <button
      onClick={act}
      aria-pressed={pro ? on : undefined}
      title={pro ? (on ? `Watching ${siteName}: we email you if it redesigns` : 'We re-check weekly and email a before and after') : 'Redesign alerts are part of Pro'}
      className="w-full h-9 px-2.5 flex items-center gap-2.5 rounded-[10px] text-left text-[13.5px] font-[500] text-ink hover:bg-foreground/[0.045] transition-colors"
    >
      <span className={'w-4 h-4 shrink-0 grid place-items-center rounded-[5px] border ' + (on ? 'bg-foreground border-foreground text-background' : 'border-edge-strong')}>
        {on && <Check className="w-2.5 h-2.5" weight="bold" />}
      </span>
      <span className="flex-1 truncate">Email me if it redesigns</span>
      {!pro && <span className={CARD.proPill}>Pro</span>}
    </button>
  )
}
