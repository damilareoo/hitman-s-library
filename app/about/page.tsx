import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
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
          <Link
            href="/"
            className="flex items-center gap-1.5 text-meta text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3 h-3" weight="regular" />
            Gallery
          </Link>
          <span className="text-meta text-ink-4">About</span>
        </div>
      </nav>

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
              alt="The original spreadsheet: a column of site addresses beside notes reading 'i like the feel', 'playful vibe', 'colorful', with tabs for e-commerce, sections, landing pages and UX"
              caption="Websites — the original sheet"
            >
              spreadsheet
            </OriginPeek>
            . A column of addresses, a column of notes on why each one was
            worth keeping, and no way to look at any of it.
          </p>
          <p className="text-reading text-ink-2">
            Opening the file told you nothing. An address is not a design — to
            see what you had saved you had to go and visit all of it again, a
            tab at a time, and by the time you got there you had forgotten what
            you went looking for. The sheet was a record of taste that you
            could not actually see.
          </p>
          <p className="text-reading text-ink-2">
            So it became this. Paste an address and the library goes and looks:
            photographs the page end to end, reads the palette back as hex and
            OKLCH, works out which typefaces are doing which job. A row becomes
            something you can look at. The importer that read the original
            sheet is still in the codebase, which feels about right.
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
