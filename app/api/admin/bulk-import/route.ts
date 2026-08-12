import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

const sql = neon(process.env.DATABASE_URL!)

interface MobbinSite {
  url: string
  name: string
  industry: string
}

const MOBBIN_SITES: MobbinSite[] = [
  // SaaS / Productivity
  { url: 'https://sana.ai',          name: 'Sana AI',       industry: 'SaaS / App' },
  { url: 'https://air.inc',          name: 'Air',            industry: 'SaaS / App' },
  { url: 'https://mixpanel.com',     name: 'Mixpanel',       industry: 'SaaS / App' },
  { url: 'https://remote.com',       name: 'Remote',         industry: 'SaaS / App' },
  { url: 'https://dovetail.com',     name: 'Dovetail',       industry: 'SaaS / App' },
  { url: 'https://coda.io',          name: 'Coda',           industry: 'SaaS / App' },
  { url: 'https://linear.app',       name: 'Linear',         industry: 'SaaS / App' },
  { url: 'https://gamma.app',        name: 'Gamma',          industry: 'SaaS / App' },
  { url: 'https://gitbook.com',      name: 'GitBook',        industry: 'SaaS / App' },
  { url: 'https://productboard.com', name: 'Productboard',   industry: 'SaaS / App' },
  { url: 'https://felt.com',         name: 'Felt',           industry: 'SaaS / App' },
  { url: 'https://fibery.io',        name: 'Fibery',         industry: 'SaaS / App' },
  // Fintech
  { url: 'https://mercury.com',      name: 'Mercury',        industry: 'Finance' },
  { url: 'https://wise.com',         name: 'Wise',           industry: 'Finance' },
  { url: 'https://monarchmoney.com', name: 'Monarch Money',  industry: 'Finance' },
  { url: 'https://waveapps.com',     name: 'Wave',           industry: 'Finance' },
  { url: 'https://airwallex.com',    name: 'Airwallex',      industry: 'Finance' },
  { url: 'https://stripe.com',       name: 'Stripe',         industry: 'Finance' },
  { url: 'https://revolut.com',      name: 'Revolut',        industry: 'Finance' },
  // Design / Creative
  { url: 'https://contra.com',       name: 'Contra',         industry: 'Design' },
  { url: 'https://canva.com',        name: 'Canva',          industry: 'Design' },
  { url: 'https://design.spotify.com', name: 'Spotify Design', industry: 'Design' },
  { url: 'https://mobbin.com',       name: 'Mobbin',         industry: 'Design' },
  // Dev Tools / AI
  { url: 'https://platform.openai.com', name: 'OpenAI Platform', industry: 'AI' },
]

function extractOgImage(html: string, baseUrl: string): string {
  const patterns = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) {
      const img = m[1].trim()
      if (img.startsWith('http')) return img
      if (img.startsWith('//')) return 'https:' + img
      if (img.startsWith('/')) {
        try { return new URL(baseUrl).origin + img } catch { return img }
      }
    }
  }
  return ''
}

function extractTitle(html: string, fallback: string): string {
  const og = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
  if (og?.[1]) return og[1].trim().slice(0, 120)
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (title?.[1]) return title[1].trim().replace(/\s*[|–—-].*$/, '').trim().slice(0, 120) || fallback
  return fallback
}

export async function GET() {
  return NextResponse.json({ sites: MOBBIN_SITES })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const dryRun = Boolean(body.dryRun)

  const results: { url: string; name: string; status: 'added' | 'skipped' | 'error'; detail?: string }[] = []

  for (const site of MOBBIN_SITES) {
    // Check for existing entry (normalise trailing slash)
    const normalized = site.url.replace(/\/$/, '')
    const existing = await sql`
      SELECT id FROM design_sources
      WHERE source_url = ${normalized}
         OR source_url = ${normalized + '/'}
         OR source_url ILIKE ${normalized.replace('https://', 'http://')}
      LIMIT 1
    `.catch(() => [])

    if (existing.length > 0) {
      results.push({ url: site.url, name: site.name, status: 'skipped', detail: 'already exists' })
      continue
    }

    if (dryRun) {
      results.push({ url: site.url, name: site.name, status: 'added', detail: 'dry run' })
      continue
    }

    // Fetch HTML to get OG image + real title
    let ogImage = ''
    let resolvedName = site.name
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 7000)
      const res = await fetch(site.url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          Accept: 'text/html',
        },
      })
      clearTimeout(timer)
      if (res.ok) {
        const html = await res.text()
        ogImage = extractOgImage(html, site.url)
        resolvedName = extractTitle(html, site.name)
      }
    } catch {
      // proceed with fallback name, no thumbnail
    }

    try {
      const inserted = await sql`
        INSERT INTO design_sources (
          source_url, source_name, source_type, industry,
          metadata, tags, thumbnail_url, screenshot_url,
          created_at, analyzed_at
        ) VALUES (
          ${normalized},
          ${resolvedName},
          ${'website'},
          ${site.industry},
          ${JSON.stringify({ description: '', quality: 1, layout: 'standard', architecture: 'web', source: 'mobbin' })},
          ${['mobbin']},
          ${ogImage || null},
          ${ogImage || null},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      const sourceId = inserted[0]?.id
      if (sourceId) {
        await sql`
          INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
          VALUES (${sourceId}, ${normalized}, ${resolvedName}, 'added')
        `.catch(() => null)
      }
      results.push({ url: site.url, name: resolvedName, status: 'added' })
    } catch (err: any) {
      results.push({ url: site.url, name: site.name, status: 'error', detail: err?.message ?? 'insert failed' })
    }
  }

  const added = results.filter(r => r.status === 'added').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({ added, skipped, errors, results })
}
