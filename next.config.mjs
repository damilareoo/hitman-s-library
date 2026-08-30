/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Vercel Blob storage — where screenshots and thumbnails are saved
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Broad catch-all for user-submitted site thumbnails from arbitrary domains
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ['puppeteer', '@sparticuz/chromium'],
}

export default nextConfig
