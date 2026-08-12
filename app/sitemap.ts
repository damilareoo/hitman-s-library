import type { MetadataRoute } from 'next'

const BASE = 'https://hitmanslibrary.xyz'

// Filtered gallery views are marked noindex in generateMetadata, so the sitemap
// lists only the canonical surfaces.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ]
}
