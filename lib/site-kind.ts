// lib/site-kind.ts
// Files a site into exactly one kind at the moment it is added. The kind is the
// axis the library is browsed on, so a null here is a site nobody can find —
// every insert must leave with a value, and the admin can override any guess.
//
// Signals are the things extraction already produced: the URL, the page title,
// the meta description, the font families, and the cleaned tags. Nothing
// fetches the page again, so this is cheap enough to run inside the insert.
// When the signals are thin the classifier falls back to Company — the plain
// business site is the least-wrong bucket — and the admin's inline editor is
// the correction path. It never returns 'Unsorted'.
import { KINDS, type Kind } from './categories'

export interface KindInput {
  url: string
  title?: string | null
  description?: string | null
  fontFamilies?: string[]
  tags?: string[]
}

type Field = 'url' | 'title' | 'description'

interface Rule {
  kind: Kind
  pattern: RegExp
  weight: number
  fields?: Field[]
}

const FIELD_WEIGHT: Record<Field, number> = {
  url: 1.3,
  title: 1.2,
  description: 0.7,
}

// Ties are broken by how specific the label is: a conference page that also
// says "design studio" is an Event; a portfolio that mentions "shop" as a nav
// word is still a portfolio.
const PRIORITY: Kind[] = [
  'Event',
  'Venue',
  'Store',
  'Money',
  'Studio',
  'Developer',
  'Portfolio',
  'AI',
  'Editorial',
  'Consumer',
  'Work',
  'Company',
]

