import { NextResponse } from 'next/server'
import { queryCategories } from '@/lib/design-queries'

export async function GET() {
  try {
    const categories = await queryCategories()
    return NextResponse.json({ categories }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('[categories] error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories', categories: [] }, { status: 500 })
  }
}
