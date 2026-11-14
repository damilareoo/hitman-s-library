// components/pro-extras.tsx
// Under the Pro card. Members get their AI tools card and a way into Trends.
// Everyone else sees what Pro does, from real library data: the exact
// theme.css an AI tool receives for one site, this month's trend findings,
// and what Watch and History do. Each is one card with the shared anatomy.
'use client'

import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { CARD } from '@/components/member-card'
import { useAccount } from '@/lib/account-client'
import { AiToolsCard } from '@/components/ai-tools-card'
import { CompareSlider } from '@/components/compare-slider'
// Rendered from the real test (scripts/render-ai-example.ts).
import AI_EXAMPLE from '@/public/pro/ai-example.json'
import type { ProSample } from '@/lib/read/pro-sample'

function Sample({ title, children, foot }: { title: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <section className={CARD.shell}>
      <div className={CARD.head}><span>{title}</span><span className="text-ink-4">Pro</span></div>
      <div className={CARD.pad + ' py-4'}>{children}</div>
      {foot && <div className={CARD.foot + ' pl-4 pr-2'}>{foot}</div>}
    </section>
  )
}

export function ProExtras({ sample }: { sample: ProSample }) {
  const { pro } = useAccount()

  if (pro) {
    return (
      <div className="w-full max-w-[380px] flex flex-col gap-4">
        <AiToolsCard />
        <Link href="/trends" className={CARD.shell + ' block hover:border-foreground/30 transition-colors'}>
          <div className={CARD.pad + ' py-3.5 flex items-center gap-3'}>
            <span className="flex-1 min-w-0">
              <span className={CARD.title + ' block'}>This month&apos;s trends</span>
              <span className={CARD.meta}>{sample.trends[0] ?? 'Typefaces, colours and kinds on the rise.'}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-ink-4 shrink-0" weight="bold" />
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[380px] flex flex-col gap-4">
      <h2 className={CARD.label + ' px-1 pt-2'}>What you get, from today&apos;s library</h2>

      <Sample title="In your AI tools" foot={<span className={CARD.meta}>Claude Code, Cursor and any MCP tool.</span>}>
        <p className="text-[14px] leading-[1.45] text-ink">“Restyle this landing page like {AI_EXAMPLE.site}.”</p>
        <p className={CARD.body + ' mt-1'}>Your AI tool asks the library for the site and applies what it gets back. Drag to compare.</p>
        <div className="mt-3">
          <CompareSlider before="/pro/ai-before.webp" after="/pro/ai-after.webp" alt={`A landing page restyled like ${AI_EXAMPLE.site}`} />
        </div>
        <p className={CARD.meta + ' mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1'}>
          <span>It used</span>
          <span className="text-ink-2">{AI_EXAMPLE.fonts.join(' · ')}</span>
          <span className="flex items-center gap-1">
            {AI_EXAMPLE.colors.map(c => <span key={c} title={c} className="w-3 h-3 rounded-full ring-1 ring-inset ring-foreground/15" style={{ background: c }} />)}
          </span>
        </p>
      </Sample>

      {sample.trends.length > 0 && (
        <Sample title="Trends this month" foot={<><span className={CARD.meta}>Emailed to you each month.</span><Link href="/trends" className={CARD.footBtn + ' ml-auto'}>See the page</Link></>}>
          <ul className="space-y-2">
            {sample.trends.map(t => <li key={t} className="text-[13.5px] leading-[1.45] text-ink-2">{t}</li>)}
          </ul>
        </Sample>
      )}

      <Sample title="Watch and History">
        <p className={CARD.title}>Know when a site redesigns</p>
        <p className={CARD.body + ' mt-1'}>Watch any site and get an email with its before and after. Every site is re-checked weekly, and each new look is kept in its History tab.</p>
      </Sample>

    </div>
  )
}
