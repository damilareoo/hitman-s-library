import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Core Design Storage API - NO AI DEPENDENCY
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === "save-design") {
      // Save design reference with manual analysis
      const { sourceUrl, industry, styleCategory, tags, qualityScore, colorPalette, typography, layoutNotes } = data

      // Get or create industry
      let industryId = null
      if (industry) {
        const industryResult = await sql(
          `SELECT id FROM design_industries WHERE industry_name = $1`,
          [industry]
        )
        if (industryResult.length > 0) {
          industryId = industryResult[0].id
        }
      }

      // Save to design_sources
      const sourceResult = await sql(
        `INSERT INTO design_sources (
          url, source_type, industry_id, 
          analyzed_content, quality_score, tags, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id`,
        [
          sourceUrl,
          "url",
          industryId || 1,
          JSON.stringify({
            colors: colorPalette,
            typography,
            layout: layoutNotes,
            style: styleCategory,
          }),
          qualityScore || 7,
          tags || "",
        ]
      )

      const sourceId = sourceResult[0].id

      // Save colors if provided
      if (colorPalette) {
        const colors = colorPalette.split(",").map((c) => c.trim())
        await sql(
          `INSERT INTO design_colors (
            source_id, primary_color, palette_name, contrast_score, accessibility_compliant
          ) VALUES ($1, $2, $3, $4, $5)`,
          [sourceId, colors[0] || "#000000", `Palette-${sourceId}`, 8.5, true]
        )
      }

      // Save typography if provided
      if (typography) {
        await sql(
          `INSERT INTO design_typography (
            source_id, font_family, line_height, letter_spacing, usage_context
          ) VALUES ($1, $2, $3, $4, $5)`,
          [sourceId, typography, 1.5, 0, "Design reference"]
        )
      }

      return NextResponse.json({
        success: true,
        message: "Design saved successfully",
        data: { sourceId, url: sourceUrl, industry, quality: qualityScore },
      })
    }

    if (action === "get-designs") {
      // Retrieve designs by industry
      const { industry, limit = 10 } = data

      const results = await sql(
        `SELECT 
          ds.id, ds.url, ds.analyzed_content, ds.quality_score, ds.tags,
          di.industry_name,
          COUNT(DISTINCT dc.id) as color_count,
          COUNT(DISTINCT dt.id) as typography_count
        FROM design_sources ds
        LEFT JOIN design_industries di ON ds.industry_id = di.id
        LEFT JOIN design_colors dc ON ds.id = dc.source_id
        LEFT JOIN design_typography dt ON ds.id = dt.source_id
        WHERE di.industry_name ILIKE $1 OR $1 IS NULL
        GROUP BY ds.id, di.id
        ORDER BY ds.quality_score DESC
        LIMIT $2`,
        [industry ? `%${industry}%` : null, limit]
      )

      return NextResponse.json({
        success: true,
        data: results,
        count: results.length,
      })
    }

    if (action === "get-industries") {
      const industries = await sql(`SELECT * FROM design_industries ORDER BY industry_name`)
      return NextResponse.json({
        success: true,
        data: industries,
      })
    }

    if (action === "list-all") {
      // Get all designs with summary
      const designs = await sql(
        `SELECT 
          ds.id, ds.url, ds.quality_score, ds.tags,
          di.industry_name,
          ds.analyzed_content
        FROM design_sources ds
        LEFT JOIN design_industries di ON ds.industry_id = di.id
        ORDER BY ds.quality_score DESC, ds.analyzed_at DESC
        LIMIT 50`
      )

      return NextResponse.json({
        success: true,
        data: designs,
        total: designs.length,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown action",
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("Design API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Database operation failed",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")

    if (action === "industries") {
      const industries = await sql(`SELECT * FROM design_industries ORDER BY industry_name`)
      return NextResponse.json({
        success: true,
        data: industries,
      })
    }

    if (action === "list") {
      const designs = await sql(
        `SELECT 
          ds.id, ds.url, ds.quality_score, ds.tags,
          di.industry_name
        FROM design_sources ds
        LEFT JOIN design_industries di ON ds.industry_id = di.id
        ORDER BY ds.quality_score DESC
        LIMIT 50`
      )
      return NextResponse.json({
        success: true,
        data: designs,
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action",
    })
  } catch (error) {
    console.error("Design API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 }
    )
  }
}
