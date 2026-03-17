// Auto-detect design-context category from extracted design data
const DESIGN_CONTEXT: Array<[string, string[]]> = [
  ['Agency',        ['agency', 'studio', 'creative', 'branding', 'production house', 'design firm']],
  ['Portfolio',     ['portfolio', 'freelance', 'case study', 'my work', 'about me', 'i design', 'i build']],
  ['E-commerce',   ['shop', 'store', 'cart', 'checkout', 'shopify', 'woocommerce']],
  ['Finance',       ['bank', 'fintech', 'payment', 'crypto', 'invest', 'trading', 'wallet', 'revolut', 'stripe', 'paypal']],
  ['SaaS / App',   ['dashboard', 'platform', 'workspace', 'analytics', 'saas', 'software as a service']],
  ['Marketing',     ['pricing', 'get started', 'sign up free', 'free trial', 'launch']],
  ['Editorial',     ['blog', 'news', 'magazine', 'article', 'publication', 'journal']],
  ['Entertainment', ['stream', 'gaming', 'music', 'video', 'entertainment', 'watch', 'play']],
]

export function detectIndustry(title: string, url: string, metadata: { description?: string; [key: string]: unknown }): string {
  const signals = [title, url, metadata.description ?? ''].join(' ').toLowerCase()

  for (const [category, keywords] of DESIGN_CONTEXT) {
    if (keywords.some(kw => signals.includes(kw))) {
      return category
    }
  }

  return 'Other'
}
