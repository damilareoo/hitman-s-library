#!/usr/bin/env bun
// scripts/render-ai-example.ts
//
// The before/after on the Pro page. One landing page, written twice: as a
// plain starter, and after an AI tool asked the library for goodside.studio
// and applied what came back. The "after" uses exactly the theme.css that
// get_tokens returns for the site (the same buildTokenFiles output), so the
// picture is the real result, not a mock-up.
//
//   bun scripts/render-ai-example.ts   → public/pro/ai-before.webp, ai-after.webp, ai-example.json
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { resolveSite } from '@/lib/read/resolve-site'
import { getSiteDetail } from '@/lib/read/site-detail'
import { buildTokenFiles } from '@/lib/tokens/files'

const SITE = 'goodside.studio'

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

async function main() {
  const resolved = await resolveSite(SITE)
  const detail = resolved ? await getSiteDetail(Number(resolved.id)) : null
  if (!detail) throw new Error(`${SITE} not found`)
  const theme = buildTokenFiles(detail).find(f => f.name === 'theme.css')!.content
  // Instrument Serif is on Google Fonts; Epicene Text is a commercial face, so
  // the browser shows its serif fallback, as it would in your project.
  const after = page(`${theme}
body{font-family:var(--font-body);background:var(--color-background);color:var(--color-text)}
nav{border-bottom:1px solid var(--color-text)}.logo{font-family:var(--font-heading);font-size:30px}.menu{font-size:13px;letter-spacing:.06em;text-transform:uppercase}
h1{font-family:var(--font-heading);font-weight:400;font-size:72px;line-height:1.02;letter-spacing:-.02em}p{color:var(--color-neutral-700)}
a{background:var(--color-text);color:var(--color-background)}.band{background:var(--color-accent);border:1px solid var(--color-neutral-200)}`,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap">')

  const b = await chromium.launch({ channel: 'chrome' })
  const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
  for (const [name, html] of [['before', before], ['after', after]] as const) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    const png = await p.screenshot()
    await sharp(png).resize({ width: 960 }).webp({ quality: 82 }).toFile(`public/pro/ai-${name}.webp`)
  }
  await b.close()
  const used = {
    site: SITE,
    fonts: [...new Set(detail.typography.map(t => t.font_family))],
    colors: detail.colors.map(c => c.hex_value).slice(0, 6),
  }
  writeFileSync('public/pro/ai-example.json', JSON.stringify(used, null, 2) + '\n')
  console.log(JSON.stringify(used))
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })
