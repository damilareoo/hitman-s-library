import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { sites } = await req.json()

    if (!Array.isArray(sites) || sites.length === 0) {
      return NextResponse.json(
        { error: 'Sites array required' },
        { status: 400 }
      )
    }

    console.log('[v0] Adding', sites.length, 'sites to database')

    const addedSites = []
    const errors = []

    for (const site of sites) {
      try {
        if (!site.url || !site.name) {
          errors.push(`Invalid site: missing url or name`)
          continue
        }

        // Normalize URL
        let url = site.url.trim()
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }

        // Validate URL
        try {
          new URL(url)
        } catch {
          errors.push(`Invalid URL format: ${url}`)
          continue
        }

        // Extract domain for default category
        const domain = new URL(url).hostname || url
        const industry = site.category || site.industry || 'Web'
        const tags = site.tags || ['mobbin', 'imported']

        // Check if site already exists
        const existingQuery = `
          SELECT id FROM design_library 
          WHERE source_url = $1 
          LIMIT 1
        `
        const existing = await sql(existingQuery, [url])

        if (existing.length > 0) {
          console.log('[v0] Site already exists:', url)
          continue
        }

        // Insert into database
        const query = `
          INSERT INTO design_library (
            source_url,
            source_name,
            industry,
            tags,
            metadata,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id, source_url, source_name, industry, created_at
        `

        const metadata = {
          description: site.description || '',
          source: 'mobbin',
          category: site.category || 'Web',
          domain: domain
        }

        const result = await sql(query, [
          url,
          site.name,
          industry,
          tags.join(','),
          JSON.stringify(metadata)
        ])

        if (result.length > 0) {
          addedSites.push(result[0])
          console.log('[v0] Added site:', site.name)
        }
      } catch (error) {
        errors.push(`Error adding site ${site.name}: ${error instanceof Error ? error.message : String(error)}`)
        console.error('[v0] Error adding site:', error)
      }
    }

    return NextResponse.json({
      success: true,
      added: addedSites.length,
      failed: errors.length,
      sites: addedSites,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
    })
  } catch (error) {
    console.error('[v0] Error in add-sites route:', error)
    return NextResponse.json(
      {
        error: 'Error adding sites to database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
