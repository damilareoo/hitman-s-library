import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Refunds',
  description: "How refunds work for Hitman's Library Pro.",
}

const mail = <a className="underline underline-offset-2 hover:text-ink" href="mailto:hello@damilare.works">hello@damilare.works</a>

const SECTIONS: LegalSection[] = [
  {
    title: 'Payments are final',
    body: <>Pro is $5 a month or $48 a year, and it starts the moment you pay, so payments aren&apos;t refundable.</>,
  },
  {
    title: 'When we do refund',
    body: <>A duplicate charge, a billing mistake on our side, or anywhere the law requires it. Write to {mail} from the email you paid with, and we refund it through Bachs, our payment processor, to the card you paid with.</>,
  },
  {
    title: 'Cancel any time',
    body: <>Cancelling stops the next renewal. You keep Pro until the end of the period you paid for.</>,
  },
  {
    // The page promised 14 days, no questions, until this date. A payment made
    // under that promise keeps it.
    title: 'Paid before November 16, 2026?',
    body: <>The 14-day refund you signed up under still applies to that payment.</>,
  },
]

export default function RefundsPage() {
  return <LegalPage title="Refunds" lede="Simple, and clear before you pay" updated="November 16, 2026" sections={SECTIONS} />
}
