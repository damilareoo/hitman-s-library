import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { SubmitForm } from '@/components/submit-form'

export const metadata: Metadata = {
  title: 'Submit',
  description: "Share what you made or found — every submission is looked at by a person.",
}

// Static on purpose: no database, no per-request render. The form checks and
// submits through /api routes, so the Worker's CPU budget goes to the work,
// not to drawing this page.
export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav — the same chrome as About and Changelog. */}
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">Submit</span>
        </div>
      </nav>

      <SiteLinks />

      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">

        {/* Page header — the same shape as About and Changelog: the page
            name, then one quiet line that sets the expectation honestly. */}
        <div className="mb-14">
          <h1 className="text-display text-foreground mb-2">Submit</h1>
          <p className="text-bodytext text-ink-3">
            Share what you made or found. Every submission gets looked at by a
            person — not everything makes the shelf.
          </p>
        </div>

        <SubmitForm />
      </main>
    </div>
  )
}
