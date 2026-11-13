// lib/email/pro-welcome.ts
//
// The welcome email for a new Pro member: the Pro moment's final frame, the
// word "Pro" built from the member's own colours (sorted exactly as the
// animation ends: hue across, lightest on top), on the site's card layout:
// tinted header, one-idea body, tinted footer. Email can't run canvas, so the
// word is a table of small coloured cells from a fixed mask of the real font.
// Light only: most mail clients render on white.
import { PRO_MASK } from '@/lib/pro/word-mask'
import { centreOf, fill, hueWindow, sortForSlots, type Swatch } from '@/lib/pro/palette'

const SITE = 'https://hitmanslibrary.xyz'
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const NEUTRAL: Swatch[] = ['#3f3f3c', '#4a4a46', '#55554f', '#2e2e2b', '#5f5e58'].map(c => [c, ''])

const C = { ink: '#161615', muted: '#76746e', line: '#ebeae6', tint: '#f7f7f5', amber: '#A8611A' }
const FONT = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`

function wordTable(swatches: Swatch[], seed: number): string {
  const slots: [number, number][] = []
  PRO_MASK.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') slots.push([x, y]) }))
  const pool = swatches.length ? hueWindow(swatches, swatches, false) : NEUTRAL
  const colours = sortForSlots(slots, fill(pool.length ? pool : NEUTRAL, slots.length, seed), centreOf(pool.length ? pool : NEUTRAL))
  const at = new Map(slots.map((s, i) => [`${s[0]},${s[1]}`, colours[i][0]]))
  const rows = PRO_MASK.map((row, y) => {
    let cells = '', gap = 0
    const flush = () => { if (gap) { cells += `<td colspan="${gap}"></td>`; gap = 0 } }
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') { flush(); cells += `<td bgcolor="${at.get(`${x},${y}`)}" width="5" height="5"></td>` } else gap++
    }
    flush()
    return `<tr>${cells}</tr>`
  }).join('')
  return `<table role="presentation" aria-label="Pro" cellpadding="0" cellspacing="1" border="0" style="border-collapse:separate;line-height:0;font-size:0">${rows}</table>`
}

export function proWelcomeEmail({ name, memberNo, swatches }: { name: string; memberNo: number; swatches: Swatch[] }) {
  const no = String(memberNo).padStart(4, '0')
  const hello = name ? `${esc(name.split(' ')[0])}, every colour in the library is yours to take.` : 'Every colour in the library is yours to take.'
  const item = (t: string) => `<tr><td style="padding:3px 0;font:400 14px/1.45 ${FONT};color:#3d3c38">${t}</td></tr>`
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>You're Pro</title></head>
<body style="margin:0;padding:0;background:#f4f3ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ef"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="380" cellpadding="0" cellspacing="0" border="0" style="width:380px;max-width:100%;background:#ffffff;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;overflow:hidden">
  <tr><td style="background:${C.tint};border-bottom:1px solid ${C.line};border-radius:16px 16px 0 0;padding:11px 16px;font:500 12.5px ${FONT};color:${C.muted}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font:500 12.5px ${FONT};color:${C.muted}">Membership</td><td align="right" style="font:500 12.5px ${FONT};color:${C.muted}">No. ${no}</td></tr></table>
  </td></tr>
  <tr><td style="padding:20px 16px 4px">${wordTable(swatches, memberNo * 7919)}</td></tr>
  <tr><td style="padding:12px 16px 0;font:600 20px/1.2 ${FONT};color:${C.ink};letter-spacing:-0.02em">You're Pro.</td></tr>
  <tr><td style="padding:4px 16px 0;font:400 14px/1.45 ${FONT};color:${C.muted}">${hello}</td></tr>
  <tr><td style="padding:14px 16px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0">
    ${item('Unlimited style kits')}${item('Search by palette, font and contrast')}${item('Your site requests reviewed first')}
  </table></td></tr>
  <tr><td style="background:${C.tint};border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:10px 8px 10px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:400 12px ${FONT};color:${C.muted}">Paddle sends your receipt separately.</td>
      <td align="right"><a href="${SITE}/" style="display:inline-block;padding:8px 12px;border-radius:10px;background:${C.ink};color:#ffffff;font:600 13px ${FONT};text-decoration:none">Open the library</a></td>
    </tr></table>
  </td></tr>
</table>
<p style="margin:16px 0 0;font:400 12px/1.5 ${FONT};color:${C.muted}">Manage or cancel any time at <a href="${SITE}/pro" style="color:${C.muted}">hitmanslibrary.xyz/pro</a>.</p>
</td></tr></table>
</body></html>`
  const text = `You're Pro.

${name ? `${name.split(' ')[0]}, every` : 'Every'} colour in the library is yours to take.

- Unlimited style kits
- Search by palette, font and contrast
- Your site requests reviewed first

Open the library: ${SITE}/
Manage your subscription: ${SITE}/pro
Paddle sends your receipt separately.

Membership No. ${no}`
  return { subject: "You're Pro", html, text }
}