const RULES: Rule[] = [
  // Event — dates, tickets, and gathering words.
  { kind: 'Event', weight: 3, pattern: /\b(conference|festival|summit|expo|symposium|meetup|hackathon|degree show|examensutställning|exhibition|biennale|tickets?|speakers?|agenda|register now)\b/i },
  { kind: 'Event', weight: 2, pattern: /\b(20(2[4-9]|3[0-9]))\b/ },

  // Venue — places with a door and a menu.
  { kind: 'Venue', weight: 3, pattern: /\b(restaurant|ristorante|caf[eé]|bakery|coffee|bar|pub|hotel|resort|cabins?|hostel|spa|salon|clinic|dental|counseling|therapy|childcare|early learning|museum|winery|distillery|kitchen|dine|dining)\b/i },
  { kind: 'Venue', weight: 2, pattern: /\b(menu|book a table|reservations?|our rooms|stay with us|tasting|brunch|lunch|dinner|salad|pizza|sushi|street food)\b/i },

  // Store — a shop.
  { kind: 'Store', weight: 3, pattern: /\b(shop|store|cart|checkout|shopify|woocommerce|add to cart|buy now|order online|free shipping)\b/i },
  { kind: 'Store', weight: 2, pattern: /\b(collection|collections|apparel|clothing|outerwear|bags|accessories|furniture|furnishings|homeware|home decor|stationery|journals?|serums?|skincare|fragrance|typeface|typefaces|fonts?|foundry|honey|hot sauce|candy|chocolate|foods?)\b/i },

  // Money — where money is the product.
  { kind: 'Money', weight: 3, pattern: /\b(bank(ing)?|fintech|payments?|payroll|invoicing|accounting|invest(ing|ment)?s?|trading|crypto|stablecoin|bitcoin|ethereum|defi|wallet|treasury|savings|insurance|tax|mortgage|loans?|credit cards?|wealth|fundraising|fp&a|cash)\b/i },
  { kind: 'Money', weight: 2, pattern: /\b(financial|finance|revenue|billing|subscription|capital|funds?)\b/i },

  // Studio — a design practice, not a single designer.
  { kind: 'Studio', weight: 3, pattern: /\b(studio|agency|design firm|design company|design consultancy|design office|branding|brand identity|art direction|creative direction|web design|packaging|motion design|design practice|collective)\b/i },
  { kind: 'Studio', weight: 2, pattern: /\b(creative|design|identity|visual)\b/i },

  // Portfolio — one person's work.
  { kind: 'Portfolio', weight: 3, pattern: /\b(portfolio|freelance|my work|work by|selected works?|case stud(y|ies)|about me|i design|i build|illustrator|photographer|designer|artist|architect|creative director|builder|maker)\b/i },
  { kind: 'Portfolio', weight: 2, pattern: /\b(works|projects|practice|cv|résumé|resume)\b/i },
  { kind: 'Portfolio', weight: 2, pattern: /^me\b/i, fields: ['title'] },

  // Developer — tools for people who write code.
  { kind: 'Developer', weight: 3, pattern: /\b(sdk|api|apis|developer tools?|developer platform|devops|cli|terminal|open source|open-source|openapi|webhooks?|self-hosted|compiler|runtime|kubernetes|docker|git|website builder|site builder|no-code|low-code)\b/i },
  { kind: 'Developer', weight: 2, pattern: /\b(developers?|serverless|database|postgres|mysql|redis|hosting|deploy|deployment|infrastructure|observability|logs|latency|codebase|framework|typescript|javascript|python|rust|golang|graphql|cloud)\b/i },
  { kind: 'Developer', weight: 1, pattern: /\b(documentation|docs?)\b/i },

  // AI — model-first products.
  { kind: 'AI', weight: 3, pattern: /\b(artificial intelligence|machine learning|deep learning|generative|chatbot|ai agents?|agents?|ai copilots?|copilot|llms?|gpt|foundation model|neural network)\b/i },
  { kind: 'AI', weight: 2, pattern: /(^|[^a-z])ai([^a-z]|$)/i, fields: ['title', 'description'] },
  { kind: 'AI', weight: 2, pattern: /\b(ai|ml)\b/i, fields: ['url'] },
  { kind: 'AI', weight: 1, pattern: /\b(models?|inference|prompts?|embeddings?|training data|fine-?tun)\b/i },

  // Editorial — a publication or a curated index.
  { kind: 'Editorial', weight: 3, pattern: /\b(magazine|journal|blog|news|publication|editorial|press|articles?|issue \d|stories|inspiration|gallery)\b/i },
  { kind: 'Editorial', weight: 2, pattern: /\b(lookbook|awards?|best practices|guidelines|index|archive|library|curated|collection of|the index)\b/i },

  // Consumer — an app for a person, not a team.
  { kind: 'Consumer', weight: 3, pattern: /\b(game|games|voice|dictation|camera|photo|cooking|recipes?|fitness|workout|habit|meditation|dating|travel|kids|robots?|playground)\b/i },
  { kind: 'Consumer', weight: 2, pattern: /\b(browser|app|personal|everyday|your shortcut|for your|on your (phone|desktop))\b/i },
  { kind: 'Consumer', weight: 1, pattern: /\b(download|computer)\b/i },

  // Work — software a team runs its day on.
  { kind: 'Work', weight: 3, pattern: /\b(crm|workspace|productivity|project management|product development|issue tracking|roadmap|task management|notes?|docs|email|inbox|calendars?|collaboration|workflows?|compliance|recruiting|hiring|user research|testing platform|customer success|product copy|creative operations)\b/i },
  { kind: 'Work', weight: 2, pattern: /\b(platform|analytics|operations|teams?|founders?|enterprise|saas|dashboard|automation|asset management|sales enablement)\b/i },

  // Company — the organisation itself.
  { kind: 'Company', weight: 4, pattern: /\b(law firm|attorneys?|legal advisory|advisory firm)\b/i },
  { kind: 'Company', weight: 3, pattern: /\b(company|corporate|about us|our story|who we are|careers|law|legal|advisers?|advisors?|advisory|holdings|partners|ventures|capital advisers)\b/i },
  { kind: 'Company', weight: 3, pattern: /\b(recruitment|consultancy)\b/i },
  { kind: 'Company', weight: 2, pattern: /\b(group|inc|ltd|llc|co\.|labs?|solutions|systems|robotics)\b/i },
]

const SERIF_FONT = /serif|garamond|georgia|times|playfair|merriweather|lora|bodoni|didot|caslon|baskerville|slab|charter|cormorant|fraunces/i
const MONO_FONT = /mono|code|console|terminal|menlo|consolas|courier/i

