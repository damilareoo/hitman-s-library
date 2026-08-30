// Uses the same driver as the app, so the project carries one Postgres client
// rather than two.
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

async function checkThumbnails() {
  try {
    const result = await sql`SELECT id, source_url, thumbnail_url FROM design_sources LIMIT 5`
    console.log('[v0] Current thumbnails in DB:')
    result.forEach(row => {
      console.log(`  ID ${row.id}: ${row.thumbnail_url ? 'HAS URL' : 'NULL'}`)
    })
  } catch (error) {
    console.error('[v0] Error:', error)
  }
}

checkThumbnails()
