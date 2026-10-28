import posthog from 'posthog-js'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (!projectToken || !host) {
  const missingVariable = !projectToken
    ? 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
    : 'NEXT_PUBLIC_POSTHOG_HOST'

  if (process.env.NODE_ENV === 'development') {
    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    )
  }
  console.warn(`[posthog] ${missingVariable} is not configured — analytics are off until it is set in the Vercel environment and the site is redeployed`)
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
}
