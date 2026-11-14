// components/legal-page.tsx
// The shared layout for Privacy, Terms and Refunds: one column, plain
// sections, the seller named at the foot.
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'

export interface LegalSection { title: string; body: React.ReactNode }

export function LegalPage({ title, lede, updated, sections, children }: {
  title: string; lede: string; updated: string; sections: LegalSection[]; children?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">{title}</span>
        </div>
      </nav>
      <SiteLinks />
      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">
        <div className="mb-14">
          <h1 className="text-display text-foreground mb-2">{title}</h1>
          <p className="text-bodytext text-ink-3">{lede}</p>
        </div>
        <div className="space-y-10">
          {sections.map(s => (
            <section key={s.title} id={s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} className="scroll-mt-20">
              <h2 className="text-heading text-foreground mb-2">{s.title}</h2>
              <div className="text-reading text-ink-2">{s.body}</div>
            </section>
          ))}
        </div>
        {children}
        <p className="mt-16 pt-8 border-t border-edge text-micro text-ink-4">
          Hitman&apos;s Library is run by Oluwadamilare Osofisan. Last updated {updated}.{' '}
          <a href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</a> ·{' '}
          <a href="/refunds" className="underline underline-offset-2 hover:text-ink">Refunds</a> ·{' '}
          <a href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy</a>
        </p>
      </main>
    </div>
  )
}
