import type { MetadataRoute } from 'next'
import { queryAllSitesIndex } from '@/lib/design-queries-cached'
import { sitePath } from '@/lib/site-slug'

const BASE = 'https://hitmanslibrary.xyz'

export const revalidate = 3600

// Filtered gallery views are marked noindex in generateMetadata, so the sitemap
// lists the canonical surfaces plus one page per site (/site/plastic.audio).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const sites = await queryAllSitesIndex().catch(() => [])
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...sites.map(s => ({ url: BASE + sitePath(s.url), changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/pro`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/refunds`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
