// app/api/design/capture-element/route.ts
// Takes an outerHTML fragment, renders it in headless Chrome,
// runs Figma's capture.js, and returns a Vercel Blob URL.
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getBrowser } from '@/lib/browser-extraction'

export const maxDuration = 60

export async function POST(req: Request) {
  let body: { html: string; siteUrl: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { html, siteUrl } = body
  if (!html || !siteUrl) {
    return NextResponse.json({ error: 'Missing html or siteUrl' }, { status: 400 })
  }

  let origin: string
  try {
    const u = new URL(siteUrl)
    origin = `${u.protocol}//${u.host}`
  } catch {
    return NextResponse.json({ error: 'Invalid siteUrl' }, { status: 400 })
  }

  // Wrap the fragment in a minimal full page so capture.js has something to work with
  const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${origin}/">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: transparent; }
  </style>
</head>
<body>
${html}
</body>
</html>`

  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setBypassCSP(true)
    await page.setViewport({ width: 1440, height: 900 })
    await page.setContent(pageHtml, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 1500))

    // Intercept clipboard.write before capture.js fires it
    await page.evaluate(() => {
      (window as any).__figmaCapture = null
      navigator.clipboard.write = async (items: ClipboardItem[]) => {
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html')
            ;(window as any).__figmaCapture = await blob.text()
          }
        }
      }
    })

    await page.addScriptTag({
      url: 'https://mcp.figma.com/mcp/html-to-design/capture.js',
    })

    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => {
      window.location.hash = 'figmacapture&figmadelay=2000'
    })

    await page.waitForFunction('(window).__figmaCapture !== null', { timeout: 30000 })

    const figmaHtml = await page.evaluate('(window).__figmaCapture') as string
    if (!figmaHtml) {
      return NextResponse.json({ error: 'Capture produced no output' }, { status: 500 })
    }

    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const filename = `figma/element-${hostname}-${Date.now()}.html`
    const blob = await put(filename, figmaHtml, {
      access: 'public',
      contentType: 'text/html',
    })

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('[capture-element]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await page.close()
  }
}
