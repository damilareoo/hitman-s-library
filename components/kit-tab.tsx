// components/kit-tab.tsx
//
// What the style kit gives you, shown before you download it: this site's
// colours under the names the kit uses, its typefaces, and the three plain
// ways to use it. The download sits at the foot with the free meter.
'use client'

import { useMemo } from 'react'
import { Sparkle, FigmaLogo, Code } from '@phosphor-icons/react'
import { nameColors } from '@/lib/kit/roles'
import { KitAction } from './kit-row'
import { ThemeExport } from './theme-export'

interface Props {
  siteId: number
  siteUrl: string
  hostname: string
  colors: { hex_value: string; oklch: string | null; area_share: number | null }[]
  typography: { font_family: string; role: string; google_fonts_url: string | null; primary_weight: number | null }[]
}

const USES = [
  { Icon: Sparkle, title: 'AI tool', body: 'DESIGN.md for Claude, Cursor or v0.' },
  { Icon: FigmaLogo, title: 'Figma', body: 'Colours and fonts as variables.' },
  { Icon: Code, title: 'Code', body: 'theme.css and a Tailwind theme, plus full-size captures.' },
]

export function KitTab({ siteId, siteUrl, hostname, colors, typography }: Props) {
  const named = useMemo(() => nameColors(colors), [colors])
  const roles = named.filter(c => c.role !== 'support')
  const rest = named.filter(c => c.role === 'support')
  const fonts = typography.filter(t => t.font_family && t.font_family.length > 1 && t.font_family !== 'true').slice(0, 3)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div data-lenis-prevent className="flex-1 min-h-0 overflow-auto px-4 pt-5 pb-6">
        <h3 className="text-[20px] font-[630] tracking-[-0.025em] leading-tight text-ink">Build in this style</h3>
        <p className="mt-1 text-[13.5px] leading-[1.45] text-ink-3">Take this site&apos;s colours and type into your AI tool, Figma or code.</p>

        {named.length > 0 && (
          <div className="mt-5">
            {/* The palette as one object: every colour, in the kit's order. */}
            <div className="flex h-10 rounded-[12px] overflow-hidden ring-1 ring-inset ring-foreground/10">
              {named.map(c => <span key={c.hex} title={`${c.name} ${c.hex}`} className="flex-1" style={{ background: c.hex }} />)}
            </div>
            <p className="mt-2 text-[12px] text-ink-4">
              {roles.map((c, i) => (
                <span key={c.hex}>{i > 0 && ' · '}<span className="text-ink-3">{c.name}</span> {c.hex}</span>
              ))}
              {rest.length > 0 && <span> · {rest.length} more</span>}
            </p>
          </div>
        )}

        {fonts.length > 0 && (
          <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-ink">
            {fonts.map(f => (
              <span key={f.role + f.font_family} className="flex items-baseline gap-1.5">
                <span className="text-[17px] leading-none" style={{ fontFamily: `"${f.font_family}", var(--font-sans)` }}>Aa</span>
                {f.font_family} <span className="text-ink-4">{f.role}</span>
              </span>
            ))}
          </p>
        )}

        <ul className="mt-6 space-y-2.5">
          {USES.map(({ Icon, title, body }) => (
            <li key={title} className="flex items-baseline gap-2.5 text-[13px] leading-[1.45]">
              <Icon className="w-3.5 h-3.5 shrink-0 translate-y-[2px] text-ink-4" weight="bold" />
              <span><span className="font-[600] text-ink">{title}</span> <span className="text-ink-3">{body}</span></span>
            </li>
          ))}
        </ul>

        <div className="mt-6 -mx-2.5 flex items-center">
          <ThemeExport siteUrl={siteUrl} siteTitle={hostname} colors={colors} typography={typography} />
          <span className="ml-auto text-[12px] text-ink-4 pr-2.5">Free, no account</span>
        </div>
      </div>
      <div className="flex-shrink-0 h-12 px-4 flex items-center bg-foreground/[0.025] border-t border-edge">
        <KitAction siteId={siteId} />
      </div>
    </div>
  )
}
