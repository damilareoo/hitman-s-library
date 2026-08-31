'use client'

import { MARK_SVG } from '@/components/mark'

/** Hands over the SVG source — what anyone pasting into Figma or code wants. */
export async function copyMarkSvg(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(MARK_SVG)
    return true
  } catch {
    return false
  }
}

/** The same string as a file, for the places a paste will not go. */
export function downloadMarkSvg() {
  const blob = new Blob([MARK_SVG], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hitmans-library-mark.svg'
  a.click()
  URL.revokeObjectURL(url)
}
