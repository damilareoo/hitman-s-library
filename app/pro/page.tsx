import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { ProCard } from '@/components/pro-card'
import { ProExtras } from '@/components/pro-extras'
import { loadProSample } from '@/lib/read/pro-sample'

export const metadata: Metadata = {
  title: 'Pro',
  description: "Search by palette and font, redesign alerts, site history, monthly trends, and the library inside your AI tools.",
}

// Live library data (trends, a featured site's kit), rendered per request.
export const dynamic = 'force-dynamic'

export default async function ProPage() {
  const sample = await loadProSample().catch(() => ({ trends: [] as string[] }))
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">Pro</span>
        </div>
      </nav>
      <SiteLinks />
      <main id="top" className="px-4 pt-8 sm:pt-12 pb-32 flex flex-col items-center gap-8">
        <ProCard />
        <ProExtras sample={sample} />
      </main>
    </div>
  )
}
