import { NextRequest, NextResponse } from "next/server"
import {
  getDesignsByIndustry,
  getDesignContextForGeneration,
  getIndustries,
  searchDesignsByEmbedding,
} from "@/lib/design-library"

// Design retrieval and search API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, query, industry, style, limit = 5, minQuality = 7 } = body

    if (action === "search-by-industry") {
      const results = await getDesignsByIndustry(industry, limit)
      return NextResponse.json({
        success: true,
        results,
        count: results.length,
      })
    }

    if (action === "get-context") {
      const industries = await getIndustries()
      const targetIndustry = industries.find(
        (ind) => ind.industry_name.toLowerCase() === industry.toLowerCase()
      )

      if (!targetIndustry) {
        return NextResponse.json(
          {
            success: false,
            error: `Industry "${industry}" not found`,
          },
          { status: 404 }
        )
      }

      const context = await getDesignContextForGeneration(targetIndustry.id, style)
      return NextResponse.json({
        success: true,
        context,
        industry,
        style,
      })
    }

    if (action === "list-industries") {
      const industries = await getIndustries()
      return NextResponse.json({
        success: true,
        industries: industries.map((ind) => ({
          id: ind.id,
          name: ind.industry_name,
          description: ind.description,
        })),
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action",
    })
  } catch (error) {
    console.error("Design retrieval error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Retrieval failed",
      },
      { status: 500 }
    )
  }
}

// GET endpoint for browsing
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")

    if (action === "industries") {
      const industries = await getIndustries()
      return NextResponse.json({
        success: true,
        industries: industries.map((ind) => ({
          id: ind.id,
          name: ind.industry_name,
          description: ind.description,
        })),
      })
    }

    if (action === "get-by-industry") {
      const industry = searchParams.get("industry")
      if (!industry) {
        return NextResponse.json(
          {
            success: false,
            error: "Industry parameter required",
          },
          { status: 400 }
        )
      }

      const results = await getDesignsByIndustry(industry)
      return NextResponse.json({
        success: true,
        results,
        count: results.length,
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action",
    })
  } catch (error) {
    console.error("Design retrieval error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Retrieval failed",
      },
      { status: 500 }
    )
  }
}
