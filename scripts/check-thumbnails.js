import { sql } from '@vercel/postgres'

async function checkThumbnails() {
  try {
    const result = await sql`SELECT id, source_url, thumbnail_url FROM design_sources LIMIT 5`
    console.log('[v0] Current thumbnails in DB:')
    result.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.thumbnail_url ? 'HAS URL' : 'NULL'}`)
    })
  } catch (error) {
    console.error('[v0] Error:', error)
  }
}

checkThumbnails()
