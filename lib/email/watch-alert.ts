// lib/email/watch-alert.ts
//
// "A site you watch has redesigned": the before and after captures side by
// side, then what changed in colour and type. The same card as the Pro
// welcome email: tinted header, one idea, tinted footer. Light only.

const SITE = 'https://hitmanslibrary.xyz'
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const C = { ink: '#161615', muted: '#76746e', line: '#ebeae6', tint: '#f7f7f5' }
const FONT = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`

export interface WatchAlert {
  siteName: string
  siteSlug: string
  before: { capture: string | null; colors: string[]; fonts: string[] }
  after: { capture: string | null; colors: string[]; fonts: string[] }
}

const dots = (colors: string[]) => colors.slice(0, 8).map(c =>
  `<td style="padding:0 3px 0 0"><div style="width:14px;height:14px;border-radius:7px;background:${esc(c)};border:1px solid rgba(0,0,0,0.08)"></div></td>`).join('')

function side(label: string, s: WatchAlert['before']) {
  const img = s.capture
    ? `<img src="${esc(s.capture)}" width="164" alt="${label}" style="display:block;width:164px;height:110px;object-fit:cover;object-position:top;border:1px solid ${C.line};border-radius:10px">`
    : `<div style="width:164px;height:110px;border:1px solid ${C.line};border-radius:10px;background:${C.tint}"></div>`
  return `<td valign="top" style="width:164px">
    <div style="font:600 11px ${FONT};letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};padding-bottom:6px">${label}</div>
    ${img}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px"><tr>${dots(s.colors)}</tr></table>
    <div style="font:400 12px/1.4 ${FONT};color:${C.muted};padding-top:6px">${esc(s.fonts.slice(0, 2).join(', ') || 'No fonts read')}</div>
  </td>`
}

export function watchAlertEmail(a: WatchAlert) {
  const name = esc(a.siteName)
  const link = `${SITE}/?site=${encodeURIComponent(a.siteSlug)}`
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${name} has redesigned</title></head>
<body style="margin:0;padding:0;background:#f4f3ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ef"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="380" cellpadding="0" cellspacing="0" border="0" style="width:380px;max-width:100%;background:#ffffff;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;overflow:hidden">
  <tr><td style="background:${C.tint};border-bottom:1px solid ${C.line};border-radius:16px 16px 0 0;padding:11px 16px;font:500 12.5px ${FONT};color:${C.muted}">Watching · ${name}</td></tr>
  <tr><td style="padding:18px 16px 6px;font:600 20px/1.2 ${FONT};color:${C.ink};letter-spacing:-0.02em">${name} has redesigned.</td></tr>
  <tr><td style="padding:2px 16px 14px;font:400 14px/1.45 ${FONT};color:${C.muted}">Here's the look you watched, and the new one.</td></tr>
  <tr><td style="padding:0 16px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${side('Before', a.before)}<td style="width:20px"></td>${side('Now', a.after)}</tr></table></td></tr>
  <tr><td style="background:${C.tint};border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:10px 8px 10px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:400 12px ${FONT};color:${C.muted}">Every look is kept in its History tab.</td>
      <td align="right"><a href="${link}" style="display:inline-block;padding:8px 12px;border-radius:10px;background:${C.ink};color:#ffffff;font:600 13px ${FONT};text-decoration:none">See the change</a></td>
    </tr></table>
  </td></tr>
</table>
<p style="margin:16px 0 0;font:400 12px/1.5 ${FONT};color:${C.muted}">You watch this site on Hitman's Library. Stop watching from its eye button.</p>
</td></tr></table>
</body></html>`
  const text = `${a.siteName} has redesigned.

Before: ${a.before.fonts.slice(0, 2).join(', ')} · ${a.before.colors.slice(0, 6).join(' ')}
Now: ${a.after.fonts.slice(0, 2).join(', ')} · ${a.after.colors.slice(0, 6).join(' ')}

See the change: ${link}
You watch this site on Hitman's Library. Stop watching from its eye button.`
  return { subject: `${a.siteName} has redesigned`, html, text }
}
