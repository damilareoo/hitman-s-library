#!/usr/bin/env bun
// scripts/render-ai-example.ts
//
// The before/after on the Pro page, and the ethical use it shows. A made-up
// studio, Northwind, keeps its own layout, words and brand green; an AI tool
// looks up two studios in the library and borrows principles, not a look: a
// serif headline over a plain sans body, quiet warm neutrals, one soft
// highlight. Only free, openly licensed fonts; the references' paid faces are
// skipped. Every colour in the "after" is one the library returned for a
// reference (or Northwind's own green), so the picture is a real result.
//
//   bun scripts/render-ai-example.ts   → public/pro/ai-before.webp, ai-after.webp, ai-example.json
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolveSite } from '@/lib/read/resolve-site'
import { getSiteDetail } from '@/lib/read/site-detail'

// Two library sites as references: cues, not a copy of either.
const REFERENCES = ['goodside.studio', 'compact.studio']

// One page, Northwind's own: the same layout and words in both pictures; only
// the type and colour variables change. Project tiles are abstract artwork
// drawn from the palette, so nothing is borrowed from any site.
const page = (vars: string, head = '') => `<!doctype html><html><head><meta charset="utf-8">${head}<style>
:root{${vars}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--body);-webkit-font-smoothing:antialiased}
.wrap{padding:0 56px}
nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:72px;border-bottom:1px solid var(--line)}
.logo{font-family:var(--display);font-size:var(--logo-size);font-weight:var(--display-weight);letter-spacing:var(--display-track);color:var(--brand)}
.links{display:flex;gap:32px;font-size:14px;color:var(--muted)}
.cta{justify-self:end;font-size:13px;font-weight:600;padding:10px 16px;border-radius:var(--radius);background:var(--brand);color:var(--on-brand)}
.hero{display:grid;grid-template-columns:7fr 4fr;gap:64px;align-items:end;padding:60px 0 44px}
.label{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 20px}
h1{font-family:var(--display);font-weight:var(--display-weight);font-size:var(--h1-size);line-height:1.04;letter-spacing:var(--display-track);margin:0;text-wrap:balance;min-height:calc(2 * 1.04 * 64px)}
h1 em{font-style:var(--em-style);color:var(--brand)}
.intro{font-size:16px;line-height:1.6;color:var(--muted);margin:0 0 18px;text-wrap:pretty;max-width:34ch}
.more{font-size:14px;font-weight:600;color:var(--ink);border-bottom:1px solid var(--ink);padding-bottom:2px}
.head{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--line);padding-top:20px}
.head h2{font-family:var(--display);font-weight:var(--display-weight);font-size:26px;line-height:32px;letter-spacing:var(--display-track);margin:0}
.head span{font-size:13px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:20px}
.tile{aspect-ratio:16/11;border-radius:var(--radius);position:relative;overflow:hidden}
.tile small{position:absolute;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.t1{background:var(--brand);color:var(--on-brand)}.t1 b{position:absolute;left:26px;top:18px;font-family:var(--display);font-weight:var(--display-weight);font-size:150px;line-height:1}.t1 small{right:22px;bottom:20px;opacity:.85}
.t2{background:var(--surface)}.t2 .pg{position:absolute;left:50%;top:22px;bottom:0;width:58%;transform:translateX(-50%);background:var(--bg);padding:18px 18px 0;box-shadow:0 1px 0 var(--line)}
.t2 .no{font-family:var(--display);font-weight:var(--display-weight);font-size:44px;line-height:1;letter-spacing:var(--display-track)}
.t2 .ln{height:5px;background:var(--line);margin-top:9px}.t2 .ln:nth-child(2){margin-top:14px;width:70%;background:var(--ink);opacity:.8}.t2 .ln:nth-child(5){width:60%}
.t3{background:var(--highlight)}.t3 u{position:absolute;width:132px;height:132px;border-radius:50%;background:var(--accent);left:50%;top:34px;transform:translateX(-50%)}
.t3 s{position:absolute;left:0;right:0;top:118px;bottom:0;background:var(--highlight)}.t3 i{position:absolute;left:24px;right:24px;top:118px;height:2px;background:var(--ink)}
.t3 small{left:24px;bottom:20px;color:var(--ink)}
.cap{display:flex;justify-content:space-between;margin:10px 0 0;font-size:13px;line-height:18px}.cap span:last-child{color:var(--muted)}
</style></head><body><div class="wrap">
<nav><span class="logo">Northwind</span><span class="links"><span>Work</span><span>Studio</span><span>Journal</span></span><span class="cta">Start a project</span></nav>
<section class="hero"><div><p class="label">Independent design studio · Oslo</p><h1>Identity, type and web for brands that <em>intend</em> to last.</h1></div>
<div><p class="intro">We help founders and small teams with the things that carry a brand for years: a name set well, a clear voice, a site that lasts.</p><span class="more">See selected work</span></div></section>
<div class="head"><h2>Selected work</h2><span>2024 – 2026</span></div>
<div class="grid"><div><div class="tile t1"><b>H</b><small>Halden</small></div><p class="cap"><span>Halden Coffee</span><span>Identity</span></p></div>
<div><div class="tile t2"><div class="pg"><div class="no">No. 12</div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div><div class="ln"></div></div></div><p class="cap"><span>Fjord Press</span><span>Editorial</span></p></div>
<div><div class="tile t3"><u></u><s></s><i></i><small>Lumen</small></div><p class="cap"><span>Lumen Health</span><span>Web</span></p></div></div>
</div></body></html>`

