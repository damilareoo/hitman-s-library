// lib/email/trends-briefing.ts
// The monthly trends briefing for Pro members: three findings from the
// library's own data and a link to the full report. Same card as the other
// Pro emails. Light only.
import type { Trends } from '@/lib/trends/compute'

const SITE = 'https://hitmanslibrary.xyz'
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const C = { ink: '#161615', muted: '#76746e', line: '#ebeae6', tint: '#f7f7f5' }
const FONT = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`
const pct = (x: number) => `${Math.round(x * 100)}%`

/** The three biggest movements, as plain sentences. */
export function findings(t: Trends): string[] {
  const shareOf = (n: number, of: number) => (of ? n / of : 0)
  const rising = t.fonts
    .map(f => ({ name: f.name, d: shareOf(f.recent, t.recentCount) - shareOf(f.earlier, t.earlierCount), now: shareOf(f.recent, t.recentCount), before: shareOf(f.earlier, t.earlierCount) }))
    .sort((a, b) => b.d - a.d)[0]
  const hues = t.hues.filter(h => h.name !== 'Neutral').map(h => ({ ...h, d: h.recent - h.earlier }))
  const up = [...hues].sort((a, b) => b.d - a.d)[0], down = [...hues].sort((a, b) => a.d - b.d)[0]
  const out: string[] = []
  if (rising && rising.d > 0.01) out.push(`${rising.name} is spreading: ${pct(rising.now)} of new sites use it, up from ${pct(rising.before)}.`)
  if (up && down && up.d > 0.01) out.push(`${up.name} accents are up (${pct(up.recent)} from ${pct(up.earlier)}); ${down.name.toLowerCase()} is down (${pct(down.recent)} from ${pct(down.earlier)}).`)
  out.push(`${pct(t.serif.recent)} of new sites set a serif, against ${pct(t.serif.earlier)} before; ${pct(t.dark.recent)} are dark pages.`)
  return out.slice(0, 3)
}

export function trendsEmail(t: Trends, month: string) {
  const items = findings(t)
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>Trends · ${esc(month)}</title></head>
<body style="margin:0;padding:0;background:#f4f3ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ef"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="380" cellpadding="0" cellspacing="0" border="0" style="width:380px;max-width:100%;background:#ffffff;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;overflow:hidden">
  <tr><td style="background:${C.tint};border-bottom:1px solid ${C.line};border-radius:16px 16px 0 0;padding:11px 16px;font:500 12.5px ${FONT};color:${C.muted}">Trends · ${esc(month)}</td></tr>
  <tr><td style="padding:18px 16px 4px;font:600 20px/1.2 ${FONT};color:${C.ink};letter-spacing:-0.02em">What the newest sites are doing.</td></tr>
  <tr><td style="padding:2px 16px 12px;font:400 14px/1.45 ${FONT};color:${C.muted}">${t.recentCount} sites added in the last 30 days, against the ${t.earlierCount} before them.</td></tr>
  ${items.map(i => `<tr><td style="padding:6px 16px;font:400 14px/1.5 ${FONT};color:#3d3c38">${esc(i)}</td></tr>`).join('')}
  <tr><td style="padding:8px 0 0"></td></tr>
  <tr><td style="background:${C.tint};border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:10px 8px 10px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:400 12px ${FONT};color:${C.muted}">Part of your Pro membership.</td>
      <td align="right"><a href="${SITE}/trends" style="display:inline-block;padding:8px 12px;border-radius:10px;background:${C.ink};color:#ffffff;font:600 13px ${FONT};text-decoration:none">Full report</a></td>
    </tr></table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
  const text = `Trends · ${month}\n\n${items.join('\n\n')}\n\nFull report: ${SITE}/trends`
  return { subject: `Trends · ${month}`, html, text }
}
