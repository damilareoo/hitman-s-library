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
  // Heavy native/ML dependencies stay out of the bundled function and load
  // from node_modules at runtime (same pattern as puppeteer below). Bundling
  // onnxruntime drags every platform binary into the function and risks the
  // size limit; the dynamic imports in lib/similarity.ts tolerate absence.
  serverExternalPackages: [
    'puppeteer',
    '@sparticuz/chromium',
    '@xenova/transformers',
    'onnxruntime-node',
    '@ffmpeg-installer/ffmpeg',
    '@ffmpeg-installer/linux-x64',
  ],
}

export default nextConfig
