import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.toLowerCase().trim())
    // Remove trailing slash from pathname
    u.pathname = u.pathname.replace(/\/+$/, '') || '/'
    // Drop www.
    u.hostname = u.hostname.replace(/^www\./, '')
    // Use just origin + pathname (ignore query/hash)
    return u.origin + u.pathname
  } catch {
    return url.toLowerCase().trim()
  }
}

export async function POST() {
  try {
    const rows = await sql`
      SELECT id, source_url, screenshot_url, created_at
      FROM design_sources
      ORDER BY created_at DESC
    `

    // Group by normalized URL
    const groups = new Map<string, typeof rows>()
    for (const row of rows) {
      const key = normalizeUrl(row.source_url)
      const group = groups.get(key) ?? []
      group.push(row)
      groups.set(key, group)
    }

    // Collect IDs to delete: for each group with >1 entry, keep the best one
    // "Best" = has a screenshot, otherwise most recent
    const toDelete: number[] = []
    for (const group of groups.values()) {
      if (group.length <= 1) continue

      // Sort: entries with screenshot first, then by most recent
      const sorted = [...group].sort((a, b) => {
        if (a.screenshot_url && !b.screenshot_url) return -1
        if (!a.screenshot_url && b.screenshot_url) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // Keep first, delete the rest
      for (let i = 1; i < sorted.length; i++) {
        toDelete.push(sorted[i].id)
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    await sql`DELETE FROM design_sources WHERE id = ANY(${toDelete})`

    return NextResponse.json({ deleted: toDelete.length })
  } catch (error) {
    console.error('[deduplicate] error:', error)
    return NextResponse.json({ error: 'Failed to deduplicate' }, { status: 500 })
  }
}
