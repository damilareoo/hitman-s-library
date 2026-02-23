import { NextRequest, NextResponse } from 'next/server'
import { detectIndustry } from '../extract/detectIndustry'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[v0] Processing file:', file.name, 'Size:', file.size)

    const buffer = await file.arrayBuffer()
    const designs = await parseExcel(buffer, file.name)

    console.log('[v0] Parsed designs from file:', designs.length, 'designs')

    if (designs.length === 0) {
      return NextResponse.json({
        error: 'No valid URLs found in file',
        designs: []
      }, { status: 200 })
    }

    // Extract design details for each URL sequentially with error handling
    const enrichedDesigns = []
    for (const design of designs) {
      try {
        console.log('[v0] Extracting design from:', design.url)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/design/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: design.url,
            industry: 'Auto-Detect', // Let the extract API auto-detect
            notes: design.notes || ''
          })
        })
        const extracted = await response.json()
        enrichedDesigns.push({ 
          ...design, 
          ...extracted,
          // Auto-categorize based on extracted metadata
          industry: detectIndustry(extracted.title || design.url, design.url, extracted.metadata || {})
        })
        console.log('[v0] Successfully extracted:', design.url, 'as', enrichedDesigns[enrichedDesigns.length - 1].industry)
      } catch (err) {
        console.error('[v0] Error extracting', design.url, ':', err)
        // Still add it with auto-detected industry
        enrichedDesigns.push({
          ...design,
          industry: detectIndustry(design.title || design.url, design.url, {})
        })
      }
    }

    console.log('[v0] Enriched', enrichedDesigns.length, 'designs')
    return NextResponse.json({ designs: enrichedDesigns })
  } catch (error) {
    console.error('[v0] Excel import error:', error)
    return NextResponse.json({
      error: 'Failed to import Excel file',
      designs: []
    }, { status: 200 })
  }
}

async function parseExcel(buffer: ArrayBuffer, fileName: string): Promise<any[]> {
  const designs: any[] = []

  try {
    // Try parsing as CSV first (works for both .csv and simple .xlsx saved as CSV)
    const text = new TextDecoder().decode(buffer)

    // Check if it's plain text/CSV
    if (fileName.endsWith('.csv') || (!text.includes('<?xml') && !text.includes('PK'))) {
      return parseCSV(text)
    }

    // Check if it's XLSX (binary zip format) - look for PK signature
    const view = new Uint8Array(buffer)
    const isPK = view[0] === 0x50 && view[1] === 0x4b // PK signature
    
    if (isPK || fileName.endsWith('.xlsx')) {
      console.log('[v0] Detected XLSX format')
      return await parseXLSXBinary(buffer)
    }

    // Try parsing as text (XML-based Excel or CSV)
    if (text.includes('<?xml') || text.includes('<')) {
      console.log('[v0] Detected XML format')
      return parseXMLExcel(text)
    }

    // Fallback to CSV parsing
    return parseCSV(text)
  } catch (err) {
    console.error('[v0] Parse error:', err)
    // Final fallback - try CSV
    try {
      const text = new TextDecoder().decode(buffer)
      return parseCSV(text)
    } catch {
      return []
    }
  }
}

function parseCSV(text: string): any[] {
  const designs: any[] = []
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

  // Skip header row if it looks like a header
  let startIdx = 0
  if (lines[0] && (lines[0].toLowerCase().includes('url') || lines[0].toLowerCase().includes('website'))) {
    startIdx = 1
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Try splitting by comma, then by tab
    const parts = line.includes('\t') ? line.split('\t') : line.split(',')
    const url = parts[0]?.trim()

    if (url && (url.startsWith('http') || url.includes('.'))) {
      designs.push({
        url,
        title: parts[1]?.trim() || '',
        industry: parts[2]?.trim() || 'Auto-Detect', // Will be auto-detected later
        quality: parseInt(parts[3]) || 7,
        notes: parts[5]?.trim() || '',
        tags: parts[4]?.split(';').map((t: string) => t.trim()) || []
      })
      console.log('[v0] Parsed URL:', url)
    }
  }

  return designs
}

function parseXMLExcel(text: string): any[] {
  const designs: any[] = []

  try {
    // Extract URLs from XML - look for cell values or common patterns
    const urlPattern = /(https?:\/\/[^\s<>"]+)/g
    const urls = text.match(urlPattern) || []

    urls.forEach(url => {
      if (url && url.length < 500) {
        designs.push({
          url: url.trim(),
          title: new URL(url).hostname,
          industry: 'Auto-Detect' // Will be auto-detected during extraction
        })
        console.log('[v0] Extracted URL from XML:', url)
      }
    })
  } catch (err) {
    console.error('[v0] XML parse error:', err)
  }

  return designs
}

async function parseXLSXBinary(buffer: ArrayBuffer): Promise<any[]> {
  // For XLSX binary files, we need the xlsx library
  // Since we can't easily add dependencies at runtime, we'll extract URLs from the binary data
  const designs: any[] = []

  try {
    const text = new TextDecoder().decode(buffer)
    // XLSX files contain XML with URLs - look for them
    const urlPattern = /(https?:\/\/[^\s<>"]+)/g
    const urls = text.match(urlPattern) || []

    const seen = new Set<string>()
    urls.forEach(url => {
      const cleanUrl = url.trim()
      if (cleanUrl && cleanUrl.length < 500 && !seen.has(cleanUrl) && (cleanUrl.startsWith('http') || cleanUrl.includes('.'))) {
        seen.add(cleanUrl)
        designs.push({
          url: cleanUrl,
          title: new URL(cleanUrl).hostname,
          industry: 'Uncategorized'
        })
        console.log('[v0] Extracted URL from XLSX:', cleanUrl)
      }
    })
  } catch (err) {
    console.error('[v0] XLSX binary parse error:', err)
  }

  return designs
}