// The starter: the defaults a new project tends to have.
const before = page(`--bg:#f8fafc;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--brand:#2563eb;--on-brand:#ffffff;--surface:#e2e8f0;--highlight:#dbeafe;--accent:#94a3b8;
--display:system-ui,-apple-system,sans-serif;--body:system-ui,-apple-system,sans-serif;--display-weight:800;--display-track:-.03em;--h1-size:50px;--logo-size:20px;--em-style:normal;--radius:10px`)

// Northwind is a made-up studio; its green is its own brand colour, not taken
// from anyone.
const BRAND = '#1f5c45'
// Free, openly licensed faces only (SIL OFL), both on Google Fonts. The paid
// faces the references use (Epicene Text, BureauSerif) are skipped.
const FONTS = { heading: 'Instrument Serif', body: 'Geist' }

async function main() {
  const [a, b] = await Promise.all(REFERENCES.map(async s => {
    const r = await resolveSite(s); const d = r ? await getSiteDetail(Number(r.id)) : null
    if (!d) throw new Error(`${s} not found`)
    return d
  }))
  const hex = (d: typeof a, h: string) => d.colors.find(c => c.hex_value.toLowerCase() === h)?.hex_value
  // The palette mood, from the colours the library returned for each site.
  const palette = {
    background: hex(a, '#ffffff')!,          // goodside.studio: white ground
    text: hex(b, '#1a1c27')!,                // compact.studio: deep ink, not pure black
    stone: hex(b, '#dccdc4')!,               // compact.studio: warm stone neutral
    muted: hex(a, '#696969')!,               // goodside.studio: quiet grey
    highlight: hex(a, '#ffffd0')!,           // goodside.studio: soft highlight
    brand: BRAND,
  }
  const after = page(`--bg:${palette.background};--ink:${palette.text};--muted:${palette.muted};--line:${palette.stone};--brand:${palette.brand};--on-brand:${palette.background};--surface:${palette.stone};--highlight:${palette.highlight};--accent:${palette.brand};
--display:"${FONTS.heading}", ui-serif, Georgia, serif;--body:"${FONTS.body}", ui-sans-serif, system-ui, sans-serif;--display-weight:400;--display-track:-.015em;--h1-size:64px;--logo-size:28px;--em-style:italic;--radius:2px`,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;600&display=swap">')

  const br = await chromium.launch({ channel: 'chrome' })
  const p = await br.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 2 })
  for (const [name, html] of [['before', before], ['after', after]] as const) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    const png = await p.screenshot()
    await sharp(png).resize({ width: 1200 }).webp({ quality: 84 }).toFile(`public/pro/ai-${name}.webp`)
  }
  await br.close()
  const example = {
    studio: 'Northwind',
    references: REFERENCES,
    fonts: [FONTS.heading, FONTS.body],
    skipped: [...new Set([...a.typography, ...b.typography].map(t => t.font_family).filter(f => !Object.values(FONTS).includes(f) && f !== 'Instrument Serif'))],
    colors: [palette.background, palette.text, palette.stone, palette.highlight, palette.brand],
  }
  writeFileSync('public/pro/ai-example.json', JSON.stringify(example, null, 2) + '\n')
  console.log(JSON.stringify(example))
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })
