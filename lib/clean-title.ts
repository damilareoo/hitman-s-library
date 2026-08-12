// lib/clean-title.ts
// Titles are scraped straight from each site's <title> tag, so they arrive with
// HTML entities intact and usually a trailing brand suffix that just repeats the
// domain already shown underneath ("Crezco: Embedded Payments API - Crezco").

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  middot: '·',
  bull: '•',
  trade: '™',
  reg: '®',
  copy: '©',
  deg: '°',
  euro: '€',
  pound: '£',
  yen: '¥',
  laquo: '«',
  raquo: '»',
  // Latin-1 letters that turn up in European site titles
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å',
  aelig: 'æ', ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  yacute: 'ý', yuml: 'ÿ', szlig: 'ß',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å',
  AElig: 'Æ', Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë',
  Ntilde: 'Ñ',
  Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', Oslash: 'Ø',
  Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü',
}

/** Decodes named and numeric HTML entities. Runs twice to catch double-encoding (&amp;amp;). */
export function decodeEntities(input: string): string {
  const once = (s: string) =>
    s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
      if (body[0] === '#') {
        const code = body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10)
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match
      }
      // Exact first — entity names are case-sensitive (&Ouml; vs &ouml;).
      return ENTITIES[body] ?? ENTITIES[body.toLowerCase()] ?? match
    })

  return once(once(input))
}

/** "www.eathungrytiger.com" → "eathungrytiger" */
function brandFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.split('.')[0].toLowerCase()
  } catch {
    return ''
  }
}

/** Loose match so "REF" matches "ref.digital" and "Hungry Tiger" matches "eathungrytiger". */
function isBrandEcho(segment: string, brand: string): boolean {
  if (!brand) return false
  const normalized = segment.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!normalized) return false
  return normalized === brand || brand.includes(normalized) || normalized.includes(brand)
}

const SEPARATORS = /\s+[|·–—]\s+|\s+-\s+/

/**
 * Decodes entities and drops a trailing brand segment that only repeats the
 * domain shown beneath the title. Never returns an empty string.
 */
export function cleanTitle(rawTitle: string | null | undefined, url: string = ''): string {
  const decoded = decodeEntities(String(rawTitle ?? '')).replace(/\s+/g, ' ').trim()
  if (!decoded) return brandFromUrl(url) || 'Untitled'

  const brand = brandFromUrl(url)
  const parts = decoded.split(SEPARATORS).map(p => p.trim()).filter(Boolean)

  // Only trim when what remains still describes the page. "Game — Hungry Tiger"
  // keeps its suffix, because a bare "Game" tells the reader nothing.
  if (parts.length > 1 && isBrandEcho(parts[parts.length - 1], brand)) {
    const remaining = parts.slice(0, -1).join(' — ').trim()
    if (remaining.length >= 8) return remaining
  }

  return decoded
}
