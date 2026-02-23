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
}

export default nextConfig
