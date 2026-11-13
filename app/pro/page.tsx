import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { ProCard } from '@/components/pro-card'

export const metadata: Metadata = {
  title: 'Pro',
  description: "Unlimited style kits and Pro search across Hitman's Library.",
}

export default function ProPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">Pro</span>
        </div>
      </nav>
      <SiteLinks />
      <main className="px-4 pt-16 pb-32 flex justify-center">
        <ProCard />
      </main>
    </div>
  )
}
