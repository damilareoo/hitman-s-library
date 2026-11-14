import rgbaFallback from './lib/build/rgba-fallback.mjs'

/** @type {import('postcss-load-config').Config} */
const config = {
  // rgba twins for Tailwind's color-mix tints, for Safari without color-mix.
  plugins: ['@tailwindcss/postcss', rgbaFallback],
}

export default config
