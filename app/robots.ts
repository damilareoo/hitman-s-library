import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The admin surface and everything that mutates or proxies stays out of the index.
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: 'https://hitmanslibrary.xyz/sitemap.xml',
    host: 'https://hitmanslibrary.xyz',
  }
}
