import { createPool } from '@neondatabase/serverless'

const pool = createPool({
  connectionString: process.env.DATABASE_URL,
})

async function generateThumbnails() {
  try {
    console.log('[v0] Starting thumbnail generation...')

    // Get all designs without thumbnails
    const result = await pool.query(
      `SELECT id, source_url FROM design_sources WHERE thumbnail_url IS NULL OR thumbnail_url = '' LIMIT 50`
    )

    const designs = result.rows
    console.log(`[v0] Found ${designs.length} designs without thumbnails`)

    if (designs.length === 0) {
      console.log('[v0] All designs have thumbnails!')
      return
    }

    // Generate thumbnail URL using screenshot service
    for (const design of designs) {
      try {
        // Using screenshotone.com or similar service
        // Format: https://api.screenshotone.com/take?access_key=YOUR_KEY&url=WEBSITE_URL
        // For free alternatives, we can use:
        // - urlbox.io (requires auth)
        // - screenshot.rocks (no auth)
        // - apiflash.com (requires key)
        
        // Using a simple approach: construct a predictable screenshot URL
        const encodedUrl = encodeURIComponent(design.source_url)
        
        // Try multiple screenshot services in order of preference
        const thumbnailUrl = `https://screenshot.rocks/?url=${encodedUrl}&width=1366&height=768`
        
        // Update database with thumbnail URL
        await pool.query(
          `UPDATE design_sources SET thumbnail_url = $1 WHERE id = $2`,
          [thumbnailUrl, design.id]
        )

        console.log(`[v0] Generated thumbnail for design ${design.id}: ${design.source_url}`)
      } catch (error) {
        console.error(`[v0] Error generating thumbnail for design ${design.id}:`, error)
      }
    }

    console.log('[v0] Thumbnail generation complete!')
  } catch (error) {
    console.error('[v0] Error in generateThumbnails:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

generateThumbnails()
