import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import changelog, { AUTHORS, groupByMonth, releaseAuthors, type Author, type ChangeItem } from '@/data/changelog'
import { ChangelogRail } from '@/components/changelog-rail'

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in Hitman's Library.",
}

const DOT_COLOR: Record<ChangeItem['type'], string> = {
  new:      'bg-[var(--color-success)]',
  improved: 'bg-[var(--color-running)]',
  fixed:    'bg-ink-4',
}

const TYPE_LABEL: Record<ChangeItem['type'], string> = {
  new:      'New',
  improved: 'Improved',
  fixed:    'Fixed',
}

const TYPE_TEXT: Record<ChangeItem['type'], string> = {
  new:      'text-[var(--color-success)]/70',
  improved: 'text-[var(--color-running)]/70',
  fixed:    'text-ink-4',
}

/**
 * A person, as one disc — used per change line, where eight photographs down
 * a single column would shout over the text they are annotating.
 *
 * Monochrome on purpose: green and blue already mean New and Improved on this
 * page, and a second colour system competing with that one would make both
 * harder to read rather than either easier.
 */
function Monogram({ author }: { author: Author }) {
  return (
    <span
      className={[
        'shrink-0 inline-flex items-center justify-center select-none',
        'w-[18px] h-[18px] rounded-full border border-edge-strong bg-muted',
        // text-micro carries 0.08em of tracking, which on a single centred
        // glyph is half a letter of drift to the right. Set flat here.
        'font-mono text-[9px] leading-none tracking-normal text-ink-2',
      ].join(' ')}
    >
      <span aria-hidden="true">{AUTHORS[author].name.charAt(0)}</span>
      <span className="sr-only">{AUTHORS[author].name}</span>
    </span>
  )
}

/**
 * A person, as their face. Only the byline gets one — seen once per release,
 * at the top, where there is room to read it as a face rather than a speck.
 *
 * The ring is the page ground drawn back around each disc: the pair overlap,
 * and without it the one behind reads as a dent in the one in front.
 */
function Avatar({ author }: { author: Author }) {
  const person = AUTHORS[author]
  return (
    <Image
      src={person.avatar}
      alt={person.name}
      width={20}
      height={20}
      className="w-5 h-5 rounded-full object-cover ring-[2.5px] ring-background border border-edge-strong"
    />
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export default function ChangelogPage() {
  const months = groupByMonth(changelog)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ChangelogRail months={months} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-meta text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3 h-3" weight="regular" />
            Gallery
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-meta text-ink-3 hover:text-ink transition-colors"
            >
              About
            </Link>
            <span className="text-meta text-ink-4">Changelog</span>
          </div>
        </div>
      </nav>

      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">

        {/* Page header */}
        <div className="mb-14">
          <h1 className="text-display text-foreground mb-2">
            Changelog
          </h1>
          <p className="text-bodytext text-ink-3">
            What's new in Hitman's Library
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-0">
          {months.map((month, mi) => (
            <section key={month.id} id={month.id} className="scroll-mt-16">

              {/* Where a month turns over. The first needs no marker — the
                  page header has just said what you are looking at. */}
              {mi > 0 && (
                <div className="relative flex gap-8 pb-8">
                  <div className="absolute left-[5px] top-0 bottom-0 w-px bg-edge" />
                  <div className="shrink-0 w-[11px]" />
                  <span className="text-micro text-ink-4">
                    {month.label} {month.year}
                  </span>
                </div>
              )}

              {month.releases.map(({ index: i }) => {
            const release = changelog[i]
            const authors = releaseAuthors(release)
            // One person's release says so once, beside the date. Only a
            // release with more than one hand in it needs each line named.
            const attributeItems = authors.length > 1
            return (
            <div
              key={i}
              id={`rel-${i}`}
              data-release-index={i}
              className="relative flex gap-8 pb-14 last:pb-0 scroll-mt-16"
            >

              {/* Timeline line */}
              {i < changelog.length - 1 && (
                <div className="absolute left-[5px] top-[11px] -bottom-8 w-px bg-edge" />
              )}

              {/* Timeline dot */}
              <div className="relative shrink-0 mt-[4px]">
                <div className={[
                  'w-[11px] h-[11px] rounded-full border-2',
                  i === 0
                    ? 'bg-foreground border-foreground'
                    : 'bg-background border-edge-strong',
                ].join(' ')} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">

                {/* Date + byline + latest badge */}
                <div className="flex items-center gap-2 mb-1">
                  <time className="text-meta text-ink-3">
                    {formatDate(release.date)}
                  </time>
                  {authors.length > 0 && (
                    <span className="flex items-center -space-x-1 ml-0.5">
                      {authors.map(a => (
                        <Avatar key={a} author={a} />
                      ))}
                    </span>
                  )}
                  {i === 0 && (
                    <span className="text-micro px-1.5 py-0.5 rounded-[4px] bg-foreground text-background">
                      Latest
                    </span>
                  )}
                </div>

                {/* Release title */}
                <h2 className="text-heading text-foreground mb-1.5">
                  {release.title}
                </h2>

                {/* Optional description */}
                {release.description && (
                  <p className="text-reading text-ink-2 mb-4">
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
                      {attributeItems && item.author && (
                        <div className="shrink-0 -ml-1 -mt-[3px]">
                          <Monogram author={item.author} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-reading text-ink-2">
                          {item.text}
                        </p>
                      </div>
                      <span className={`shrink-0 text-micro pt-[3px] ${TYPE_TEXT[item.type]}`}>
                        {TYPE_LABEL[item.type]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )
              })}
            </section>
          ))}
        </div>

        <p className="text-meta text-ink-4 mt-10">
          Feb 23, 2026 — first commit
        </p>
      </main>
    </div>
  )
}
