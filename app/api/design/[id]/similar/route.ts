// app/api/design/[id]/similar/route.ts
// Visual neighbors (Phase 2): k nearest sites by cosine distance over the
// fused embedding, self excluded. Public read data — no auth change.
import { NextResponse } from 'next/server'
import { SIMILAR_ENABLED, querySimilar } from '@/lib/similarity'

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!SIMILAR_ENABLED) {
    return NextResponse.json({ error: 'Similar is disabled' }, { status: 404 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const k = clampInt(new URL(req.url).searchParams.get('k'), 12, 1, 24)

  try {
    const { site, neighbors } = await querySimilar(id, k)
    if (!site) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (neighbors.length === 0) {
      return NextResponse.json({ site, neighbors, note: 'No embeddings yet' })
    }
    return NextResponse.json(
      { site, neighbors },
      {
        headers: {
          // Neighbors change only when a site is added or re-embedded.
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      },
    )
  } catch (err) {
    console.error('[GET /api/design/[id]/similar]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
