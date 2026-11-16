import type { Metadata } from 'next'
import { SystemPage } from './_parts/system'

// Hidden: reachable by link, kept out of the nav, the sitemap and search.
export const metadata: Metadata = {
  title: 'Design system',
  description: "Every token, component, motion and sound Hitman's Library uses.",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <SystemPage />
}