// A business noun anywhere in the title means the words are a company name,
// not a person's. Kept wider than the keyword rules because false person
// matches are the ones that mis-file whole portfolios as companies and back.
const BUSINESS_WORDS = /\b(company|studio|agency|capital|advisers?|advisors?|group|inc|labs?|works|design|portfolio|projects|the|and|co|shop|store|bank|law|legal|partners|consulting|consultancy|technolog(y|ies)|systems|solutions|club|world|supply|supplies|products?|brands?|network|media|press|gallery|society|carriers?|optical|global|united|business|home|honey|candy|furnishings|industries|fashion|digital|holdings|ventures|motor|motors|foods?|health|healthcare|care)\b/i

function fieldText(input: KindInput, field: Field): string {
  if (field === 'url') {
    try {
      const u = new URL(input.url)
      return `${u.hostname} ${u.pathname}`.replace(/[-_./]/g, ' ')
    } catch {
      return input.url
    }
  }
  if (field === 'title') return input.title ?? ''
  return input.description ?? ''
}

/** A lone human name — the shape most one-person portfolios have. */
function looksLikePersonName(title: string | null | undefined): boolean {
  if (!title) return false
  const cleaned = title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[|—–].*$/, ' ')
    .replace(/[™®©]/g, ' ')
    .trim()
  if (!cleaned) return false
  if (/^[a-z]+['’]s (website|site|portfolio|work)$/i.test(cleaned)) return true
  const words = cleaned.split(/\s+/)
  if (words.length < 2 || words.length > 3) return false
  if (BUSINESS_WORDS.test(cleaned)) return false
  return words.every(w => /^[A-Z][a-z'’-]{1,}$/.test(w) || /^[A-Z][A-Z'’-]{1,}$/.test(w))
}

/**
 * Files one site. Deterministic for the same input, so a backfill re-runs to
 * the same answer it filed the first time.
 */
export function inferKind(input: KindInput): Kind {
  const scores = new Map<Kind, number>()
  const add = (kind: Kind, n: number) => scores.set(kind, (scores.get(kind) ?? 0) + n)

  for (const rule of RULES) {
    const fields: Field[] = rule.fields ?? ['url', 'title', 'description']
    for (const field of fields) {
      const text = fieldText(input, field)
      if (!text) continue
      if (rule.pattern.test(text)) {
        add(rule.kind, rule.weight * FIELD_WEIGHT[field])
        break // The same rule does not stack across fields.
      }
    }
  }

  // Typographic character is a weak but honest signal.
  const families = (input.fontFamilies ?? []).filter(Boolean)
  if (families.some(f => MONO_FONT.test(f))) add('Developer', 1)
  if (families.some(f => SERIF_FONT.test(f))) add('Editorial', 0.5)

  if (looksLikePersonName(input.title)) add('Portfolio', 2.4)

  // A TLD is a declaration, not a hint. The host words `.ai` and `.studio`
  // already score through the URL field, so they are not counted twice here.
  try {
    const host = new URL(input.url).hostname.replace(/^www\./, '')
    if (/\.design$/.test(host)) add('Portfolio', 2.6)
    if (/\.cash$/.test(host)) add('Money', 3)
    if (/\.dev$/.test(host)) add('Developer', 2.6)
    if (/\.sh$/.test(host)) add('Portfolio', 1.2)
    if (/\.music$/.test(host)) add('Portfolio', 2.2)
    if (/\.gallery$/.test(host)) add('Editorial', 2)
    // Type foundries sell licences; hosts name them after the product.
    const label = host.split('.')[0]
    if (/^(type(folder|shop|library|foundry|faces?|directory|specimen)|font(s|shop|foundry)|typeshop)/.test(label)) add('Store', 2.6)
  } catch { /* not a URL — nothing to read */ }

  let best: Kind | null = null
  let bestScore = 0
  for (const kind of PRIORITY) {
    const score = scores.get(kind) ?? 0
    if (score > bestScore) {
      best = kind
      bestScore = score
    }
  }

  // Thin signals: a plain site is a company site more often than anything else,
  // and the admin can re-file it in one click.
  if (!best || bestScore < 2) return 'Company'
  return best
}

/** For callers that only need the vocabulary. */
export const KIND_OPTIONS: readonly Kind[] = KINDS
