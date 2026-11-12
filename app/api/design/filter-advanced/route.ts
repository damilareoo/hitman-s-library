import { NextRequest, NextResponse } from 'next/server'
import { queryDesigns } from '@/lib/design-queries'
import { parseListQuery } from '@/lib/edge/fast-path'

export async function GET(req: NextRequest) {
  try {
    const result = await queryDesigns(parseListQuery(new URL(req.url).searchParams))

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
