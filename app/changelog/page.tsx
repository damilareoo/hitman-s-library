import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import changelog, { type ChangeItem } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in Hitman's Library.",
}

const TYPE_COLOR: Record<ChangeItem['type'], string> = {
  new:      'bg-[var(--color-success)]',
  improved: 'bg-[var(--color-running)]',
  fixed:    'bg-foreground/20',
}

const TYPE_LABEL: Record<ChangeItem['type'], string> = {
  new:      'New',
  improved: 'Improved',
  fixed:    'Fixed',
}

const TYPE_TEXT: Record<ChangeItem['type'], string> = {
  new:      'text-[var(--color-success)]',
  improved: 'text-[var(--color-running)]',
  fixed:    'text-muted-foreground/50',
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" weight="regular" />
            Gallery
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground/40">Changelog</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 pt-10 pb-24">

        {changelog.map((release, i) => (
          <section key={i} className="mb-10">

            {/* Date header — like the Deputy "Thursday, 05 March" */}
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[13px] font-semibold text-foreground shrink-0">
                {formatDate(release.date)}
              </h2>
              {i === 0 && (
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-px rounded-[2px] bg-foreground text-background shrink-0">
                  Latest
                </span>
              )}
            </div>
            <hr className="border-border/50 mb-1" />

            {/* Release title row */}
            <div className="py-2.5 border-b border-border/30">
              <p className="text-[13px] text-muted-foreground/60 italic">{release.title}</p>
            </div>

            {/* Change rows */}
            {release.items.map((item, j) => (
              <div
                key={j}
                className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-b-0"
              >
                {/* Left indicator */}
                <div className="shrink-0 mt-[5px] flex items-center justify-center w-5 h-5 rounded-full bg-muted border border-border/50">
                  <div className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[item.type]}`} />
                </div>

                {/* Text */}
                <p className="flex-1 text-[13px] text-foreground/80 leading-snug pt-0.5">
                  {item.text}
                </p>

                {/* Type label */}
                <span className={`shrink-0 text-[10px] font-mono pt-0.5 ${TYPE_TEXT[item.type]}`}>
                  {TYPE_LABEL[item.type]}
                </span>
              </div>
            ))}

          </section>
        ))}

        <p className="text-[10px] font-mono text-muted-foreground/25 mt-6">
          Feb 23, 2026 — first commit
        </p>
      </main>
    </div>
  )
}
