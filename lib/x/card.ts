// lib/x/card.ts
// The daily post's image: the site's capture on a flat field of one of its
// own colours (the Hitman's Shots look). No text on the image. Pure; the
// script renders the HTML with a headless browser.
import { contrastRatio } from '@/lib/tokens/color'

export const CARD_W = 1600
export const CARD_H = 900
const DEEP = '#0d0d0c', LIGHT = '#f3f3f0'

/**
 * The field: the site's accent when it stands clear of the site's own
 * background (4.5:1), else whichever palette colour does, else ink or paper.
 * The capture's top edge sits on the field, so this keeps it legible.
 */
export function pickField(colors: { role: string; hex: string }[]): string {
  const bg = colors.find(c => c.role === 'background')?.hex ?? colors[0]?.hex ?? '#ffffff'
  const order = [...colors.filter(c => c.role === 'accent'), ...colors.filter(c => c.role !== 'accent' && c.hex !== bg)]
  const clear = order.find(c => contrastRatio(c.hex, bg) >= 4.5)
  if (clear) return clear.hex
  return contrastRatio(DEEP, bg) >= contrastRatio(LIGHT, bg) ? DEEP : LIGHT
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** The capture runs off the bottom edge rather than shrinking to fit. */
export function cardHtml(screenshotUrl: string, field: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;background:${attr(field)}}
.shot{position:absolute;left:192px;top:96px;width:1216px;height:${CARD_H}px;border-radius:14px 14px 0 0;overflow:hidden;background:#fff}
.shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
</style></head><body><div class="shot"><img src="${attr(screenshotUrl)}"></div></body></html>`
}
