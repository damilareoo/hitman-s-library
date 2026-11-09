// lib/digest-email.ts
// The weekly digest email. Built from the gallery's own parts — the mark, the
// 16:10 capture, the palette dots with their kind line — arranged the way
// top directory emails arrange theirs (Mobbin): an editorial headline with a
// "featuring" line, two featured picks framed in browser chrome on the muted
// card, the rest as quiet index rows, an "Open the library" pill, and a real
// sign-off. Deliberately import-free so the module can be rendered standalone
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
const MUTED = '#efefec' // --muted: the featured card's surface
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

/** The site's favicon, fetched the way /api/request/preview does — Google's
 *  s2 service renders the real favicon (and a globe when the site has none),
 *  which mailboxes proxy like any other remote image. */
function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${domainOf(url)}&sz=64`
}

/** "Conduit | AI agents…" → "Conduit". Short names keep the "featuring"
 *  line readable; card titles keep their full form. */
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

/** "Featuring Analogue aF, mimosa, Alex Carpenter and more." — Mobbin's
 *  sub-headline, with the library's own clean names. */
function featuring(names: string[]): string {
  const n = names.map(shortName)
  if (n.length === 1) return `featuring ${n[0]}.`
  if (n.length === 2) return `featuring ${n[0]} and ${n[1]}.`
  if (n.length === 3) return `featuring ${n[0]}, ${n[1]} and ${n[2]}.`
  return `featuring ${n[0]}, ${n[1]}, ${n[2]} and more.`
}

/** The same line in HTML, with each featured name an ink link to its page. */
function featuringLinks(sites: DigestSite[]): string {
  const link = (s: DigestSite) =>
    `<a href="${siteUrl(s.id)}" style="color:${INK};text-decoration:none;">${esc(shortName(s.title))}</a>`
  const n = sites.map(link)
  if (n.length === 1) return `featuring ${n[0]}.`
  if (n.length === 2) return `featuring ${n[0]} and ${n[1]}.`
  if (n.length === 3) return `featuring ${n[0]}, ${n[1]} and ${n[2]}.`
  return `featuring ${n[0]}, ${n[1]}, ${n[2]} and more.`
}

/** "#aabbcc" → "rgba(170,187,204,0.12)" — for the palette wash. */
function rgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return `rgba(17,17,17,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** The featured card's wash: the site's first three palette colors fading
 *  diagonally out of the muted card, the way Mobbin washes its features.
 *  Outlook ignores the gradient and keeps the muted fallback. */
function paletteWash(colors: string[]): string {
  const c = colors.filter(Boolean).slice(0, 3)
  if (!c.length) return ''
  return `background-image:linear-gradient(135deg, ${rgba(c[0] ?? '#111111', 0.22)}, ${rgba(c[1] ?? c[0] ?? '#111111', 0.14)} 50%, ${rgba(c[2] ?? c[0] ?? '#111111', 0.07)} 100%);`
}

/** The site's swatch row: w-4 h-4 dots (16px), 3px apart, ringed in black at
 *  0.06 — the same ring the grid cards wear. */
function dotsRow(colors: string[], size = 16, max = 5): string {
  const upTo = colors.filter(Boolean).slice(0, max)
  if (!upTo.length) return ''
  const cells = upTo
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

/** The browser bar that frames a featured capture. The traffic dots take the
 *  site's own palette; a greyless site falls back to quiet grey. */
function chromeBar(s: DigestSite): string {
  const dots = s.colors.filter(Boolean).slice(0, 3)
  while (dots.length < 3) dots.push('#e0e0dc')
  const dotCells = dots
    .flatMap((c, i) => [
      ...(i ? ['<td width="5"></td>'] : []),
      `<td width="8" height="8" bgcolor="${esc(c)}" style="border-radius:4px;border:1px solid ${DOT_EDGE};font-size:0;line-height:0;">&nbsp;</td>`,
    ])
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG}" style="background-color:${BG};border-radius:3px;"><tr>
    <td width="46" style="padding:7px 0 7px 10px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${dotCells}</tr></table></td>
    <td align="center" style="padding:6px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" bgcolor="${MUTED}" style="background-color:${MUTED};border-radius:999px;"><tr>
        <td style="padding:3px 12px;font-family:${SANS};font-size:11px;letter-spacing:0.02em;color:${INK_4};white-space:nowrap;">${esc(domainOf(s.url))}</td>
      </tr></table>
    </td>
    <td width="46" style="font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>`
}

/** A featured pick: the capture framed in browser chrome on a palette-washed
 *  muted card, with the title panel docked over the capture's bottom edge —
 *  the composition Mobbin's feature cards use. The domain lives in the
 *  address bar, so the panel keeps only title, dots and kind. */
function featuredCard(s: DigestSite): string {
  const capture = s.thumbnail
    ? `<a href="${siteUrl(s.id)}"><img src="${esc(s.thumbnail)}" alt="" width="552" height="345" style="display:block;width:100%;height:auto;border-radius:3px;border:0;background-color:${MUTED};" /></a>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${MUTED}" style="background-color:${MUTED};${paletteWash(s.colors)}border-radius:4px;margin:0 0 16px 0;">
    <tr><td style="padding:14px 14px 0 14px;">
      ${chromeBar(s)}
      ${capture ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0 0 0;">${capture}</td></tr></table>` : ''}
    </td></tr>
    <tr><td style="padding:0 14px 14px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG}" style="background-color:${BG};border:1px solid ${EDGE};border-radius:4px;margin-top:-24px;"><tr><td style="padding:10px 14px 12px 14px;">
        <p style="margin:0;font-family:${SANS};font-size:18px;font-weight:600;letter-spacing:-0.01em;line-height:1.3;color:${INK};">
          <a href="${siteUrl(s.id)}" style="color:${INK};text-decoration:none;">${esc(s.title)}</a>
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0 0;"><tr>
          <td align="left" valign="middle">${dotsRow(s.colors)}</td>
          ${kindCell(s.kind)}
        </tr></table>
      </td></tr></table>
    </td></tr>
  </table>`
}

/** One index row for the rest: the site's favicon in a small card chip, title
 *  and domain, kind right, hairline between rows — the gallery's own Index
 *  view, with the icon a mailbox can always load. */
function indexRow(s: DigestSite): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${EDGE};">
    <tr>
      <td width="72" valign="middle" style="padding:13px 12px 13px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#f7f7f5" style="background-color:#f7f7f5;border:1px solid ${DOT_EDGE};border-radius:4px;"><tr>
          <td style="padding:5px;font-size:0;line-height:0;"><img src="${faviconUrl(s.url)}" width="16" height="16" alt="" style="display:block;width:16px;height:16px;border:0;border-radius:2px;" /></td>
        </tr></table>
      </td>
      <td valign="middle" style="padding:13px 0;">
        <p style="margin:0;font-family:${SANS};font-size:14px;font-weight:500;letter-spacing:-0.01em;line-height:1.35;color:${INK};">
          <a href="${siteUrl(s.id)}" style="color:${INK};text-decoration:none;">${esc(s.title)}</a>
        </p>
        <p style="margin:2px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.4;"><a href="${esc(s.url)}" style="color:${INK_4};text-decoration:none;">${esc(domainOf(s.url))}</a></p>
      </td>
      <td align="right" valign="middle" style="padding:13px 0 13px 8px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${INK_4};white-space:nowrap;">${esc(s.kind)}</td>
    </tr>
  </table>`
}

