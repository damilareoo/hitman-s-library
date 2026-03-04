import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const runtime = 'edge'

// Normalize raw DB industry values into clean display names
function normalize(raw: string): string {
  const s = raw.trim()
  if (/^saas$/i.test(s)) return 'SaaS'
  if (/^fintech$/i.test(s)) return 'Fintech'
  if (/^e-commerce$/i.test(s)) return 'E-commerce'
  if (/^health(care|tech)?$/i.test(s)) return 'Healthcare'
  if (/^entertainment$/i.test(s)) return 'Entertainment'
  if (/^productivity$/i.test(s)) return 'Productivity'
  if (/^marketing$/i.test(s)) return 'Marketing'
  if (/^social\s*media$/i.test(s)) return 'Social Media'
  if (/^portfolio$/i.test(s)) return 'Portfolio'
  if (/^general$/i.test(s)) return 'General'
  if (/^uncategorized$/i.test(s)) return 'Uncategorized'
  if (/^code[\s/]+bugs$/i.test(s)) return 'Other'
  if (/^[a-z]$/.test(s)) return 'Other' // single letter junk
  // Capitalize first letter as fallback
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const DEPRIORITIZED = ['Uncategorized', 'General', 'Other']

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const rows = await sql`
      SELECT industry, COUNT(*) as count
      FROM design_sources
      GROUP BY industry
    `

    // Merge normalized duplicates
    const merged: Record<string, number> = {}
    for (const row of rows) {
      const key = normalize(row.industry || 'Other')
      merged[key] = (merged[key] || 0) + Number(row.count)
    }

    // Sort: real categories first by count, deprioritized last
    const categories = Object.entries(merged)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const aLow = DEPRIORITIZED.includes(a.name)
        const bLow = DEPRIORITIZED.includes(b.name)
        if (aLow !== bLow) return aLow ? 1 : -1
        return b.count - a.count
      })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
