#!/usr/bin/env bun
// scripts/render-ai-example.ts
//
// The before/after on the Pro page: a pricing section for Margin, a made-up
// writing app, redesigned from principles an AI tool read from two library
// sites, following the design brief the library sends (lib/mcp/guide.ts).
//
// Before: the section an AI produces with no references: centred title, three
// identical shadowed cards, a gradient "Most popular" badge, ticks on every
// line, the same gradient button three times.
// After: decisions measured on the references, applied to Margin's own
// content and brand:
//   - display at weight 500 with tight leading, body 16/24 (both references)
//   - one flat comparison grid with hairlines, no shadows (both are dense, flat)
//   - near-monochrome; Margin's own accent used once, on the recommended plan
//   - tabular prices; "Everything in Free, plus" instead of ticks everywhere
//   - free fonts (Geist, Geist Mono) for the references' paid faces
//
//   bun scripts/render-ai-example.ts   → public/pro/ai-before.webp, ai-after.webp, ai-example.json
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolveSite } from '@/lib/read/resolve-site'
import { getSiteDetail } from '@/lib/read/site-detail'

const REFERENCES = ['money.x.com/en', 'annnimate.com/kits/reveal']
// Margin is made up; its vermilion is its own.
const BRAND = '#e5502e'
const W = 1200, H = 720

const PLANS = [
  { name: 'Free', price: '0', note: 'For writing on your own.', cta: 'Start writing', lead: null as string | null, items: ['Unlimited documents', 'Version history for 30 days', 'Export to Markdown and PDF'] },
  { name: 'Pro', price: '8', note: 'For publishing and review.', cta: 'Try Pro free', lead: 'Everything in Free, plus', items: ['Unlimited version history', 'Comments and suggestions', 'Publish to your own domain'] },
  { name: 'Team', price: '14', note: 'Per member, for shared work.', cta: 'Talk to us', lead: 'Everything in Pro, plus', items: ['Shared workspaces', 'Roles and permissions', 'SSO and an audit log'] },
]

