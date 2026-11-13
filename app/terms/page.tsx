import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Terms',
  description: "The terms for using Hitman's Library and Hitman's Library Pro.",
}

const mail = <a className="underline underline-offset-2 hover:text-ink" href="mailto:hello@damilare.works">hello@damilare.works</a>

const SECTIONS: LegalSection[] = [
  {
    title: 'Who we are',
    body: <>Hitman&apos;s Library (hitmanslibrary.xyz) is run by Oluwadamilare Osofisan, an individual. You can reach us at {mail}.</>,
  },
  {
    title: 'The library',
    body: <>Browsing the library is free and needs no account. The sites shown belong to their owners. We show captures and measured colours and type for reference and study.</>,
  },
  {
    title: 'Accounts',
    body: <>An account is optional. Keep access to your email or Google account safe, since that is how you sign in. You can delete your account at any time from the privacy page.</>,
  },
  {
    title: 'Pro',
    body: <>Pro is a subscription, billed monthly or yearly. The price is the same everywhere and is shown in your currency, where possible, before you pay. It renews automatically until you cancel. Cancel any time from your receipt email or by writing to us; you keep Pro until the end of the period you paid for.</>,
  },
  {
    title: 'Payments',
    body: <>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Your card details go to Paddle, never to us.</>,
  },
  {
    title: 'Style kits',
    body: <>A style kit records the colours and type measured from a public site. Use kits for your own work and learning. Don&apos;t resell kits or the library&apos;s data as a product, and respect the trademarks and copyright of the sites they come from.</>,
  },
  {
    title: 'Fair use',
    body: <>Don&apos;t scrape the library in bulk, try to get around limits, or interfere with the service. We may suspend accounts that do.</>,
  },
  {
    title: 'No warranty',
    body: <>The library is provided as is. Measurements can be wrong, and sites change after they are captured. To the extent the law allows, our liability is limited to what you paid us in the last twelve months.</>,
  },
  {
    title: 'Changes',
    body: <>If these terms change in a way that matters, we&apos;ll say so on the changelog and, for Pro members, by email before it takes effect.</>,
  },
]

export default function TermsPage() {
  return <LegalPage title="Terms" lede="The rules for using the library and Pro, in plain words" updated="November 13, 2026" sections={SECTIONS} />
}
