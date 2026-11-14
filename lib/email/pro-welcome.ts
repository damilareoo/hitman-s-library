// lib/email/pro-welcome.ts
//
// The welcome email for a new Pro member: the Pro moment itself, as an
// animated GIF in the hue nearest the member's own colours, on the site's card
// layout: tinted header, one-idea body, tinted footer. Light only: most mail
// clients render on white.
import { centreOf, hueWindow, type Swatch } from '@/lib/pro/palette'

const SITE = 'https://hitmanslibrary.xyz'
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const C = { ink: '#161615', muted: '#76746e', line: '#ebeae6', tint: '#f7f7f5', amber: '#A8611A' }
const FONT = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`

/**
 * The animated word: one of twelve pre-rendered GIFs (scripts/render-pro-gifs.mjs),
 * one per 30° hue window, chosen to sit nearest the member's own colours.
 * Frame 0 is the finished word, for clients that only show the first frame.
 */
export function proGifFor(swatches: Swatch[]): string {
  const pool = swatches.length ? hueWindow(swatches, swatches, false) : []
  const centre = pool.length ? centreOf(pool) : 30
  const bucket = (Math.round(centre / 30) * 30) % 360
  return `${SITE}/email/pro-h${String(bucket).padStart(3, '0')}.gif`
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
  <tr><td style="padding:20px 16px 8px"><img src="${proGifFor(swatches)}" width="300" height="152" alt="Pro" style="display:block;width:300px;max-width:100%;height:auto;border:0;font:700 40px ${FONT};color:${C.ink}"></td></tr>
  <tr><td style="padding:12px 16px 0;font:600 20px/1.2 ${FONT};color:${C.ink};letter-spacing:-0.02em">You're Pro.</td></tr>
  <tr><td style="padding:4px 16px 0;font:400 14px/1.45 ${FONT};color:${C.muted}">${hello}</td></tr>
  <tr><td style="padding:14px 16px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0">
    ${item('Search by palette, font and contrast')}${item('The library inside Claude and Cursor')}${item('Redesign alerts and site history')}${item('Monthly trends')}
  </table></td></tr>
  <tr><td style="background:${C.tint};border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:10px 8px 10px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:400 12px ${FONT};color:${C.muted}">Bachs sends your receipt separately.</td>
      <td align="right"><a href="${SITE}/" style="display:inline-block;padding:8px 12px;border-radius:10px;background:${C.ink};color:#ffffff;font:600 13px ${FONT};text-decoration:none">Open the library</a></td>
    </tr></table>
  </td></tr>
</table>
<p style="margin:16px 0 0;font:400 12px/1.5 ${FONT};color:${C.muted}">Manage or cancel any time at <a href="${SITE}/pro" style="color:${C.muted}">hitmanslibrary.xyz/pro</a>.</p>
</td></tr></table>
</body></html>`
  const text = `You're Pro.

${name ? `${name.split(' ')[0]}, every` : 'Every'} colour in the library is yours to take.

- Search by palette, font and contrast
- The library inside Claude and Cursor (connect at ${SITE}/pro)
- Redesign alerts and site history
- Monthly trends

Open the library: ${SITE}/
Manage your subscription: ${SITE}/pro
Bachs sends your receipt separately.

Membership No. ${no}`
  return { subject: "You're Pro", html, text }
}
