import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Refunds',
  description: "How refunds work for Hitman's Library Pro.",
}

const SECTIONS: LegalSection[] = [
  {
    title: '14 days, no questions',
    body: <>If Pro isn&apos;t for you, ask for a full refund within 14 days of any payment, first or renewal. You don&apos;t need to give a reason.</>,
  },
  {
    title: 'How to ask',
    body: <>Use the link in your Paddle receipt email, or write to <a className="underline underline-offset-2 hover:text-ink" href="mailto:hello@damilare.works">hello@damilare.works</a> from the email you paid with. Paddle, our reseller, processes the refund back to the way you paid.</>,
  },
  {
    title: 'After 14 days',
    body: <>Cancel any time to stop the next renewal. You keep Pro until the end of the period you paid for.</>,
  },
]

export default function RefundsPage() {
  return <LegalPage title="Refunds" lede="Simple, and on your side" updated="November 13, 2026" sections={SECTIONS} />
}
