/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Vercel Workflow Configuration - enables durable execution
  workflow: {
    preset: "nextjs",
  },
  serverExternalPackages: ['puppeteer', '@sparticuz/chromium'],
}

export default nextConfig
