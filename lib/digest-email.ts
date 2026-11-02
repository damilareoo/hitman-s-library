// lib/digest-email.ts
// The weekly digest email, rendered in the library's own visual system — the
// dark flat surface, ink scale, books mark and palette dots from the site,
// not a borrowed light template. Deliberately import-free so the module can
// be rendered standalone (node scripts/preview-digest-email.mts) outside the
// Next bundle.

export interface DigestSite {
  id: number
  title: string
  kind: string
  thumbnail: string | null
  url: string
  /** First palette colors, strongest first. */
  colors: string[]
}

export const SITE_HOST = 'https://hitmanslibrary.xyz'

// Dark surface tokens, matched to app/globals.css [.dark]. The ink levels are
// --foreground at the same alphas the site uses, composited over --background.
const BG = '#101010'
const CARD = '#151515'
const INK = '#e8e4dc'
const INK_3 = '#a3a09b' // ink at 0.68
const INK_4 = '#8d8b86' // ink at 0.58
const HAIRLINE = '#181818' // --edge-faint (border at 0.3) over BG
const EDGE = '#1e1e1e' // --edge (border at 0.5) over BG
const DOT_EDGE = '#484848' // white at 0.22 over CARD, as on the site cards

// BDO Grotesk cannot load in a mailbox; the system sans is the stand-in.
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif"

function siteUrl(id: number): string {
  return `${SITE_HOST}/?site=${id}`
}

/** Mirrors components/mark.tsx — keep the two in step. */
const BASE = 54
const LEAN = 15
const BOOKS = [
  { x: 9, w: 11, top: 12 },
  { x: 26, w: 11, top: 6 },
  { x: 43, w: 11, top: 10 },
]
const SHELF = { x: 6, w: 52, y: BASE, h: 4 }

function markSvg(size: number, fill: string): string {
  const shelf = `<rect x="${SHELF.x}" y="${SHELF.y}" width="${SHELF.w}" height="${SHELF.h}" rx="${SHELF.h / 2}"/>`
  const books = BOOKS.map((b, i) => {
    const rect = `<rect x="${b.x}" y="${b.top}" width="${b.w}" height="${BASE - b.top}" rx="1.6"/>`
    return i === BOOKS.length - 1
      ? `<g transform="rotate(${LEAN} ${b.x + b.w} ${BASE})">${rect}</g>`
      : rect
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" fill="${fill}">${shelf}${books}</svg>`
}

/** Site names come from extraction output; treat them as data, not markup. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** "Conduit | AI agents…" → "Conduit". Greeting names stay short like
 *  a person would say them; card titles keep their full form. */
function shortName(title: string): string {
  const cut = title.split(/[|—–·:➔-]/)[0].trim()
  return cut || title
}

export function greetingLine(names: string[]): string {
  if (names.length === 1) return `explore new design references from ${names[0]}.`
  if (names.length === 2) return `explore new design references from ${names[0]} and ${names[1]}.`
  names = names.map(shortName)
  if (names.length === 1) return `explore new design references from ${names[0]}.`
  if (names.length === 2) return `explore new design references from ${names[0]} and ${names[1]}.`
  if (names.length === 3) return `explore new design references from ${names[0]}, ${names[1]} and ${names[2]}.`
  return `explore new design references from ${names[0]}, ${names[1]}, ${names[2]} and more.`
}

function dotsRow(colors: string[]): string {
  const upToFive = colors.filter(Boolean).slice(0, 5)
  if (!upToFive.length) return ''
  const cells = upToFive
    .flatMap((c, i) => [
      ...(i ? ['<td width="3"></td>'] : []),
      `<td width="14" height="14" bgcolor="${esc(c)}" style="border-radius:7px;border:1px solid ${DOT_EDGE};font-size:0;line-height:0;">&nbsp;</td>`,
    ])
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

function siteCard(s: DigestSite): string {
  const img = s.thumbnail
    ? `<a href="${siteUrl(s.id)}"><img src="${esc(s.thumbnail)}" alt="" width="552" style="display:block;width:100%;max-width:552px;border-radius:6px;border:1px solid ${HAIRLINE};" /></a>`
    : ''
  const pad = s.thumbnail ? '12px' : '0'
  const textCell = `<td style="vertical-align:middle;padding:${pad} 0 0 0;">
      <p style="margin:0 0 2px 0;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:-0.02em;line-height:1.35;">
        <a href="${siteUrl(s.id)}" style="color:${INK};text-decoration:none;">${esc(s.title)}</a>
      </p>
      <p style="margin:0;font-family:${SANS};font-size:12px;color:${INK_4};"><a href="${esc(s.url)}" style="color:${INK_4};text-decoration:none;">${esc(domainOf(s.url))}</a></p>
    </td>`
  const dots = dotsRow(s.colors)
  const dotsCell = dots
    ? `<td align="right" valign="middle" style="padding:${pad} 0 0 10px;white-space:nowrap;">${dots}</td>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CARD}" style="background-color:${CARD};border:1px solid ${EDGE};border-radius:10px;margin:0 0 12px 0;">
    <tr><td style="padding:12px;">
      ${img}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${textCell}${dotsCell}</tr></table>
    </td></tr>
  </table>`
}

export function digestHtml(
  name: string,
  sites: DigestSite[],
  unsubUrl: string,
): string {
  // Group by kind in first-seen order: "New in AI", "New in Store", …
  const groups: Array<{ kind: string; sites: DigestSite[] }> = []
  for (const s of sites) {
    const g = groups.find(g => g.kind === s.kind)
    if (g) g.sites.push(s)
    else groups.push({ kind: s.kind, sites: [s] })
  }
  const sections = groups
    .map(
      g => `
      <tr><td style="padding:28px 0 12px 0;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${INK_4};">New in ${esc(g.kind)}</td></tr>
      <tr><td>${g.sites.map(siteCard).join('')}</td></tr>`,
    )
    .join('')
  const greeting = `Hi ${esc(name)}, ${esc(greetingLine(sites.map(s => s.title)))}`
  const preheader = `New in ${[...new Set(sites.map(s => s.kind))].slice(0, 3).join(', ')} — picked for your taste.`
  return `<!DOCTYPE html><html><body style="margin:0;background-color:${BG};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG}" style="background-color:${BG};">
      <tr><td align="center" style="padding:40px 20px 36px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding:0 0 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td width="44" style="vertical-align:middle;">${markSvg(36, INK)}</td>
                <td style="vertical-align:middle;padding-left:10px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:-0.01em;color:${INK};">Hitman's Library</td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="padding:0 0 10px 0;font-family:${SANS};font-size:32px;font-weight:600;letter-spacing:-0.03em;line-height:1.05;color:${INK};">Weekly Digest</td></tr>
          <tr><td style="padding:0 0 4px 0;font-family:${SANS};font-size:16px;letter-spacing:-0.005em;line-height:1.55;color:${INK_3};">${greeting}</td></tr>
          ${sections}
          <tr><td style="padding:28px 0 0 0;border-top:1px solid ${HAIRLINE};">
            <p style="margin:16px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${INK_4};">Matched to the sites you favorited. <a href="${esc(unsubUrl)}" style="color:${INK_4};">Unsubscribe</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

export function digestText(name: string, sites: DigestSite[], unsubUrl: string): string {
  const lines = sites.map(s => `- ${s.title} (${s.kind}): ${siteUrl(s.id)}`)
  return `Weekly Digest\n\nHi ${name}, ${greetingLine(sites.map(s => s.title))}\n\n${lines.join('\n')}\n\nMatched to the sites you favorited. Unsubscribe: ${unsubUrl}`
}
