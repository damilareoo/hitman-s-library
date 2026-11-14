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

const page = (style: string, head = '') => `<!doctype html><html><head><meta charset="utf-8">${head}<style>${style}
*{box-sizing:border-box}body{margin:0}
nav{display:flex;justify-content:space-between;align-items:center;padding:22px 40px}
.hero{padding:88px 40px 56px;text-align:center}
h1{margin:0 auto;max-width:900px}
p{max-width:520px;margin:24px auto 0;font-size:17px;line-height:1.5}
a{display:inline-block;margin-top:32px;padding:14px 22px;text-decoration:none;font-size:14px}
.band{margin:48px 40px 0;height:200px}
</style></head><body><nav><span class="logo">Northwind</span><span class="menu">Menu</span></nav>
<section class="hero"><h1>Where quiet ideas become lasting brands</h1><p>An independent studio for identity, type and the web.</p><a href="#">Start a project</a></section><div class="band"></div></body></html>`

// The starter: the defaults a new project tends to have.
const before = page(`body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
nav{border-bottom:1px solid #e2e8f0}.logo{font-weight:700;font-size:20px}.menu{font-size:14px;color:#475569}
h1{font-size:56px;font-weight:800;letter-spacing:-.02em;line-height:1.1}p{color:#64748b}
a{background:#2563eb;color:#fff;border-radius:8px;font-weight:600}.band{background:#e2e8f0;border-radius:12px}`)

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
  const after = page(`:root{--bg:${palette.background};--ink:${palette.text};--stone:${palette.stone};--muted:${palette.muted};--highlight:${palette.highlight};--brand:${palette.brand};--font-heading:"${FONTS.heading}", ui-serif, Georgia, serif;--font-body:"${FONTS.body}", ui-sans-serif, system-ui, sans-serif}
body{font-family:var(--font-body);background:var(--bg);color:var(--ink)}
nav{border-bottom:1px solid var(--stone)}.logo{font-family:var(--font-heading);font-size:30px;color:var(--brand)}.menu{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h1{font-family:var(--font-heading);font-weight:400;font-size:72px;line-height:1.02;letter-spacing:-.02em}p{color:var(--muted)}
a{background:var(--brand);color:#fff;border-radius:999px}.band{background:linear-gradient(90deg,var(--stone) 0 70%,var(--highlight) 70%)}`,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@400;600&display=swap">')

  const br = await chromium.launch({ channel: 'chrome' })
  const p = await br.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
  for (const [name, html] of [['before', before], ['after', after]] as const) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    const png = await p.screenshot()
    await sharp(png).resize({ width: 960 }).webp({ quality: 82 }).toFile(`public/pro/ai-${name}.webp`)
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
