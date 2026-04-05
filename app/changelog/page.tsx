import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import changelog, { type ChangeItem } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in Hitman's Library — feature releases and improvements.",
}

const TYPE_STYLES: Record<ChangeItem['type'], { badge: string; dot: string }> = {
  new:      { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', dot: 'bg-emerald-500' },
  improved: { badge: 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20',            dot: 'bg-blue-500' },
  fixed:    { badge: 'bg-muted text-muted-foreground border border-border/60',                               dot: 'bg-muted-foreground/40' },
}

const TYPE_LABEL: Record<ChangeItem['type'], string> = {
  new: 'New', improved: 'Improved', fixed: 'Fixed',
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

export default function ChangelogPage() {
  const total = changelog.reduce((n, r) => n + r.items.length, 0)

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] font-medium text-foreground hover:text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" weight="regular" />
            Hitman&apos;s Library
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
            {total} updates
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">
            Release notes
          </p>
          <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.0] text-foreground">
            What&apos;s new
          </h1>
          <p className="text-[14px] text-muted-foreground mt-4 max-w-sm leading-relaxed">
            A running record of every feature, improvement, and fix shipped to the library.
          </p>
        </div>
      </div>

      {/* Entries */}
      <div className="max-w-3xl mx-auto px-5 md:px-8 divide-y divide-border/40">
        {changelog.map((release, i) => {
          const releaseNum = String(changelog.length - i).padStart(2, '0')
          return (
            <article key={i} className="py-12 md:py-14 grid md:grid-cols-[140px_1fr] gap-6 md:gap-12">

              {/* Left: big number + date */}
              <div className="flex md:flex-col items-start gap-3 md:gap-3">
                <span className="font-mono text-[52px] md:text-[64px] font-bold leading-none text-foreground/[0.07] select-none tabular-nums">
                  {releaseNum}
                </span>
                <time
                  dateTime={release.date}
                  className="block text-[10px] font-mono text-muted-foreground/40 tracking-[0.1em] uppercase mt-auto md:mt-0 pt-1 md:pt-0"
                >
                  {formatDateShort(release.date)}
                </time>
              </div>

              {/* Right: content */}
              <div className="min-w-0">
                <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em] leading-snug text-foreground mb-2">
                  {release.title}
                </h2>
                {release.description && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-7 max-w-[420px]">
                    {release.description}
                  </p>
                )}

                <ul className="space-y-3">
                  {release.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0 mt-[2px]">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_STYLES[item.type].dot}`} />
                        <span className={`text-[9px] font-mono uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[3px] ${TYPE_STYLES[item.type].badge}`}>
                          {TYPE_LABEL[item.type]}
                        </span>
                      </div>
                      <span className="text-[13px] text-foreground/70 leading-snug">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}

        {/* Origin cap */}
        <div className="py-12 md:py-14 grid md:grid-cols-[140px_1fr] gap-6 md:gap-12">
          <span className="font-mono text-[52px] md:text-[64px] font-bold leading-none text-foreground/[0.04] select-none tabular-nums">
            00
          </span>
          <div className="flex items-center">
            <p className="text-[12px] font-mono text-muted-foreground/30 tracking-[0.04em]">
              Feb 23, 2026 — first commit
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
