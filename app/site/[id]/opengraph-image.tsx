import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getCardFacts, getCardSite, loadFace } from './data'
import { ShareCard } from './card'

export const runtime = 'nodejs'
export const alt = 'Design system breakdown — Hitman’s Library'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [site, facts, regular, semibold] = await Promise.all([
    getCardSite(id),
    getCardFacts(id),
    readFile(path.join(process.cwd(), 'app/site/[id]/card-font-400.ttf')),
    readFile(path.join(process.cwd(), 'app/site/[id]/card-font-600.ttf')),
  ])

  // The site's own heading face, so the card can show it rather than describe
  // it. Absent when the family is proprietary or not on Google Fonts.
  const headingFamily = site?.typography.find(t => t.role === 'heading')?.font_family ?? null
  const face = headingFamily ? await loadFace(headingFamily) : null

  const fonts: { name: string; data: ArrayBuffer | Buffer; weight: 400 | 600; style: 'normal' }[] = [
    { name: 'BDO Grotesk', data: regular, weight: 400, style: 'normal' },
    { name: 'BDO Grotesk', data: semibold, weight: 600, style: 'normal' },
  ]
  if (face) fonts.push({ name: 'Specimen', data: face, weight: 400, style: 'normal' as const })

  return new ImageResponse(
    site ? (
      <ShareCard site={site} facts={facts} specimen={Boolean(face)} />
    ) : (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f7f5',
          color: '#111111',
          fontSize: 48,
          fontFamily: 'BDO Grotesk',
        }}
      >
        Hitman’s Library
      </div>
    ),
    { ...size, fonts },
  )
}
