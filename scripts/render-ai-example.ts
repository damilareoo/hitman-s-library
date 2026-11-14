#!/usr/bin/env bun
// scripts/render-ai-example.ts
//
// The before/after on the Pro page, and the ethical use it shows. A made-up
// app, Tempo, keeps its own layout, words and brand pink; an AI tool looks up
// two dark product sites in the library and borrows a mood, not a look:
// near-black surfaces, warm off-white type, a mono face for numbers, one
// second colour for data. Only free, openly licensed fonts. Every colour in
// the "after" is one the library returned for a reference, or Tempo's own
// pink, so the picture is a real result.
//
//   bun scripts/render-ai-example.ts   → public/pro/ai-before.webp, ai-after.webp, ai-example.json
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolveSite } from '@/lib/read/resolve-site'
import { getSiteDetail } from '@/lib/read/site-detail'

// Two library sites as references: cues, not a copy of either.
const REFERENCES = ['plastic.audio/drum-pad', 'tomjohn.design']
// Tempo is made up; its pink is its own brand colour, taken from no one.
const BRAND = '#ff4d8d'
// Free, openly licensed (SIL OFL), on Google Fonts.
const FONTS = { sans: 'Geist', mono: 'Geist Mono' }

// One page, Tempo's own: identical layout and words in both pictures; only the
// type and colour variables change. The product is drawn in CSS.
const page = (vars: string, head = '') => `<!doctype html><html><head><meta charset="utf-8">${head}<style>
:root{${vars}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;height:620px;overflow:hidden}
.wrap{padding:0 56px}
nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:72px;border-bottom:1px solid var(--line)}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:19px;letter-spacing:-.02em}
.logo i{width:22px;height:22px;border-radius:7px;background:var(--brand)}
.links{display:flex;gap:30px;font-size:14px;color:var(--muted)}
.cta{justify-self:end;font-size:13px;font-weight:600;padding:10px 16px;border-radius:var(--radius);background:var(--brand);color:var(--on-brand)}
.hero{display:grid;grid-template-columns:5fr 6fr;gap:56px;align-items:center;padding:52px 0}
.label{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 22px}
.label b{width:7px;height:7px;border-radius:50%;background:var(--brand)}
h1{font-weight:var(--h1-weight);font-size:58px;line-height:1.02;letter-spacing:-.035em;margin:0;text-wrap:balance;min-height:calc(3 * 1.02 * 58px)}
.intro{font-size:16px;line-height:1.6;color:var(--muted);margin:22px 0 28px;max-width:36ch;text-wrap:pretty}
.btns{display:flex;gap:12px}.btns span{font-size:14px;font-weight:600;padding:12px 18px;border-radius:var(--radius)}
.b1{background:var(--brand);color:var(--on-brand)}.b2{border:1px solid var(--line);color:var(--ink)}
.app{background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--radius) * 1.6);padding:22px;box-shadow:var(--shadow)}
.top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted)}
.chip{font-family:var(--mono);font-size:11px;padding:5px 9px;border-radius:999px;background:var(--chip);color:var(--ink)}
.timer{font-family:var(--mono);font-size:76px;font-weight:500;letter-spacing:-.04em;line-height:1;margin:18px 0 6px}
.sub{font-size:13px;color:var(--muted)}
.wave{display:flex;align-items:end;gap:5px;height:84px;margin:22px 0 18px}
.wave i{flex:1;border-radius:3px;background:var(--data)}
.wave i.on{background:var(--brand)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.stat{background:var(--chip);border-radius:var(--radius);padding:12px 14px}
.stat small{display:block;font-size:11.5px;color:var(--muted)}
.stat b{display:block;font-family:var(--mono);font-size:20px;font-weight:500;margin-top:6px;letter-spacing:-.02em}
</style></head><body><div class="wrap">
<nav><span class="logo"><i></i>Tempo</span><span class="links"><span>Features</span><span>Pricing</span><span>Changelog</span></span><span class="cta">Get the app</span></nav>
<section class="hero"><div><p class="label"><b></b>Focus music, measured</p><h1>Deep work that keeps its rhythm all day.</h1>
<p class="intro">Tempo plays sound tuned to how you work, and shows you when your focus actually happens.</p>
<div class="btns"><span class="b1">Start free</span><span class="b2">See how it works</span></div></div>
<div class="app"><div class="top"><span>Focus session</span><span class="chip">LIVE</span></div>
<div class="timer">24:59</div><div class="sub">Deep work · Lo-fi at 72 BPM</div>
<div class="wave">${[38, 52, 30, 64, 80, 58, 70, 92, 66, 48, 74, 88, 60, 42, 56, 78, 50, 34, 62, 46].map((h, i) => `<i class="${i > 4 && i < 13 ? 'on' : ''}" style="height:${h}%"></i>`).join('')}</div>
<div class="stats"><div class="stat"><small>Streak</small><b>12 days</b></div><div class="stat"><small>Today</small><b>3h 20m</b></div><div class="stat"><small>In flow</small><b>86%</b></div></div></div>
</section></div></body></html>`

