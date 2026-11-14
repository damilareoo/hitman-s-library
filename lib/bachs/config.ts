// lib/bachs/config.ts
// Bachs settings. Everything lives in Worker secrets (never in the repo):
//   BACHS_API_KEY         sk_sandbox_… or sk_live_…; the key picks the API
//   BACHS_WEBHOOK_SECRET  the endpoint's whsec_… signing secret
//   BACHS_PRO_MONTHLY     product id for Pro, $5 a month
//   BACHS_PRO_YEARLY      product id for Pro, $48 a year
// Going live is a key swap: scripts/bachs-setup.mjs stores all four.

/** Sandbox and live are separate worlds; a key only works against its own. */
export function bachsApiBase(key: string): string {
  return key.startsWith('sk_live_') ? 'https://api.bachs.io' : 'https://sandbox-api.bachs.io'
}

export function bachsProducts(env: Record<string, string | undefined> = process.env): { month: string; year: string } | null {
  const month = env.BACHS_PRO_MONTHLY, year = env.BACHS_PRO_YEARLY
  return month?.startsWith('prod_') && year?.startsWith('prod_') ? { month, year } : null
}

/** Only Bachs-hosted pages are opened or redirected to. */
export function isBachsCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'bachs.io' || u.hostname.endsWith('.bachs.io'))
  } catch { return false }
}