// ── Before: what you get without references ────────────────────────────────
const before = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;background:#fff;position:relative}
.blob{position:absolute;width:620px;height:420px;left:290px;top:-160px;background:radial-gradient(closest-side,#a78bfa,#f0abfc 55%,transparent);filter:blur(40px);opacity:.55}
.in{position:relative;text-align:center;padding:52px 64px 0}
h2{font-size:42px;font-weight:800;letter-spacing:-.02em;margin:0}
.sub{margin:10px 0 0;font-size:17px;color:#64748b}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:40px;align-items:center;text-align:left}
.card{background:#fff;border-radius:20px;padding:28px;box-shadow:0 20px 40px -12px rgba(30,27,75,.18)}
.pop{transform:scale(1.04);border:2px solid transparent;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#6366f1,#ec4899) border-box}
.badge{display:inline-block;font-size:12px;font-weight:700;color:#fff;padding:5px 10px;border-radius:999px;background:linear-gradient(90deg,#6366f1,#ec4899);margin-bottom:10px}
.name{font-size:20px;font-weight:700}.note{font-size:14px;color:#64748b;margin-top:4px}
.price{font-size:46px;font-weight:800;margin:16px 0 4px}.price small{font-size:16px;font-weight:500;color:#64748b}
ul{list-style:none;padding:0;margin:18px 0 22px}li{font-size:14px;margin:9px 0;color:#334155}li:before{content:"✓";color:#22c55e;font-weight:800;margin-right:8px}
.btn{display:block;text-align:center;font-weight:700;font-size:15px;color:#fff;padding:13px;border-radius:12px;background:linear-gradient(90deg,#6366f1,#8b5cf6)}
</style></head><body><div class="blob"></div><div class="in">
<h2>Choose Your Plan</h2><p class="sub">Simple, transparent pricing that grows with you.</p>
<div class="cards">${PLANS.map((p, i) => `<div class="card${i === 1 ? ' pop' : ''}">${i === 1 ? '<span class="badge">🔥 Most Popular</span>' : ''}
<div class="name">${p.name}</div><div class="note">${p.note}</div>
<div class="price">$${p.price}<small>/month</small></div>
<ul>${[...(p.lead ? [p.lead.replace(', plus', '')] : []), ...p.items].map(x => `<li>${x}</li>`).join('')}</ul><span class="btn">Get Started</span></div>`).join('')}</div>
</div></body></html>`

// ── After: decisions from the references ───────────────────────────────────
const after = (c: { bg: string; ink: string; line: string; muted: string; tint: string; brand: string }, t: { displayWeight: number; displayLeading: number; bodySize: number; bodyLeading: number }) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:"Geist",ui-sans-serif,system-ui,sans-serif;color:${c.ink};background:${c.bg};-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1}
.in{padding:56px 64px 0}
.top{display:grid;grid-template-columns:7fr 5fr;gap:64px;align-items:end}
.label{font-family:"Geist Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${c.muted};margin:0 0 16px}
h2{font-size:52px;font-weight:${t.displayWeight};line-height:${t.displayLeading};letter-spacing:-.03em;margin:0;text-wrap:balance}
.lede{font-size:${t.bodySize}px;line-height:${t.bodyLeading}px;color:${c.muted};margin:0 0 20px;text-wrap:pretty}
.seg{display:inline-flex;padding:3px;border-radius:10px;background:${c.line}}
.seg span{font-size:13px;font-weight:500;padding:7px 12px;border-radius:7px;color:${c.muted}}
.seg .on{background:${c.bg};color:${c.ink};box-shadow:0 1px 0 rgba(0,0,0,.04)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:40px;border:1px solid ${c.line};border-radius:16px;overflow:hidden}
.col{padding:24px 24px 26px}.col+.col{border-left:1px solid ${c.line}}
.rec{background:color-mix(in srgb,${c.tint} 50%,${c.bg})}
.head{display:flex;justify-content:space-between;align-items:center}
.name{font-size:15px;font-weight:600}
.tag{display:inline-flex;align-items:center;gap:6px;font-family:"Geist Mono",monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${c.ink}}
.tag i{width:6px;height:6px;border-radius:50%;background:${c.brand}}
.note{font-size:14px;color:${c.muted};margin-top:4px}
.price{display:flex;align-items:baseline;gap:6px;margin:22px 0 20px}
.price b{font-size:44px;font-weight:500;letter-spacing:-.03em;line-height:1}
.price span{font-size:14px;color:${c.muted}}
.btn{display:block;text-align:center;font-size:14px;font-weight:500;padding:11px;border-radius:10px;border:1px solid ${c.line};color:${c.ink};background:${c.bg}}
.btn.pri{background:${c.brand};border-color:${c.brand};color:#fff}
.list{margin-top:22px;padding-top:18px;border-top:1px solid ${c.line}}
.lead{font-size:13px;color:${c.muted};margin-bottom:10px}
.list div{font-size:14px;line-height:22px;padding:4px 0}
.fine{font-size:13px;color:${c.muted};margin-top:18px}
</style></head><body><div class="in">
<div class="top"><div><p class="label">Pricing</p><h2>Pay for what you publish, not for every seat.</h2></div>
<div><p class="lede">Every plan keeps unlimited documents. Upgrade when you need review, history and your own domain.</p>
<div class="seg"><span class="on">Monthly</span><span>Yearly · 2 months free</span></div></div></div>
<div class="grid">${PLANS.map((p, i) => `<div class="col${i === 1 ? ' rec' : ''}">
<div class="head"><span class="name">${p.name}</span>${i === 1 ? '<span class="tag"><i></i>Recommended</span>' : ''}</div>
<div class="note">${p.note}</div>
<div class="price"><b>$${p.price}</b><span>per month</span></div>
<span class="btn${i === 1 ? ' pri' : ''}">${p.cta}</span>
<div class="list">${p.lead ? `<div class="lead">${p.lead}</div>` : '<div class="lead">Includes</div>'}${p.items.map(x => `<div>${x}</div>`).join('')}</div></div>`).join('')}</div>
<p class="fine">Prices in US dollars. Cancel any time. Half price for students and teachers.</p>
</div></body></html>`

async function main() {
  const [x, an] = await Promise.all(REFERENCES.map(async s => {
    const r = await resolveSite(s); const d = r ? await getSiteDetail(Number(r.id)) : null
    if (!d) throw new Error(`${s} not found`)
    return d
  }))
  const has = (d: typeof x, h: string) => {
    const c = d.colors.find(v => v.hex_value.toLowerCase() === h)?.hex_value
    if (!c) throw new Error(`${h} not returned for ${d.url}`)
    return c
  }
  const heading = x.typography.find(t => t.role === 'heading')!
  const body = x.typography.find(t => t.role === 'body')!
  // Measured on money.x.com: display 48px at 500 on 52px; body 16px on 24px.
  const type = {
    displayWeight: heading.primary_weight ?? 500,
    displayLeading: Math.round((parseFloat(String(heading.sample_line_height)) / (heading.sample_size_px ?? 48)) * 100) / 100,
    bodySize: body.sample_size_px ?? 16,
    bodyLeading: parseFloat(String(body.sample_line_height)) || 24,
  }
  const colors = {
    bg: has(x, '#ffffff'),       // money.x.com: white ground
    ink: an.colors.find(c => c.hex_value === '#141314')?.hex_value ?? has(x, '#000000'), // annnimate: warm near-black ink
    line: has(x, '#ebebeb'),     // money.x.com: hairline grey
    // annnimate's quiet grey (#a3a3a3) reads at 2.5:1 on white; the same grey
    // darkened to #6b6b6b clears AA (5.3:1) for body text, as the brief asks.
    muted: '#6b6b6b',
    tint: has(x, '#fffed7'),     // money.x.com: soft highlight, at half strength, for the recommended plan only
    brand: BRAND,
  }
  const br = await chromium.launch({ channel: 'chrome' })
  const p = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
  for (const [name, html] of [['before', before], ['after', after(colors, type)]] as const) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    await sharp(await p.screenshot()).resize({ width: W }).webp({ quality: 86 }).toFile(`public/pro/ai-${name}.webp`)
  }
  await br.close()
  const example = {
    product: 'Margin',
    section: 'pricing',
    references: ['money.x.com', 'annnimate.com'],
    measured: `${heading.sample_size_px}px at ${type.displayWeight} on ${heading.sample_line_height}; body ${type.bodySize}/${type.bodyLeading}`,
    fonts: ['Geist', 'Geist Mono'],
    skipped: [heading.font_family, body.font_family, ...an.typography.map(t => t.font_family)].filter((v, i, a) => a.indexOf(v) === i),
    colors: [colors.bg, colors.ink, colors.line, colors.tint, colors.brand],
    ratio: `${W} / ${H}`,
  }
  writeFileSync('public/pro/ai-example.json', JSON.stringify(example, null, 2) + '\n')
  console.log(JSON.stringify(example))
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })
