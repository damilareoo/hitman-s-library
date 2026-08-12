import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hitman's Library",
    short_name: 'Library',
    description:
      'A personal infrastructure for everything worth saving on the web. No folders. No bookmarks. Just the library.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f5',
    theme_color: '#f7f7f5',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
  }
}
