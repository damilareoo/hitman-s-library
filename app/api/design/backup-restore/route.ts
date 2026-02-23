import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Export all design links and metadata
 * Can be used for backup, migration, or fork scenarios
 */
export async function GET(req: NextRequest) {
  try {
    const query = `
      SELECT 
        id,
        source_url,
        source_name,
        industry,
        tags,
        metadata,
        created_at,
        backup_id
      FROM design_library
      ORDER BY created_at DESC
    `

    const designs = await sql(query)

    // Include backup information
    const backupQuery = `
      SELECT COUNT(*) as backup_count, MAX(created_at) as last_backup
      FROM design_library_backups
    `
    const backupInfo = await sql(backupQuery)

    return NextResponse.json({
      success: true,
      total: designs.length,
      designs,
      backup_info: backupInfo[0] || { backup_count: 0, last_backup: null },
      exported_at: new Date().toISOString(),
      version: '1.0'
    })
  } catch (error) {
    console.error('[v0] Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export designs', success: false },
      { status: 500 }
    )
  }
}

/**
 * Import design links from backup or migration
 * Used when restoring from backup or migrating between projects
 */
export async function POST(req: NextRequest) {
  try {
    const { designs, merge = false } = await req.json()

    if (!Array.isArray(designs) || designs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid import data' },
        { status: 400 }
      )
    }

    const imported = []
    const skipped = []
    const errors = []

    for (const design of designs) {
      try {
        if (!design.source_url || !design.source_name) {
          skipped.push(`Skipped: missing required fields`)
          continue
        }

        // Check if already exists (unless merge is true)
        const existing = await sql(
          'SELECT id FROM design_library WHERE source_url = $1 LIMIT 1',
          [design.source_url]
        )

        if (existing.length > 0) {
          if (!merge) {
            skipped.push(`${design.source_name} already exists`)
            continue
          }
        }

        // Insert design
        const result = await sql(
          `INSERT INTO design_library (
            source_url, source_name, industry, tags, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, source_url, source_name`,
          [
            design.source_url,
            design.source_name,
            design.industry || 'General',
            design.tags || [],
            design.metadata || {},
            design.created_at || new Date().toISOString()
          ]
        )

        if (result.length > 0) {
          imported.push(result[0])
        }
      } catch (error) {
        errors.push({
          design: design.source_name,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      imported_designs: imported,
      message: `Imported ${imported.length} designs, skipped ${skipped.length}`
    })
  } catch (error) {
    console.error('[v0] Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import designs', success: false },
      { status: 500 }
    )
  }
}
