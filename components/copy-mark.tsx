'use client'

import { Check, Copy, DownloadSimple } from '@phosphor-icons/react'
import { Mark, MARK_SVG } from '@/components/mark'
import { useCopied } from '@/lib/use-copied'
import { useSoundsContext } from '@/contexts/sounds-context'

/**
 * The mark, and a way to take it.
 *
 * Copy hands over the SVG source, which is what anyone pasting it into Figma
 * or a codebase actually wants. Download is the same string as a file, for
 * the places a paste will not go.
 */
export function CopyMark() {
  const { copiedId, markCopied } = useCopied()
  const { playCopy } = useSoundsContext()

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(MARK_SVG)
      playCopy()
      markCopied('svg')
    } catch { /* clipboard unavailable */ }
  }

  function downloadSvg() {
    const blob = new Blob([MARK_SVG], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hitmans-library-mark.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-5">
      <div className="w-16 h-16 shrink-0 rounded-[10px] border border-edge grid place-items-center bg-muted/30">
        <Mark className="w-9 h-9 text-ink" title="The Hitman's Library mark" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={copySvg}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-[8px] border border-edge-strong text-meta text-ink-2 hover:text-ink hover:bg-muted active:scale-[0.98] transition-[background-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25"
        >
          {copiedId === 'svg'
            ? <><Check className="w-3.5 h-3.5" weight="bold" /> Copied</>
            : <><Copy className="w-3.5 h-3.5" weight="regular" /> Copy SVG</>}
        </button>

        <button
          onClick={downloadSvg}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-[8px] border border-transparent text-meta text-ink-4 hover:text-ink hover:bg-muted active:scale-[0.98] transition-[background-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25"
        >
          <DownloadSimple className="w-3.5 h-3.5" weight="regular" />
          Download
        </button>
      </div>
    </div>
  )
}
