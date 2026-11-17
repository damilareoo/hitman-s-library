// app/site/[...slug]/page.tsx
// A site's own page: /site/plastic.audio. It renders the gallery with that
// site's panel open, exactly like /?site=plastic.audio did, but it is its own
// indexable address with a title, description and link card of its own. Paths
// keep their segments: /site/vercel.com/design/guidelines.
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import HomePage from '@/app/page'
import { loadSitePage, describeSite } from '@/lib/read/site-page'

export const revalidate = 300

type Params = Promise<{ slug: string[] }>

const slugOf = (parts: string[]) => parts.map(decodeURIComponent).join('/').toLowerCase()

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const site = await loadSitePage(slugOf((await params).slug))
  if (!site) return { title: "Not found · Hitman's Library", robots: { index: false } }
  const title = `${site.name}: colours, fonts and design tokens`
  const description = `${site.name} (${site.domain}) in Hitman's Library${site.kind ? `, filed under ${site.kind}` : ''}. ${describeSite(site)} Copy the palette as CSS or Tailwind.`
  const path = `/site/${site.slug}`
  const images = site.image ? [{ url: site.image, alt: `${site.name}, as captured by Hitman's Library` }] : undefined
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: { type: 'article', url: path, title, description, siteName: "Hitman's Library", ...(images ? { images } : {}) },
    twitter: { card: 'summary_large_image', title, description, ...(images ? { images: images.map(i => i.url) } : {}) },
  }
}

export default async function SitePage({ params }: { params: Params }) {
  const slug = slugOf((await params).slug)
  const site = await loadSitePage(slug)
  if (!site) notFound()
  // Old ids and odd casing land on the one address.
  if (site.slug !== slug) permanentRedirect(`/site/${site.slug}`)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${site.name}: colours, fonts and design tokens`,
    url: `https://hitmanslibrary.xyz/site/${site.slug}`,
    description: describeSite(site),
    ...(site.image ? { primaryImageOfPage: site.image } : {}),
    about: { '@type': 'WebSite', name: site.name, url: site.url },
    isPartOf: { '@type': 'WebSite', name: "Hitman's Library", url: 'https://hitmanslibrary.xyz' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <HomePage searchParams={Promise.resolve({ site: site.slug })} />
    </>
  )
}
