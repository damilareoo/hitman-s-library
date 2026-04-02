import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import changelog, { type ChangeItem } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in Hitman's Library — feature releases and improvements.",
}

const TYPE_STYLES: Record<ChangeItem['type'], string> = {
  new:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  improved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  fixed:    'bg-muted text-muted-foreground',
}

const TYPE_LABEL: Record<ChangeItem['type'], string> = {
  new:      'New',
  improved: 'Improved',
  fixed:    'Fixed',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-medium tracking-[-0.01em]">Hitman's Library</h1>
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

      <div className="max-w-2xl mx-auto px-5 md:px-7 py-12">

        {/* Intro */}
        <div className="mb-12">
          <p className="text-[13px] font-mono text-muted-foreground leading-relaxed">
            Every release, from the first ship to now.
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-14">
          {changelog.map((release, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] gap-8 items-start">

              {/* Date column */}
              <div className="pt-0.5 shrink-0">
                <time
                  dateTime={release.date}
                  className="text-[11px] font-mono text-muted-foreground/60 tracking-wide"
                >
                  {formatDate(release.date)}
                </time>
              </div>

              {/* Content column */}
              <div className="space-y-3">
                <h2 className="text-[15px] font-medium tracking-[-0.01em] leading-snug">
                  {release.title}
                </h2>

                {release.description && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {release.description}
                  </p>
                )}

                <ul className="space-y-2 pt-1">
                  {release.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[3px] shrink-0 mt-0.5 uppercase tracking-[0.08em] ${TYPE_STYLES[item.type]}`}>
                        {TYPE_LABEL[item.type]}
                      </span>
                      <span className="text-[13px] text-foreground/80 leading-snug">{item.text}</span>
                    </li>
                  ))}
                </ul>

                {i < changelog.length - 1 && (
                  <div className="pt-6 border-b border-border/20" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-6 border-t border-border/30">
          <p className="text-[11px] font-mono text-muted-foreground/40">
            Since Feb 23, 2026
          </p>
        </div>
      </div>
    </div>
  )
}
