// lib/analytics.ts
//
// Analytics only ever happen in the browser, so the server should never carry
// PostHog. Importing `posthog-js` at the top of a client component still puts
// all 340 KB of it into the server render bundle, which the Worker has to load
// on every cold start. These helpers import it lazily, in the browser only.
// instrumentation-client.ts initialises the same module instance on load.

type Props = Record<string, unknown>

export function track(event: string, props?: Props): void {
  if (typeof window === 'undefined') return
  import('posthog-js')
    .then(({ default: posthog }) => posthog.capture(event, props))
    .catch(() => {})
}

export function trackException(error: unknown): void {
  if (typeof window === 'undefined') return
  import('posthog-js')
    .then(({ default: posthog }) => posthog.captureException(error))
    .catch(() => {})
}
