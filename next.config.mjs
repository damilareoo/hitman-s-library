/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Vercel Blob storage — where screenshots and thumbnails are saved.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
    // Thumbnails scraped from arbitrary sites are the one case that cannot be
    // enumerated. Serving them unoptimized keeps them working without turning
    // the optimizer into an open image proxy for any host on the internet,
    // which is what `hostname: '**'` amounted to.
    dangerouslyAllowSVG: false,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
  serverExternalPackages: ['puppeteer', '@sparticuz/chromium'],
}

export default nextConfig
