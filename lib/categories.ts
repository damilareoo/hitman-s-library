export const CATEGORY_ALIASES: Record<string, string[]> = {  'SaaS / App': ['saas', 'productivity', 'saas / app'],
  Creative: ['creative', 'agency', 'design', 'branding', 'studio', 'design firm'],
  Finance: ['fintech', 'finance'],
  Entertainment: ['entertainment', 'social media'],
  Other: [
    'general',
    'uncategorized',
    'healthcare',
    'health',
    'travel',
    'education',
    'code/bugs',
    'other',
    'c',
  ],
}

const CATEGORY_LABELS = Object.keys(CATEGORY_ALIASES)

/** Display name -> the raw industry values stored in the database. */
export function denormalizeIndustry(name: string): string[] {
  const label = CATEGORY_LABELS.find(category => category.toLowerCase() === name.toLowerCase())
  return label ? CATEGORY_ALIASES[label] : [name.toLowerCase()]
}

/** Raw database industry value -> the display name shown in filters. */
export function normalizeIndustry(raw: string): string {
  const value = (raw || '').trim()
  if (!value) return 'Other'

  const lower = value.toLowerCase()
  for (const [label, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(lower)) return label
  }

  if (/^e-commerce$/i.test(value)) return 'E-commerce'
  if (/^marketing$/i.test(value)) return 'Marketing'
  if (/^portfolio$/i.test(value)) return 'Portfolio'
  if (/^ai$/i.test(value)) return 'AI'
  if (/^code[\s/]+bugs$/i.test(value)) return 'Other'
  if (/^[a-z]$/i.test(value)) return 'Other'

  return value.charAt(0).toUpperCase() + value.slice(1)
}

const CATEGORY_PRIORITY = [
  'SaaS / App',
  'Creative',
  'Portfolio',
  'Finance',
  'E-commerce',
  'AI',
  'Entertainment',
  'Marketing',
]

export function compareCategories(a: { name: string; count: number }, b: { name: string; count: number }) {
  if (a.name === 'Other' && b.name !== 'Other') return 1
  if (b.name === 'Other' && a.name !== 'Other') return -1

  const aIndex = CATEGORY_PRIORITY.indexOf(a.name)
  const bIndex = CATEGORY_PRIORITY.indexOf(b.name)
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  }

  return b.count - a.count
}

/**
 * What kind of site it is — the axis the library is browsed on. Lives here
 * (client-safe, no imports) because cards and the sidebar read it too; the
 * server queries re-export it from lib/design-queries.
 */
export const KINDS = [
  'AI', 'Developer', 'Work', 'Money', 'Consumer',
  'Studio', 'Editorial', 'Company', 'Portfolio', 'Store', 'Venue', 'Event',
] as const
export type Kind = (typeof KINDS)[number]

/**
 * Not a kind — where a newly added site waits until someone files it. Never
 * rendered on a card; the sidebar shows NEW_LABEL instead while the URL value
 * stays 'Unsorted' so shared links keep working.
 */
export const UNSORTED = 'Unsorted'
export const NEW_LABEL = 'New'

/** Display name for a kind value in visitor-facing UI. */
export function displayKind(kind: string): string {
  return kind === UNSORTED ? NEW_LABEL : kind
}
