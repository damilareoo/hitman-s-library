import Link from 'next/link'
import type { Metadata } from 'next'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { DeleteAccount } from '@/components/delete-account'

export const metadata: Metadata = {
  title: 'Privacy',
  description: "What Hitman's Library keeps about you, why, and how to remove it.",
}

const UPDATED = 'November 13, 2026'

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Browsing',
    body: <>You can use the whole library without an account. Hearts and sets you make while signed out stay in your browser and never reach us.</>,
  },
  {
    title: 'Your account',
    body: <>If you sign in, we keep your email address, and your name and photo if you use Google. We keep the sites you heart and the sets you make, so they follow you between devices. Your member number is the order you joined in.</>,
  },
  {
    title: 'Signing in',
    body: <>Sign-in links are sent by email and work once. We store a scrambled form of each link and session, never the link or session itself. Two cookies keep you signed in: one secure session cookie and one that only says you are signed in. Google sign-in shares your email, name and photo with us, nothing else.</>,
  },
  {
    title: 'Submissions and the digest',
    body: <>When you submit a site we keep the address, plus any name, email and note you choose to leave, so we can credit you and reply. If you join the weekly digest we keep your email and the sites you hearted, to pick what to send. Every digest has an unsubscribe link.</>,
  },
  {
    title: 'Analytics and abuse prevention',
    body: <>We count visits and clicks with PostHog and Cloudflare Web Analytics, without your email or name. To stop spam we keep a scrambled form of your IP address for a short window, never the address itself.</>,
  },
  {
    title: 'Style kits',
    body: <>When you download a style kit, we note which site and which month, to count the three free kits a month. That's all.</>,
  },
  {
    title: 'Who handles it',
    body: <>The site runs on Cloudflare. Accounts and the library live in a Neon database. Emails are sent by Resend. Screenshots are stored with Vercel Blob. Google handles Google sign-in. If you buy Pro, Paddle handles the payment as our reseller and keeps your card details; we only learn that you subscribed. None of them may use your data for anything else, and we never sell it.</>,
  },
  {
    title: 'Your control',
    body: <>Signed in, open the account menu to download everything we hold about you. You can delete your account here. Deleting removes your account, saved sites, sets and sessions at once. For anything else, write to <a className="underline underline-offset-2 hover:text-ink" href="mailto:hello@damilare.works">hello@damilare.works</a>.</>,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[640px] mx-auto px-6 h-12 flex items-center justify-between">
          <Brand />
          <span className="text-meta text-ink-4">Privacy</span>
        </div>
      </nav>

      <SiteLinks />

      <main className="max-w-[640px] mx-auto px-6 pt-14 pb-32">
        <div className="mb-14">
          <h1 className="text-display text-foreground mb-2">Privacy</h1>
          <p className="text-bodytext text-ink-3">What we keep about you, why, and how to remove it</p>
        </div>

        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-heading text-foreground mb-2">{s.title}</h2>
              <p className="text-reading text-ink-2">{s.body}</p>
              {s.title === 'Your control' && <DeleteAccount />}
            </section>
          ))}
        </div>

        <p className="mt-16 pt-8 border-t border-edge text-micro text-ink-4">
          Hitman&apos;s Library is run by Oluwadamilare Osofisan. Last updated {UPDATED}.
          {' '}See also the <Link href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link> and <Link href="/refunds" className="underline underline-offset-2 hover:text-ink">Refund policy</Link>.
        </p>
      </main>
    </div>
  )
}
