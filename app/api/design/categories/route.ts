import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Advanced categorization system with multiple dimensions
const CATEGORIES = {
  industry: [
    'SaaS',
    'E-commerce',
    'FinTech',
    'HealthTech',
    'Media',
    'Design',
    'Agency',
    'Education',
    'Travel',
    'Food',
    'Fashion',
    'Real Estate',
    'Crypto',
    'B2B',
    'B2C',
    'Other'
  ],
  designStyle: [
    'Minimalist',
    'Modern',
    'Bold',
    'Playful',
    'Professional',
    'Creative',
    'Corporate',
    'Artistic',
    'Brutalist',
    'Gradient-Heavy',
    'Monochromatic',
    'Colorful'
  ],
  layoutType: [
    'Single Column',
    'Two Column',
    'Three+ Column',
    'Asymmetric',
    'Hero-Focused',
    'Card-Based',
    'List-Based',
    'Masonry',
    'Grid',
    'Sidebar Layout'
  ],
  colorPalette: [
    'Neutral',
    'Blue',
    'Green',
    'Purple',
    'Red',
    'Orange',
    'Mixed',
    'Monochrome',
    'Pastel',
    'Vibrant'
  ],
  complexity: [
    'Simple',
    'Moderate',
    'Complex'
  ],
  useCase: [
    'Landing Page',
    'Dashboard',
    'E-commerce Product',
    'Blog',
    'Portfolio',
    'SaaS App',
    'Mobile App',
    'Admin Panel',
    'Documentation',
    'Marketing Site'
  ],
  animationStyle: [
    'None',
    'Subtle',
    'Moderate',
    'Heavy',
    'Playful',
    'Smooth'
  ],
  accessibility: [
    'High Contrast',
    'WCAG AA',
    'WCAG AAA',
    'Keyboard Friendly'
  ]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryType = searchParams.get('type')

    // Return category options
    if (categoryType && categoryType in CATEGORIES) {
      return NextResponse.json({
        category: categoryType,
        options: CATEGORIES[categoryType as keyof typeof CATEGORIES]
      })
    }

    // Return all categories
    return NextResponse.json(CATEGORIES)
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
