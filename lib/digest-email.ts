// lib/digest-email.ts
// The weekly digest email, built from the gallery's own parts: the mark row
// with a date, one featured pick large at the top, and the rest in a two-up
// grid of the site's own cards — whisper border, 16:10 capture, palette row
// with its kind line — all on the gallery's white paper. Deliberately
// import-free so the module can be rendered standalone
// (node scripts/preview-digest-email.mts) outside the Next bundle.
// The masthead mark is public/mark.png, baked from components/mark.tsx —
// Gmail and most mailboxes strip inline <svg>.

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

// Light surface tokens, matched to app/globals.css :root. The ink levels are
// --foreground at the same alphas the site uses, composited over --background;
// the card edge is --border at 0.5 (--edge) over white, as on the site.
const BG = '#ffffff'
const INK = '#111111'
const INK_3 = '#5d5d5b' // ink at 0.68
const INK_4 = '#757573' // ink at 0.58
const EDGE = '#f0f0ee' // --edge: border at 0.5 over white
const MUTED = '#efefec' // the capture's backing while it loads
const DOT_EDGE = '#e6e6e2' // the site's black/0.06 ring, nudged visible for mail

// BDO Grotesk cannot load in a mailbox; the system sans is the stand-in.
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif"

function siteUrl(id: number): string {
  return `${SITE_HOST}/?site=${id}`
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

/** The site's swatch row: w-4 h-4 dots (16px), 3px apart, ringed in black at
 *  0.06 — the same ring the grid cards wear. */
function dotsRow(colors: string[], size = 16): string {
  const upToFive = colors.filter(Boolean).slice(0, 5)
  if (!upToFive.length) return ''
  const cells = upToFive
    .flatMap((c, i) => [
      ...(i ? ['<td width="3"></td>'] : []),
      `<td width="${size}" height="${size}" bgcolor="${esc(c)}" style="border-radius:${size / 2}px;border:1px solid ${DOT_EDGE};font-size:0;line-height:0;">&nbsp;</td>`,
    ])
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

function kindCell(kind: string): string {
  return kind
    ? `<td align="right" valign="middle" style="white-space:nowrap;padding-left:8px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${INK_4};">${esc(kind)}</td>`
    : ''
}

function capture(s: DigestSite, w: number, h: number, radius: string): string {
  return s.thumbnail
    ? `<tr><td style="padding:0;background-color:${MUTED};"><a href="${siteUrl(s.id)}"><img src="${esc(s.thumbnail)}" alt="" width="${w}" height="${h}" style="display:block;width:100%;height:auto;border-radius:${radius};border:0;" /></a></td></tr>`
    : ''
}

function metaBlock(s: DigestSite, titleSize: number, padding: string, dotsSize = 16): string {
  return `<tr><td style="padding:${padding};">
    <p style="margin:0;font-family:${SANS};font-size:${titleSize}px;font-weight:500;letter-spacing:-0.01em;line-height:1.35;color:${INK};">
      <a href="${siteUrl(s.id)}" style="color:${INK};text-decoration:none;">${esc(s.title)}</a>
    </p>
    <p style="margin:2px 0 8px 0;font-family:${SANS};font-size:12px;line-height:1.4;"><a href="${esc(s.url)}" style="color:${INK_4};text-decoration:none;">${esc(domainOf(s.url))}</a></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" valign="middle">${dotsRow(s.colors, dotsSize)}</td>
      ${kindCell(s.kind)}
    </tr></table>
  </td></tr>`
}

/** The featured pick: the full-width grid card, title set one step up. */
function heroCard(s: DigestSite): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid ${EDGE};border-radius:4px;background-color:${BG};">
    ${capture(s, 552, 345, '3px 3px 0 0')}
    ${metaBlock(s, 16, '10px 14px 12px 14px')}
  </table>`
}

/** One cell of the two-up grid: the same card at half width. */
function gridCell(s: DigestSite): string {
  return `<td width="50%" valign="top" style="padding:0 6px 16px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${EDGE};border-radius:4px;background-color:${BG};">
      ${capture(s, 270, 169, '3px 3px 0 0')}
      ${metaBlock(s, 13, '8px 10px 10px 10px')}
    </table>
  </td>`
}

export function digestHtml(
  name: string,
  sites: DigestSite[],
  unsubUrl: string,
): string {
  const [hero, ...rest] = sites
  const gridRows: string[] = []
  for (let i = 0; i < rest.length; i += 2) {
    gridRows.push(`<tr>${gridCell(rest[i])}${rest[i + 1] ? gridCell(rest[i + 1]) : ''}</tr>`)
  }
  const date = new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  const greeting = `Hi ${esc(name)} — ${esc(greetingLine(sites.map(s => s.title)))}`
  const preheader = `New in ${[...new Set(sites.map(s => s.kind))].slice(0, 3).join(', ')} — picked for your taste.`
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;background-color:${BG};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG}" style="background-color:${BG};">
      <tr><td align="center" style="padding:36px 20px 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr><td style="padding:0 0 26px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="left" valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td width="32" style="vertical-align:middle;"><img src="${SITE_HOST}/mark.png" width="24" height="24" alt="" style="display:block;border:0;" /></td>
                  <td style="vertical-align:middle;padding-left:10px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.12em;color:${INK};">HITMAN'S LIBRARY</td>
                </tr></table>
              </td>
              <td align="right" valign="middle" style="font-family:${SANS};font-size:12px;letter-spacing:0.08em;color:${INK_4};">${date}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:0 0 8px 0;font-family:${SANS};font-size:34px;font-weight:600;letter-spacing:-0.03em;line-height:1.05;color:${INK};">Weekly Digest</td></tr>
          <tr><td style="padding:0 0 22px 0;font-family:${SANS};font-size:14px;letter-spacing:-0.01em;line-height:1.6;color:${INK_3};">${greeting}</td></tr>
          <tr><td>${hero ? heroCard(hero) : ''}</td></tr>
          ${gridRows.length ? `<tr><td style="padding:0 0 6px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${gridRows.join('')}</table></td></tr>` : ''}
          <tr><td style="padding:8px 0 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="padding:0 12px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${INK_4};">Matched to the sites you favorited.</td>
              <td align="right" style="font-family:${SANS};font-size:12px;line-height:1.6;white-space:nowrap;"><a href="${esc(unsubUrl)}" style="color:${INK_4};">Unsubscribe</a></td>
            </tr></table>
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
