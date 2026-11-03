// app/api/design/capture-upload/route.ts
//
// Receives captures taken on the user's own machine — the one renderer a bot
// wall admits — and files them on the row: Blob upload, palette measured off
// the desktop frame, metadata in the same shape the add route writes.
//
// A walled site cannot be captured from Vercel: the challenge never clears
// for a headless browser on a datacenter IP. scripts/capture-walled.ts rides
// real Chrome through the wall locally and POSTs the results here.
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { put } from '@vercel/blob'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { deduplicateColors, toColorFormats } from '@/lib/color-utils'
import { samplePalette } from '@/lib/palette-from-image'
import { recordExtraction } from '@/lib/extraction-history'
import { normalizeUrl } from '@/lib/normalize-url'

export const maxDuration = 60

const sql = getSql()
const MAX_FILE_BYTES = 4 * 1024 * 1024
const EXTERNAL_CAPTURE_REASON =
  'Cloudflare bot protection: captured by an external renderer — palette sampled from the capture'

async function readCapture(form: FormData, name: string): Promise<Buffer | null> {
  const file = form.get(name)
  if (!(file instanceof File) || file.size === 0) return null
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${name} capture is ${Math.round(file.size / 1024)}kb — over the 4MB limit`)
  }
  const buf = Buffer.from(await file.arrayBuffer())
  // The script sends JPEG only; anything else is a wrong caller.
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error(`${name} capture is not a JPEG`)
  }
  return buf
}

interface TypeRow {
  fontFamily: string
  role: 'heading' | 'body' | 'mono'
  googleFontsUrl: string | null
  primaryWeight: number
  sampleSizePx: number | null
  sampleLineHeight: string | null
}

function parseTypography(raw: string | null): TypeRow[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(t => t && typeof t.fontFamily === 'string' && ['heading', 'body', 'mono'].includes(t.role))
      .map(t => ({
        fontFamily: t.fontFamily,
        role: t.role,
        googleFontsUrl: typeof t.googleFontsUrl === 'string' ? t.googleFontsUrl : null,
        primaryWeight: Number.isFinite(Number(t.primaryWeight)) ? Number(t.primaryWeight) : 400,
        sampleSizePx: Number.isFinite(Number(t.sampleSizePx)) ? Number(t.sampleSizePx) : null,
        sampleLineHeight: typeof t.sampleLineHeight === 'string' ? t.sampleLineHeight : null,
      }))
  } catch {
    return []
  }
}

async function uploadCapture(buf: Buffer, name: string): Promise<string | null> {
  try {
    const blob = await put(`screenshots/${name}`, buf, {
      access: 'public',
      contentType: 'image/jpeg',
    })
    return blob.url
  } catch (err) {
    console.error('[capture-upload] blob upload failed:', err)
    return null
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const idRaw = String(form.get('id') ?? '').trim()
  const urlRaw = String(form.get('url') ?? '').trim()
  const id = idRaw ? Number(idRaw) : NaN

  let row: { id: number; source_url: string } | undefined
  if (Number.isInteger(id)) {
    ;[row] = await sql`SELECT id, source_url FROM design_sources WHERE id = ${id}` as any
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else if (urlRaw) {
    const normalized = normalizeUrl(urlRaw).split('?')[0]
    const rows = await sql`
      SELECT id, source_url FROM design_sources
      WHERE regexp_replace(
        regexp_replace(lower(split_part(source_url, '?', 1)), '^https?://(www\\.)?', ''),
        '/$',
        ''
      ) = ${normalized}
      LIMIT 1
    `
    row = rows[0] as { id: number; source_url: string } | undefined
    if (!row) return NextResponse.json({ error: 'No matching site in the library' }, { status: 404 })
  } else {
    return NextResponse.json({ error: 'Provide an id or url' }, { status: 400 })
  }

  let desktop: Buffer | null = null
  let mobile: Buffer | null = null
  try {
    desktop = await readCapture(form, 'desktop')
    mobile = await readCapture(form, 'mobile')
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bad capture file' }, { status: 400 })
  }
  if (!desktop && !mobile) {
    return NextResponse.json({ error: 'At least one capture (desktop or mobile) is required' }, { status: 400 })
  }

  const hostname = new URL(row.source_url).hostname.replace(/\./g, '-')
  const ts = Date.now()
  const typography = parseTypography(String(form.get('typography') ?? '').trim() || null)
  const desktopUrl = desktop ? await uploadCapture(desktop, `${hostname}-${ts}-local.jpg`) : null
  const mobileUrl = mobile ? await uploadCapture(mobile, `${hostname}-${ts}-local-mobile.jpg`) : null
  if (!desktopUrl && !mobileUrl) {
    return NextResponse.json({ error: 'Uploading the captures failed — nothing was filed' }, { status: 502 })
  }

  if (desktopUrl || mobileUrl) {
    await sql`
      UPDATE design_sources
      SET screenshot_url        = COALESCE(${desktopUrl ?? null}, screenshot_url),
          mobile_screenshot_url = COALESCE(${mobileUrl ?? null}, mobile_screenshot_url)
      WHERE id = ${row.id}
    `.catch(() => null)
  }

  // The palette is measured off the desktop frame; a palette without its
  // capture on the row would be evidence with nothing to point at.
  const palette = desktopUrl
    ? deduplicateColors(await samplePalette(desktop!))
        .map(c => toColorFormats(c))
        .filter((c): c is { hex: string; oklch: string } => c !== null)
        .slice(0, 16)
    : []
  if (palette.length > 0) {
    await sql`DELETE FROM design_colors WHERE source_id = ${row.id}`.catch(() => null)
    for (const color of palette) {
      await sql`
        INSERT INTO design_colors (source_id, hex_value, oklch)
        VALUES (${row.id}, ${color.hex}, ${color.oklch})
        ON CONFLICT DO NOTHING
      `.catch(() => null)
    }
  }

  // The walled site's type was never read server-side — only this machine can
  // see the page, so the script sends the honest read along. Same write shape
  // as re-extract: replace per role.
  if (typography.length > 0) {
    await sql`DELETE FROM design_typography WHERE source_id = ${row.id}`.catch(() => null)
    for (const t of typography) {
      await sql`
        INSERT INTO design_typography (source_id, font_family, role, google_fonts_url, primary_weight, sample_size_px, sample_line_height)
        VALUES (${row.id}, ${t.fontFamily}, ${t.role}, ${t.googleFontsUrl}, ${t.primaryWeight}, ${t.sampleSizePx}, ${t.sampleLineHeight})
        ON CONFLICT (source_id, role) DO UPDATE SET
          font_family = EXCLUDED.font_family,
          google_fonts_url = EXCLUDED.google_fonts_url,
          primary_weight = EXCLUDED.primary_weight,
          sample_size_px = EXCLUDED.sample_size_px,
          sample_line_height = EXCLUDED.sample_line_height
      `.catch(() => null)
    }
  }

  await sql`
    UPDATE design_sources
    SET metadata = COALESCE(metadata, '{}') || jsonb_build_object(
      'screenshot_source', 'external',
      'live_preview', false,
      'extraction_error', ${EXTERNAL_CAPTURE_REASON}::text
    )
    WHERE id = ${row.id}
  `.catch(() => null)

  {
    const [source] = await sql`SELECT source_url, source_name FROM design_sources WHERE id = ${row.id}`
    if (source) {
      await sql`
        INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
        VALUES (${row.id}, ${source.source_url}, ${source.source_name}, 'reextracted')
      `.catch(() => null)
    }
  }

  const [finalRow] = await sql`SELECT screenshot_url, mobile_screenshot_url FROM design_sources WHERE id = ${row.id}` as any
  const existingType = typography.length > 0
    ? typography
    : (await sql`
        SELECT font_family, role, google_fonts_url, primary_weight, sample_size_px, sample_line_height
        FROM design_typography WHERE source_id = ${row.id}
      `).map((t: any) => ({
        fontFamily: t.font_family,
        role: t.role,
        googleFontsUrl: t.google_fonts_url,
        primaryWeight: t.primary_weight,
        sampleSizePx: t.sample_size_px,
        sampleLineHeight: t.sample_line_height,
      }))
  await recordExtraction({
    siteId: row.id,
    screenshotUrl: finalRow?.screenshot_url ?? null,
    mobileScreenshotUrl: finalRow?.mobile_screenshot_url ?? null,
    palette,
    typography: existingType,
    assets: [],
  })

  revalidateTag('designs', 'max')

  return NextResponse.json({
    success: true,
    id: row.id,
    screenshot_url: finalRow?.screenshot_url ?? null,
    mobile_screenshot_url: finalRow?.mobile_screenshot_url ?? null,
    colors: palette.length,
    typography: typography.length,
  })
}
