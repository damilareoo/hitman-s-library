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
  { Icon: Sparkle, title: 'AI tool', body: 'Add DESIGN.md to Claude, Cursor or v0 and ask for this style.' },
  { Icon: FigmaLogo, title: 'Figma', body: 'Import the colours and fonts as variables.' },
  { Icon: Code, title: 'Code', body: 'Paste theme.css, or the Tailwind theme.' },
]

export function KitTab({ siteId, siteUrl, hostname, colors, typography }: Props) {
  const named = useMemo(() => nameColors(colors), [colors])
  const roles = named.filter(c => c.role !== 'support')
  const rest = named.filter(c => c.role === 'support')
  const fonts = typography.filter(t => t.font_family && t.font_family.length > 1 && t.font_family !== 'true').slice(0, 3)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div data-lenis-prevent className="flex-1 min-h-0 overflow-auto px-4 pt-5 pb-6">
        <h3 className="text-[20px] font-[640] tracking-[-0.025em] leading-tight text-ink">Build in this style</h3>
        <p className="mt-1.5 text-[13.5px] leading-[1.45] text-ink-3 text-pretty">
          Take this site&apos;s colours and type into your AI tool, Figma or code.
        </p>

        {named.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-wrap gap-x-4 gap-y-2.5">
              {roles.map(c => (
                <span key={c.hex} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-5 h-5 rounded-[5px] ring-1 ring-inset ring-foreground/10" style={{ background: c.hex }} />
                  <span className="text-ink">{c.name}</span>
                  <span className="text-ink-4">{c.hex}</span>
                </span>
              ))}
            </div>
            {rest.length > 0 && (
              <div className="mt-3 flex items-center gap-1">
                {rest.slice(0, 14).map(c => (
                  <span key={c.hex} title={`${c.name} ${c.hex}`} className="w-4 h-4 rounded-[4px] ring-1 ring-inset ring-foreground/10" style={{ background: c.hex }} />
                ))}
                {rest.length > 14 && <span className="ml-1 text-[12px] text-ink-4">+{rest.length - 14}</span>}
              </div>
            )}
          </div>
        )}

        {fonts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {fonts.map(f => (
              <span key={f.role + f.font_family} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="text-[18px] leading-none text-ink" style={{ fontFamily: `"${f.font_family}", var(--font-sans)` }}>Aa</span>
                <span className="text-ink">{f.font_family}</span>
                <span className="text-ink-4">{f.role}</span>
              </span>
            ))}
          </div>
        )}

        <ul className="mt-6 border-t border-edge-faint">
          {USES.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 py-3 border-b border-edge-faint">
              <Icon className="w-4 h-4 mt-0.5 shrink-0 text-ink-3" weight="bold" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-[600] tracking-[-0.01em] text-ink">{title}</p>
                <p className="mt-0.5 text-[12.5px] leading-[1.45] text-ink-3">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-ink-4">One zip with the full-size captures. Colours named by role and hue, values checked.</p>

        {/* The quick copies stay free and need no account. */}
        <div className="mt-6 flex items-center justify-between gap-3 rounded-[10px] border border-edge-faint pl-3 pr-1.5 h-11">
          <span className="text-[12.5px] text-ink-3 whitespace-nowrap">Copy now, free</span>
          <ThemeExport siteUrl={siteUrl} siteTitle={hostname} colors={colors} typography={typography} />
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-edge-faint px-4 h-12 flex items-center">
        <KitAction siteId={siteId} />
      </div>
    </div>
  )
}
