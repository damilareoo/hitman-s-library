import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { NotFoundCard } from '@/components/not-found-card'

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: true },
}

// Same frame as the Pro page: the secondary nav, then one card centred.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">404</span>
        </div>
      </nav>
      <SiteLinks />
      <main className="px-4 pt-8 sm:pt-16 pb-32 flex flex-col items-center">
        <NotFoundCard />
      </main>
    </div>
  )
}
