import type { Metadata } from 'next'
import { getCardFacts, getCardSite, hostnameOf } from './data'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const [site, facts] = await Promise.all([getCardSite(id), getCardFacts(id)])
  const title = site ? `${site.title ?? hostnameOf(site.url)} — Hitman’s Library` : 'Hitman’s Library'
  const faces = site?.typography.map(t => t.font_family).filter(Boolean).slice(0, 3).join(', ')
  const description = site
    ? [facts?.kind, facts?.architecture, faces && `type: ${faces}`].filter(Boolean).join(' · ')
    : 'A personal infrastructure for everything worth saving on the web.'
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/site/${id}`,
      images: [{ url: `/site/${id}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/site/${id}/opengraph-image`],
    },
  }
}

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const site = await getCardSite(id)

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        background: '#f7f7f5',
        padding: 24,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/site/${id}/opengraph-image`}
        alt={site ? `Share card for ${hostnameOf(site.url)}` : 'Hitman’s Library card'}
        width={1200}
        height={630}
        style={{ width: '100%', maxWidth: 960, height: 'auto', borderRadius: 12 }}
      />
      <a href={`/?site=${id}`} style={{ color: '#111111', fontSize: 15 }}>
        Open in the library →
      </a>
    </main>
  )
}
