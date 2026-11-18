// lib/analytics.ts
//
// Analytics only ever happen in the browser, so the server should never carry
// PostHog. Importing `posthog-js` at the top of a client component still puts
// all 340 KB of it into the server render bundle, which the Worker has to load
// on every cold start. These helpers import it lazily, in the browser only.
// instrumentation-client.ts initialises the same module instance on load.

import { hit } from '@/lib/beacon/client'

type Props = Record<string, unknown>

/** Our own counter's name for a PostHog event: the clicks the dashboard groups. */
const OWN_KIND: Record<string, string> = {
  design_opened: 'open',
  theme_exported: 'export',
  color_copied: 'copy',
}

export function track(event: string, props?: Props): void {
  if (typeof window === 'undefined') return
  // Our own counter first: it is first-party, so ad blockers leave it alone.
  hit(OWN_KIND[event] ?? event, {
    site: props?.source_id ?? props?.site_id,
    target: props?.format ?? props?.opening_surface ?? props?.plan ?? props?.surface,
  })
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
