import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { TrendsReport } from '@/components/trends-report'

export const metadata: Metadata = {
  title: 'Trends',
  description: "What the newest sites in Hitman's Library do differently: typefaces, colours and kinds on the rise.",
}

export default function TrendsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">Trends</span>
        </div>
      </nav>
      <SiteLinks />
      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">
        <TrendsReport />
      </main>
    </div>
  )
}
