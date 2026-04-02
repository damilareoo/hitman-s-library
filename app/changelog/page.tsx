import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import changelog, { type ChangeItem } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in Hitman's Library — feature releases and improvements.",
}

const TYPE_LABEL: Record<ChangeItem['type'], string> = {
  new:      'New',
  improved: 'Improved',
  fixed:    'Fixed',
}

const TYPE_DOT: Record<ChangeItem['type'], string> = {
  new:      'bg-emerald-500',
  improved: 'bg-blue-500',
  fixed:    'bg-border',
}

const TYPE_TEXT: Record<ChangeItem['type'], string> = {
  new:      'text-emerald-600 dark:text-emerald-400',
  improved: 'text-blue-500 dark:text-blue-400',
  fixed:    'text-muted-foreground',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-medium tracking-[-0.01em]">Hitman's Library</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-[3px]">
              Changelog
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" weight="regular" />
            Gallery
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-14 pb-24">

        {/* Timeline */}
        <div className="relative">

          {/* Vertical spine */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/40" />

          <div className="space-y-0">
            {changelog.map((release, i) => (
              <div key={i} className="relative pl-8">

                {/* Timeline node */}
                <div className="absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border border-border/60 bg-background flex items-center justify-center">
                  <div className="w-[5px] h-[5px] rounded-full bg-foreground/40" />
                </div>

                {/* Horizontal connector */}
                <div className="absolute left-[15px] top-[13px] w-4 h-px bg-border/40" />

                {/* Release block */}
                <div className="pb-12">

                  {/* Date */}
                  <time
                    dateTime={release.date}
                    className="block text-[10px] font-mono text-muted-foreground/50 tracking-[0.08em] uppercase mb-2"
                  >
                    {formatDate(release.date)}
                  </time>

                  {/* Title + description */}
                  <h2 className="text-[14px] font-medium tracking-[-0.01em] leading-snug mb-1">
                    {release.title}
                  </h2>
                  {release.description && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed mb-4 max-w-sm">
                      {release.description}
                    </p>
                  )}

                  {/* Change items */}
                  <ul className="space-y-2.5">
                    {release.items.map((item, j) => (
                      <li key={j} className="flex items-baseline gap-3">
                        <div className="flex items-center gap-1.5 shrink-0 w-[72px]">
                          <div className={`w-1 h-1 rounded-full shrink-0 ${TYPE_DOT[item.type]}`} />
                          <span className={`text-[9px] font-mono uppercase tracking-[0.1em] ${TYPE_TEXT[item.type]}`}>
                            {TYPE_LABEL[item.type]}
                          </span>
                        </div>
                        <span className="text-[12px] text-foreground/75 leading-snug">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {/* Origin cap */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border border-border/40 bg-background flex items-center justify-center">
                <div className="w-[5px] h-[5px] rounded-full bg-border" />
              </div>
              <div className="absolute left-[15px] top-[13px] w-4 h-px bg-border/40" />
              <p className="text-[10px] font-mono text-muted-foreground/30 tracking-[0.08em] pt-1">
                Feb 23, 2026 — first commit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