// The starter: the defaults a new project tends to have.
const before = page(`--bg:#ffffff;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--brand:#2563eb;--on-brand:#ffffff;--surface:#f8fafc;--chip:#eef2f7;--data:#cbd5e1;
--sans:system-ui,-apple-system,sans-serif;--mono:ui-monospace,Menlo,monospace;--h1-weight:800;--radius:10px;--shadow:0 10px 30px rgba(15,23,42,.08)`)

async function main() {
  const [a, b] = await Promise.all(REFERENCES.map(async s => {
    const r = await resolveSite(s); const d = r ? await getSiteDetail(Number(r.id)) : null
    if (!d) throw new Error(`${s} not found`)
    return d
  }))
  const pick = (d: typeof a, h: string) => {
    const c = d.colors.find(x => x.hex_value.toLowerCase() === h)?.hex_value
    if (!c) throw new Error(`${h} not returned for ${d.url}`)
    return c
  }
  // The mood, from the colours the library returned for each reference.
  const palette = {
    background: pick(a, '#0a0a0a'),   // plastic.audio: near-black ground
    surface: pick(a, '#1e1e1e'),      // plastic.audio: raised surface
    text: pick(a, '#e6e2da'),         // plastic.audio: warm off-white type
    muted: pick(b, '#a3a3a3'),        // tomjohn.design: quiet grey
    chip: pick(b, '#222222'),         // tomjohn.design: inset surface
    data: pick(b, '#3a50fc'),         // tomjohn.design: one electric blue, for data
    brand: BRAND,
  }
  const after = page(`--bg:${palette.background};--ink:${palette.text};--muted:${palette.muted};--line:${palette.surface};--brand:${palette.brand};--on-brand:${palette.background};--surface:${palette.surface};--chip:${palette.chip};--data:${palette.data};
--sans:"${FONTS.sans}", ui-sans-serif, system-ui, sans-serif;--mono:"${FONTS.mono}", ui-monospace, monospace;--h1-weight:600;--radius:12px;--shadow:0 30px 80px -30px rgba(0,0,0,.8)`,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">')

  const br = await chromium.launch({ channel: 'chrome' })
  const p = await br.newPage({ viewport: { width: 1200, height: 620 }, deviceScaleFactor: 2 })
  for (const [name, html] of [['before', before], ['after', after]] as const) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    const png = await p.screenshot()
    await sharp(png).resize({ width: 1200 }).webp({ quality: 84 }).toFile(`public/pro/ai-${name}.webp`)
  }
  await br.close()
  const example = {
    product: 'Tempo',
    references: REFERENCES.map(r => r.split('/')[0]),
    fonts: [FONTS.sans, FONTS.mono],
    colors: [palette.background, palette.surface, palette.text, palette.data, palette.brand],
  }
  writeFileSync('public/pro/ai-example.json', JSON.stringify(example, null, 2) + '\n')
  console.log(JSON.stringify(example))
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })
