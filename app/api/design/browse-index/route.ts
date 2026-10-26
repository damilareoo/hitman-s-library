import { NextResponse } from 'next/server'
import { queryBrowseIndex } from '@/lib/design-queries'

export async function GET() {
  try {
    const sites = await queryBrowseIndex()
    return NextResponse.json(
      { sites },
      {
        headers: {
          // The library changes a few times a day; a stale minute is free and
          // keeps typing in the panel off the network entirely.
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    )
  } catch (error) {
    console.error('[browse-index] error:', error)
    return NextResponse.json({ sites: [] }, { status: 500 })
  }
}
