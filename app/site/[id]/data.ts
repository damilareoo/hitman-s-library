// Prototype: card data comes from the live public API, so the local app
// needs no database credentials. One fetch, cached for an hour.
export interface CardSite {
  id: number
  url: string
  title: string | null
  screenshot_url: string | null
  colors: { hex_value: string; area_share: number | null }[]
  typography: { font_family: string; role: string }[]
}

/** The filing the detail route does not carry: what kind of site it is and what it is built with. */
export interface CardFacts {
  kind: string | null
  designStyle: string | null
  architecture: string | null
  layout: string | null
  tags: string[]
  addedDate: string | null
}

const DATA_BASE = process.env.LIBRARY_DATA_URL ?? 'https://hitmanslibrary.xyz'

async function getJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${DATA_BASE}${path}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getCardSite(id: string): Promise<CardSite | null> {
  if (!/^\d+$/.test(id)) return null
  const raw = await getJson(`/api/design/${id}`)
  if (!raw || typeof raw.url !== 'string') return null
  return raw as CardSite
}

export async function getCardFacts(id: string): Promise<CardFacts | null> {
  if (!/^\d+$/.test(id)) return null
  const raw = await getJson(`/api/design/filter-advanced?ids=${id}&limit=1`)
  const row = raw?.designs?.[0]
  if (!row) return null
  return {
    kind: row.kind ?? null,
    designStyle: row.designStyle ?? null,
    architecture: row.architecture ?? null,
    layout: row.layout ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    addedDate: row.addedDate ?? null,
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * The site's own heading face, as a real specimen. Google Fonts hands out TTF
 * (which Satori reads) only to clients that cannot take woff2, so the request
 * is made with an old user agent. Null means the family is not there — a
 * proprietary face like Söhne — and the card then prints the name instead of
 * passing off our own type as someone else's.
 */
export async function loadFace(family: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`,
      { headers: { 'User-Agent': 'Mozilla/4.0' }, next: { revalidate: 86400 } },
    )
    if (!css.ok) return null
    const text = await css.text()
    const url = text.match(/url\((https:[^)]+\.ttf)\)/)?.[1]
    if (!url) return null
    const buf = await fetch(url, { next: { revalidate: 86400 } })
    if (!buf.ok) return null
    return await buf.arrayBuffer()
  } catch {
    return null
  }
}