export function digestHtml(
  name: string,
  sites: DigestSite[],
  unsubUrl: string,
): string {
  const [first, second, ...rest] = sites
  const date = new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  const sub = `Hi ${esc(name)} — ${featuringLinks(sites)}`
  const preheader = `New in ${[...new Set(sites.map(s => s.kind))].slice(0, 3).join(', ')} — picked for your taste.`
  const featured = [first, second].filter(Boolean).map(featuredCard).join('')
  const index = rest.length
    ? `<tr><td style="padding:0 0 2px 0;">${rest.map(indexRow).join('')}</td></tr>`
    : ''
  const cta = `<tr><td style="padding:24px 0 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${INK}" style="background-color:${INK};border-radius:999px;"><tr>
      <td align="center" style="padding:13px 0;"><a href="${SITE_HOST}" style="display:block;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:0.01em;color:${BG};text-decoration:none;">Open the library</a></td>
    </tr></table>
  </td></tr>`
  const footer = `<tr><td align="center" style="padding:28px 0 0 0;border-top:1px solid ${EDGE};">
    <img src="${SITE_HOST}/mark.png" width="36" height="36" alt="" style="display:block;border:0;margin:0 auto;" />
    <p style="margin:12px 0 0 0;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.12em;color:${INK};">HITMAN'S LIBRARY</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0 0;"><tr>
      <td style="padding:0 12px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${INK_4};">Matched to the sites you favorited.</td>
      <td align="right" style="font-family:${SANS};font-size:12px;line-height:1.6;white-space:nowrap;"><a href="${esc(unsubUrl)}" style="color:${INK_4};">Unsubscribe</a></td>
    </tr></table>
    <p style="margin:16px 0 0 0;font-family:${SANS};font-size:12px;color:${INK_4};">&copy; ${new Date().getFullYear()} Hitman's Library</p>
  </td></tr>`
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
          <tr><td style="padding:0 0 8px 0;font-family:${SANS};font-size:30px;font-weight:600;letter-spacing:-0.03em;line-height:1.15;color:${INK};">New in the library this week.</td></tr>
          <tr><td style="padding:0 0 26px 0;font-family:${SANS};font-size:14px;letter-spacing:-0.01em;line-height:1.55;color:${INK_3};">${sub}</td></tr>
          <tr><td>${featured}</td></tr>
          ${index}
          ${cta}
          ${footer}
        </table>
      </td></tr>
    </table>
  </body></html>`
}

export function digestText(name: string, sites: DigestSite[], unsubUrl: string): string {
  const lines = sites.map(s => `- ${s.title} (${s.kind}): ${siteUrl(s.id)}`)
  return `New in the library this week.\n\nHi ${name}, ${featuring(sites.map(s => s.title))}\n\n${lines.join('\n')}\n\nOpen the library: ${SITE_HOST}\n\nMatched to the sites you favorited. Unsubscribe: ${unsubUrl}`
}
