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
      <div id="ai-tools" className="w-full max-w-[380px] flex flex-col gap-4 scroll-mt-16">
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
    <div id="what-you-get" className="w-full max-w-[380px] flex flex-col gap-4 scroll-mt-16">
      <h2 className={CARD.label + ' px-1 pt-2'}>What you get, from today&apos;s library</h2>

      <Sample
        title="In your AI tools"
        foot={<span className={CARD.meta}>Inspiration, not imitation: take colours and type as a starting point; don&apos;t copy logos, words, images or layouts, and license any paid font. <Link href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link></span>}
      >
        <p className="text-[14px] leading-[1.45] text-ink text-pretty">“Find dark product sites with one bright accent. Use their mood for {AI_EXAMPLE.product}, our focus-music app. Keep our pink, our layout and our words.”</p>
        <div className="mt-3">
          <CompareSlider before="/pro/ai-before.webp" after="/pro/ai-after.webp" alt={`${AI_EXAMPLE.product}'s landing page`} ratio="1200 / 620" />
        </div>
        <ol className="mt-3.5 flex flex-col gap-2.5">
          {[
            <>Searched the library and found {AI_EXAMPLE.references.join(' and ')}.</>,
            <>Borrowed the mood, not the look: near-black surfaces, warm off-white type, a mono face for numbers, one blue for data.</>,
            <>Kept {AI_EXAMPLE.product}&apos;s own pink, layout and words, with free fonts ({AI_EXAMPLE.fonts.join(' and ')}).</>,
          ].map((step, i) => (
            <li key={i} className="grid grid-cols-[18px_minmax(0,1fr)] gap-1.5 text-[13px] leading-[1.45] text-ink-2 text-pretty">
              <span className="text-ink-4 tabular-nums">{i + 1}</span><span>{step}</span>
            </li>
          ))}
        </ol>
        <p className={CARD.meta + ' mt-3 flex items-center gap-1.5'}>
          <span className="mr-0.5">Palette</span>
          {AI_EXAMPLE.colors.map(c => <span key={c} title={c} className="w-3 h-3 rounded-full ring-1 ring-inset ring-foreground/15" style={{ background: c }} />)}
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
