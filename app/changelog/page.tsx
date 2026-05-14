import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import changelog, { type ChangeItem } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in Hitman's Library.",
}

const DOT_COLOR: Record<ChangeItem['type'], string> = {
  new:      'bg-[var(--color-success)]',
  improved: 'bg-[var(--color-running)]',
  fixed:    'bg-muted-foreground/30',
}

const TYPE_LABEL: Record<ChangeItem['type'], string> = {
  new:      'New',
  improved: 'Improved',
  fixed:    'Fixed',
}

const TYPE_TEXT: Record<ChangeItem['type'], string> = {
  new:      'text-[var(--color-success)]/70',
  improved: 'text-[var(--color-running)]/70',
  fixed:    'text-muted-foreground/35',
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" weight="regular" />
            Gallery
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground/30 tracking-wide">Changelog</span>
        </div>
      </nav>

      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">

        {/* Page header */}
        <div className="mb-14">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground leading-none mb-2">
            Changelog
          </h1>
          <p className="text-[13px] text-muted-foreground/50">
            What's new in Hitman's Library
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-0">
          {changelog.map((release, i) => (
            <div key={i} className="relative flex gap-8 pb-14 last:pb-0">

              {/* Timeline line */}
              {i < changelog.length - 1 && (
                <div className="absolute left-[5px] top-[11px] bottom-0 w-px bg-border/40" />
              )}

              {/* Timeline dot */}
              <div className="relative shrink-0 mt-[4px]">
                <div className={[
                  'w-[11px] h-[11px] rounded-full border-2',
                  i === 0
                    ? 'bg-foreground border-foreground'
                    : 'bg-background border-border',
                ].join(' ')} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">

                {/* Date + latest badge */}
                <div className="flex items-center gap-2 mb-1">
                  <time className="text-[11px] font-mono text-muted-foreground/50 tracking-wide">
                    {formatDate(release.date)}
                  </time>
                  {i === 0 && (
                    <span className="text-[8px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[2px] bg-foreground text-background">
                      Latest
                    </span>
                  )}
                </div>

                {/* Release title */}
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground leading-snug mb-1">
                  {release.title}
                </h2>

                {/* Optional description */}
                {release.description && (
                  <p className="text-[12.5px] text-muted-foreground/55 leading-relaxed mb-4">
                    {release.description}
                  </p>
                )}

                {/* Change items */}
                <div className="mt-4 space-y-3">
                  {release.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="shrink-0 mt-[6px]">
                        <div className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[item.type]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] text-foreground/70 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-mono pt-[3px] ${TYPE_TEXT[item.type]}`}>
                        {TYPE_LABEL[item.type]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-mono text-muted-foreground/20 mt-10">
          Feb 23, 2026 — first commit
        </p>
      </main>
    </div>
  )
}
