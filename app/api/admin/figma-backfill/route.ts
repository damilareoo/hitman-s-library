import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getBrowser, captureFigmaLayers } from '@/lib/browser-extraction'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sources = await sql`SELECT id, source_url FROM design_sources WHERE id = ${id}`
  if (!sources.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { source_url } = sources[0]
  const browser = await getBrowser()
  if (!browser) return NextResponse.json({ error: 'Browser unavailable' }, { status: 500 })

  const page = await browser.newPage()
  try {
    await page.setBypassCSP(true)
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(source_url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 3000))

    const figmaCaptureUrl = await captureFigmaLayers(page, source_url)
    if (figmaCaptureUrl) {
      await sql`UPDATE design_sources SET figma_capture_url = ${figmaCaptureUrl} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true, figma_capture_url: figmaCaptureUrl })
  } catch (err) {
    console.error('[figma-backfill]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await page.close()
  }
}
