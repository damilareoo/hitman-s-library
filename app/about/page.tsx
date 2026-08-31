import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { OriginPeek } from '@/components/origin-peek'
import { Signature } from '@/components/signature'
import { queryDesigns } from '@/lib/design-queries'

export const metadata: Metadata = {
  title: 'About',
  description: "How a spreadsheet of links became Hitman's Library.",
}

// The count below is the real one, so the page has to be rendered per request
// rather than baked at build time and left to drift.
export const dynamic = 'force-dynamic'

const PEOPLE = [
  {
    key: 'damilare' as const,
    name: 'Damilare Osofisan',
    role: 'Design and build',
    avatar: '/people/damilare.png',
    github: 'https://github.com/damilareoo',
  },
  {
    key: 'florence' as const,
    name: 'Florence Eze',
    role: 'Design and build',
    avatar: '/people/florence.jpg',
    github: 'https://github.com/Judiedesigns',
  },
]

export default async function AboutPage() {
  const { pagination } = await queryDesigns({ limit: 1 })

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">About</span>
        </div>
      </nav>

      <SiteLinks />

      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">

        {/* Page header */}
        <div className="mb-14">
          <h1 className="text-display text-foreground mb-2">About</h1>
          <p className="text-bodytext text-ink-3">
            How a spreadsheet of links became a library
          </p>
        </div>

        {/* The essay */}
        <div className="space-y-6">
          <p className="text-reading text-ink-2">
            It started as a{' '}
            <OriginPeek
              src="/origin-spreadsheet.png"
              alt="The original spreadsheet — links beside notes reading 'i like the feel', 'playful vibe', 'colorful'"
              caption="The original sheet"
            >
              spreadsheet
            </OriginPeek>
            . A column of links, a column of notes, and no way to look at any
            of it.
          </p>
          <p className="text-reading text-ink-2">
            A link is not a design. To see what you had saved you had to go and
            visit it all again, a tab at a time.
          </p>
          <p className="text-reading text-ink-2">
            So it became this. Paste a link and the library goes and looks —
            photographs the page, reads the palette, works out the typefaces. A
            row becomes something you can see.
          </p>
          <p className="text-reading text-ink-2">
            {pagination.total} sites so far. First commit February 23, 2026.
          </p>
        </div>

        {/* Signed */}
        <div className="mt-16 pt-10 border-t border-edge">
          <p className="text-micro text-ink-4 mb-8">Made by</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-8">
            {PEOPLE.map((person, i) => (
              <div key={person.key}>
                <div className="flex items-center gap-3">
                  <Image
                    src={person.avatar}
                    alt=""
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full border border-edge-strong object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <a
                      href={person.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bodytext text-ink hover:opacity-70 transition-opacity block truncate"
                    >
                      {person.name}
                    </a>
                    <p className="text-meta text-ink-4 truncate">{person.role}</p>
                  </div>
                </div>

                {/* The hand, a beat apart so they sign one after the other. */}
                <div className="mt-5 text-ink max-w-[210px]">
                  <Signature
                    name={person.key}
                    label={person.name}
                    delay={i * 0.25}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-meta text-ink-4 mt-14">
          Every change is written down in the{' '}
          <Link
            href="/changelog"
            className="text-ink-3 hover:text-ink underline underline-offset-2 decoration-edge-strong transition-colors"
          >
            changelog
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
