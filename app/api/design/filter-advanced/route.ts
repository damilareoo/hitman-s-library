import { NextRequest, NextResponse } from 'next/server'
import { queryDesigns, type SortBy } from '@/lib/design-queries'

const VALID_SORTS: SortBy[] = ['recent', 'oldest', 'name', 'quality']

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const sortParam = searchParams.get('sortBy') as SortBy | null
    const result = await queryDesigns({
      industries: searchParams.getAll('industry'),
      tags: searchParams.getAll('tag'),
      search: searchParams.get('search') ?? '',
      sortBy: sortParam && VALID_SORTS.includes(sortParam) ? sortParam : 'recent',
      limit: clampInt(searchParams.get('limit'), 32, 1, 100),
      offset: clampInt(searchParams.get('offset'), 0, 0, 100_000),
    })

    return NextResponse.json(result, {
      headers: {
        // Serve instantly from the edge, refresh in the background. The library
        // changes a few times a day, so a stale second costs nothing.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('[filter-advanced] error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load designs',
        designs: [],
        pagination: { total: 0, limit: 32, offset: 0, hasMore: false },
      },
      { status: 500 },
    )
  }
}
