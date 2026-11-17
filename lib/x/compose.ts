// lib/x/compose.ts
// The daily post for @hitmanslibrary, written from stored rows with plain
// templates: no model, so nothing it says can be made up. Every number, hex
// and typeface comes from the library itself. Pure functions; the cron route
// feeds them rows and sends the result.
//
// The week has a shape: a site added in the last two days always goes first;
// otherwise the day picks the format.
//   Sun  week     how many sites arrived this week
//   Mon, Wed, Fri  palette   one site's colours, as hex
//   Tue, Thu, Sat  type      what typefaces one site uses

export type PostKind = 'new' | 'palette' | 'type' | 'week'

export interface Candidate {
  id: number
  name: string
  slug: string
  addedAt: string
  colors: { role: string; hex: string }[]
  fonts: { role: string; family: string }[]
  /** When this site was last featured, if ever. */
  lastPostedAt: string | null
}

export interface Post { kind: PostKind; sourceId: number | null; text: string }

const HOME = 'hitmanslibrary.xyz'
const link = (c: Candidate) => `https://${HOME}/site/${c.slug}`
/** X counts every link as 23 characters, whatever its length. */
const LINK_WEIGHT = 23
const MAX = 280
const DAY = 864e5

/** "suisseIntl" → "Suisse Intl", "moderatSerif" → "Moderat Serif", "GT-America" stays. */
export function prettyFont(family: string): string {
  const spaced = family.replace(/[_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
    // Some sites name the face "fontSeasonSans" in CSS; the face is Season Sans.
    .replace(/^font\s+(?=\S+\s+\S)/i, '')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function weightedLength(text: string): number {
  return text.replace(/https?:\/\/\S+/g, 'x'.repeat(LINK_WEIGHT)).length
}

const families = (c: Candidate) => [...new Set(c.fonts.map(f => prettyFont(f.family)))]
const hexes = (c: Candidate) => [...new Set(c.colors.map(x => x.hex))]
const byRole = (c: Candidate, r: string) => c.colors.find(x => x.role === r)?.hex

function newPost(c: Candidate): string {
  const lines = [`New in the library: ${c.name}.`]
  const roles = (['background', 'text', 'accent'] as const).map(r => [r, byRole(c, r)] as const).filter(([, h]) => h)
  if (roles.length) lines.push(roles.map(([r, h]) => `${r} ${h}`).join(', ').replace(/^./, s => s.toUpperCase()) + '.')
  const f = families(c)
  if (f.length) lines.push(`Set in ${f.slice(0, 2).join(' and ')}.`)
  lines.push('', link(c))
  return lines.join('\n')
}

function palettePost(c: Candidate): string {
  return [
    `${c.name}'s palette, measured from the live site:`,
    '',
    hexes(c).slice(0, 6).join('  '),
    '',
    `Copy it as CSS, Tailwind or tokens: ${link(c)}`,
  ].join('\n')
}

function typePost(c: Candidate): string {
  const order = ['heading', 'body', 'mono']
  const seen = new Set<string>()
  const rows = [...c.fonts]
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
    .filter(f => { const k = prettyFont(f.family); if (seen.has(k)) return false; seen.add(k); return true })
    .slice(0, 3)
    .map(f => `${f.role.charAt(0).toUpperCase() + f.role.slice(1)}: ${prettyFont(f.family)}`)
  return [`What fonts does ${c.name} use?`, '', ...rows, '', link(c)].join('\n')
}

function weekPost(count: number): string {
  return [
    `${count} ${count === 1 ? 'site' : 'sites'} joined the library this week, each with its colours and type measured.`,
    '',
    `Free to browse: https://${HOME}`,
  ].join('\n')
}

/** Least recently featured first; never-featured before anything; ties by id
 *  rotated by the date, so the pick changes day to day but is repeatable. */
function pick(pool: Candidate[], now: Date): Candidate | null {
  if (!pool.length) return null
  const dayN = Math.floor(now.getTime() / DAY)
  const rank = (c: Candidate) => (c.lastPostedAt ? new Date(c.lastPostedAt).getTime() : 0)
  const oldest = Math.min(...pool.map(rank))
  const tier = pool.filter(c => rank(c) === oldest).sort((a, b) => a.id - b.id)
  return tier[dayN % tier.length]
}

/** No site is featured again within this many days. */
export const COOLDOWN_DAYS = 60

export function composeDailyPost(cands: Candidate[], now: Date): Post | null {
  const fresh = (c: Candidate) => !c.lastPostedAt || now.getTime() - new Date(c.lastPostedAt).getTime() > COOLDOWN_DAYS * DAY

  // 1. Anything added in the last two days and not yet posted.
  const arrivals = cands
    .filter(c => !c.lastPostedAt && now.getTime() - new Date(c.addedAt).getTime() < 2 * DAY && c.colors.length >= 2)
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
  if (arrivals[0]) return finish({ kind: 'new', sourceId: arrivals[0].id, text: newPost(arrivals[0]) })

  const day = now.getUTCDay()
  if (day === 0) {
    const count = cands.filter(c => now.getTime() - new Date(c.addedAt).getTime() < 7 * DAY).length
    if (count >= 3) return finish({ kind: 'week', sourceId: null, text: weekPost(count) })
  }

  const wantsType = day === 2 || day === 4 || day === 6
  const typePool = cands.filter(c => fresh(c) && families(c).length >= 2)
  const palettePool = cands.filter(c => fresh(c) && hexes(c).length >= 4)
  const first = wantsType ? pick(typePool, now) : pick(palettePool, now)
  const c = first ?? (wantsType ? pick(palettePool, now) : pick(typePool, now))
  if (!c) return null
  const kind: PostKind = first ? (wantsType ? 'type' : 'palette') : (wantsType ? 'palette' : 'type')
  return finish({ kind, sourceId: c.id, text: kind === 'type' ? typePost(c) : palettePost(c) })
}

function finish(p: Post): Post | null {
  return weightedLength(p.text) <= MAX ? p : null
}
