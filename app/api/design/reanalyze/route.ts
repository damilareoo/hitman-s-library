import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceIds } = body

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: 'sourceIds array is required' },
        { status: 400 }
      )
    }

    // Get the designs to re-analyze
    const designs = await sql`
      SELECT id, source_url, source_name 
      FROM design_sources 
      WHERE id = ANY(${sourceIds}::int[])
    `

    console.log(`[v0] Re-extracting typography for ${designs.length} designs`)

    // For each design, trigger re-extraction by clearing typography data
    for (const design of designs) {
      try {
        // Clear old typography data
        await sql`
          DELETE FROM design_typography WHERE source_id = ${design.id}
        `

        // Mark for re-analysis
        await sql`
          UPDATE design_sources 
          SET analyzed_at = NULL, updated_at = NOW()
          WHERE id = ${design.id}
        `

        console.log(`[v0] Marked design ${design.id} for re-analysis`)
      } catch (err) {
        console.error(`[v0] Failed to prepare design ${design.id} for re-analysis:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${designs.length} designs for typography re-extraction`,
      designs: designs.length
    })
  } catch (error) {
    console.error('[v0] Re-analyze error:', error)
    return NextResponse.json(
      { error: 'Failed to re-analyze designs' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get all designs without typography data
    const designsNeedingAnalysis = await sql`
      SELECT COUNT(*) as count
      FROM design_sources ds
      LEFT JOIN design_typography dt ON ds.id = dt.source_id
      WHERE dt.source_id IS NULL AND ds.analyzed_at IS NOT NULL
    `

    return NextResponse.json({
      designsNeedingTypographyAnalysis: designsNeedingAnalysis[0]?.count || 0
    })
  } catch (error) {
    console.error('[v0] Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}
