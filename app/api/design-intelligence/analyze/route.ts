import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

// Handler for analyzing websites and extracting design patterns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, url, industry, analysisDepth = "detailed" } = body

    if (type === "analyze-url") {
      const response = await generateText({
        model: "openai/gpt-5",
        prompt: `Analyze the design of this website: ${url}

Please extract and describe:
1. Color Palette: Primary, secondary, accent colors with hex codes
2. Typography: Font families, sizes, line heights, weights used
3. Layout Patterns: Grid systems, spacing, component structures
4. Design Tokens: Border radius, shadows, transitions
5. Accessibility Features: Color contrast, keyboard navigation, ARIA attributes
6. Industry Context: ${industry || "Unknown"}
7. Design Language: Visual style (minimalist, bold, playful, etc.)
8. Component Patterns: Buttons, cards, navigation, forms, modals observed

Respond in JSON format with these keys:
{
  "colors": { "primary": "", "secondary": "", "accent": "", "palette": [] },
  "typography": { "headings": "", "body": "", "sizes": {} },
  "layout": { "grid": "", "spacing": "", "components": [] },
  "designTokens": {},
  "accessibility": [],
  "style": "",
  "patterns": [],
  "quality_score": 0,
  "tags": []
}`,
        temperature: 0.3,
        maxTokens: 2000,
      })

      return NextResponse.json({
        success: true,
        analysis: JSON.parse(response.text),
        sourceUrl: url,
      })
    }

    if (type === "extract-image") {
      const { imageUrl } = body

      const response = await generateText({
        model: "openai/gpt-5",
        prompt: `Analyze this design image: ${imageUrl}

Extract:
1. Color Palette (hex codes and names)
2. Typography (font styles visible)
3. Layout Structure (grid, spacing patterns)
4. Component Types (buttons, cards, forms, etc.)
5. Visual Style (design language)
6. Accessibility Features
7. Industry/Use Case (if apparent)

Respond in JSON format.`,
        temperature: 0.3,
        maxTokens: 1500,
      })

      return NextResponse.json({
        success: true,
        analysis: JSON.parse(response.text),
        imageUrl,
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown analysis type",
    })
  } catch (error) {
    console.error("Design analysis error:", error)
    
    // Handle AI Gateway verification error
    if (error instanceof Error && error.message.includes("customer_verification_required")) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Gateway requires account verification. Please add a credit card at https://vercel.com/~/ai?modal=add-credit-card",
          type: "verification_required",
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    )
  }
}
