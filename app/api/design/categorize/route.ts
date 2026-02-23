import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Analyze and auto-categorize a design based on extracted data
export async function POST(req: NextRequest) {
  try {
    const { sourceId, metadata, colors, typography, patterns } = await req.json()

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
    }

    // Analyze metadata to determine categories
    const analysis = {
      designStyle: determineDesignStyle(metadata),
      layoutType: determineLayoutType(metadata),
      colorPalette: determineColorPalette(colors),
      complexity: determineComplexity(metadata, patterns),
      useCase: determineUseCase(metadata),
      animationStyle: determineAnimationStyle(metadata),
      accessibility: determineAccessibility(metadata)
    }

    // Store categorization in metadata
    const updatedMetadata = {
      ...metadata,
      ...analysis
    }

    // Update design_sources with enhanced metadata
    await sql`
      UPDATE design_sources 
      SET metadata = ${JSON.stringify(updatedMetadata)},
          updated_at = NOW()
      WHERE id = ${sourceId}
    `

    return NextResponse.json({
      sourceId,
      categorization: analysis,
      message: 'Design categorized successfully'
    })
  } catch (error) {
    console.error('Categorization error:', error)
    return NextResponse.json({ error: 'Failed to categorize design' }, { status: 500 })
  }
}

function determineDesignStyle(metadata: any): string {
  const text = JSON.stringify(metadata).toLowerCase()
  
  if (text.includes('minimal') || text.includes('clean')) return 'Minimalist'
  if (text.includes('bold') || text.includes('dark')) return 'Bold'
  if (text.includes('playful') || text.includes('fun')) return 'Playful'
  if (text.includes('gradient')) return 'Gradient-Heavy'
  if (text.includes('brutalism')) return 'Brutalist'
  if (text.includes('monochrom')) return 'Monochromatic'
  if (text.includes('colorful') || text.includes('vibrant')) return 'Colorful'
  if (text.includes('professional') || text.includes('corporate')) return 'Professional'
  if (text.includes('artistic') || text.includes('creative')) return 'Creative'
  
  return 'Modern'
}

function determineLayoutType(metadata: any): string {
  const text = JSON.stringify(metadata).toLowerCase()
  
  if (text.includes('single') || text.includes('column') && !text.includes('two') && !text.includes('three')) return 'Single Column'
  if (text.includes('two column') || text.includes('sidebar')) return 'Two Column'
  if (text.includes('three column') || text.includes('multi')) return 'Three+ Column'
  if (text.includes('asymmetric')) return 'Asymmetric'
  if (text.includes('hero')) return 'Hero-Focused'
  if (text.includes('card')) return 'Card-Based'
  if (text.includes('list')) return 'List-Based'
  if (text.includes('masonry')) return 'Masonry'
  if (text.includes('grid') && !text.includes('grid column')) return 'Grid'
  
  return 'Standard'
}

function determineColorPalette(colors: string[]): string {
  if (!colors || colors.length === 0) return 'Neutral'
  
  const colorsLower = colors.map(c => c.toLowerCase())
  
  // Count color dominance
  const hasBlue = colorsLower.some(c => c.includes('00') || c.includes('0066') || c.includes('3366'))
  const hasGreen = colorsLower.some(c => c.includes('00ff00') || c.includes('00aa00'))
  const hasPurple = colorsLower.some(c => c.includes('6600') || c.includes('9933'))
  const hasRed = colorsLower.some(c => c.includes('ff0000') || c.includes('cc0000'))
  const hasOrange = colorsLower.some(c => c.includes('ff6600') || c.includes('ff9900'))
  const hasWhite = colorsLower.some(c => c.includes('ffffff') || c.includes('fafafa'))
  const hasBlack = colorsLower.some(c => c.includes('000000') || c.includes('1a1a1a'))
  const hasGray = colorsLower.some(c => c.includes('aaa') || c.includes('999') || c.includes('666'))
  
  // Pastel detection
  const isPastel = colors.length > 0 && colors.every(c => {
    const hex = c.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return r > 200 && g > 200 && b > 200
  })
  
  if (isPastel) return 'Pastel'
  if (hasBlack && hasWhite) return 'Monochrome'
  if (hasGray && colors.length < 4) return 'Neutral'
  if (hasBlue && !hasRed && !hasGreen) return 'Blue'
  if (hasGreen && !hasRed && !hasBlue) return 'Green'
  if (hasPurple) return 'Purple'
  if (hasRed) return 'Red'
  if (hasOrange) return 'Orange'
  if (colors.length > 5) return 'Colorful'
  
  return 'Mixed'
}

function determineComplexity(metadata: any, patterns: any): string {
  const text = JSON.stringify(metadata).toLowerCase()
  const componentCount = patterns?.length || 0
  
  if (componentCount > 10 || text.includes('complex')) return 'Complex'
  if (componentCount > 5 || text.includes('moderate')) return 'Moderate'
  
  return 'Simple'
}

function determineUseCase(metadata: any): string {
  const text = JSON.stringify(metadata).toLowerCase()
  
  if (text.includes('landing')) return 'Landing Page'
  if (text.includes('dashboard')) return 'Dashboard'
  if (text.includes('product') || text.includes('ecommerce') || text.includes('shop')) return 'E-commerce Product'
  if (text.includes('blog') || text.includes('article')) return 'Blog'
  if (text.includes('portfolio')) return 'Portfolio'
  if (text.includes('saas') || text.includes('app')) return 'SaaS App'
  if (text.includes('mobile')) return 'Mobile App'
  if (text.includes('admin')) return 'Admin Panel'
  if (text.includes('doc') || text.includes('guide')) return 'Documentation'
  if (text.includes('market')) return 'Marketing Site'
  
  return 'General'
}

function determineAnimationStyle(metadata: any): string {
  const text = JSON.stringify(metadata).toLowerCase()
  
  if (text.includes('none') || text.includes('static')) return 'None'
  if (text.includes('playful') || text.includes('spring')) return 'Playful'
  if (text.includes('heavy') || text.includes('lots')) return 'Heavy'
  if (text.includes('moderate') || text.includes('medium')) return 'Moderate'
  if (text.includes('smooth') || text.includes('ease')) return 'Smooth'
  
  return 'Subtle'
}

function determineAccessibility(metadata: any): string[] {
  const text = JSON.stringify(metadata).toLowerCase()
  const accessibility: string[] = []
  
  if (text.includes('contrast') || text.includes('wcag')) accessibility.push('High Contrast')
  if (text.includes('wcag aa')) accessibility.push('WCAG AA')
  if (text.includes('wcag aaa')) accessibility.push('WCAG AAA')
  if (text.includes('keyboard')) accessibility.push('Keyboard Friendly')
  
  return accessibility.length > 0 ? accessibility : ['Standard']
}
