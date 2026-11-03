// components/share-menu.tsx
// The share surface for one site: the card, and the three ways people
// actually move it — copy the link, save the image, or hand it to the
// phone's own share sheet. Nothing else, because nothing else is used.
'use client'

import { useEffect, useRef, useState } from 'react'
import { ShareNetwork, Check, Copy, Download, ArrowSquareOut } from '@phosphor-icons/react'
import { useCopied } from '@/lib/use-copied'
import { useSoundsContext } from '@/contexts/sounds-context'
import posthog from 'posthog-js'

export function ShareMenu({
  siteId,
  siteTitle,
}: {
  siteId: number
  siteTitle: string
}) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { copiedId, markCopied } = useCopied()
  const sounds = useSoundsContext()

  const pageUrl = `${window.location.origin}/site/${siteId}`
  const cardUrl = `/site/${siteId}/opengraph-image`

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl)
      markCopied('link')
      sounds.playSuccess()
      posthog.capture('share_link_copied', { source_id: siteId })
    } catch { /* clipboard refused — the field below still shows the link */ }
  }

  async function downloadCard() {
    setDownloading(true)
    try {
      const res = await fetch(cardUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `hitmans-library-${siteId}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      sounds.playSuccess()
      posthog.capture('share_card_downloaded', { source_id: siteId })
    } finally {
      setDownloading(false)
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function nativeShare() {
    try {
      await navigator.share({ title: siteTitle, url: pageUrl })
      posthog.capture('share_sheet_opened', { source_id: siteId })
    } catch { /* dismissed */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(v => !v)
          if (!open) posthog.capture('share_menu_opened', { source_id: siteId })
        }}
        aria-expanded={open}
        aria-label="Share this site"
        title="Share"
        className="w-8 h-8 flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
      >
        <ShareNetwork className="w-4 h-4" weight="bold" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[268px] rounded-[10px] border border-edge-strong bg-card shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] p-2">
          <a
            href={cardUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-[6px] overflow-hidden border border-edge hover:border-edge-strong transition-colors"
            title="Open the card full size"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardUrl} alt={`Share card for ${siteTitle}`} width={1200} height={630} className="w-full h-auto block" />
          </a>

          <div className="flex items-center gap-1.5 mt-2">
            <input
              readOnly
              value={pageUrl}
              onFocus={e => e.currentTarget.select()}
              aria-label="Shareable link for this site"
              className="min-w-0 flex-1 h-8 px-2 text-micro bg-muted/60 border border-edge rounded-[6px] text-ink-2 focus:outline-none focus:border-foreground/30"
            />
            <button
              onClick={copyLink}
              className="shrink-0 h-8 px-2.5 rounded-[6px] bg-foreground text-background text-meta font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              {copiedId === 'link' ? <Check className="w-3.5 h-3.5" weight="bold" /> : <Copy className="w-3.5 h-3.5" weight="bold" />}
              {copiedId === 'link' ? 'Copied' : 'Copy'}
            </button>
          </div>

          <button
            onClick={downloadCard}
            disabled={downloading}
            className="mt-1.5 w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-left hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 shrink-0 text-ink-3" weight="bold" />
            <span className="text-bodytext text-ink">{downloading ? 'Rendering…' : 'Download card (PNG)'}</span>
          </button>

          {canNativeShare && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-left hover:bg-muted transition-colors"
            >
              <ArrowSquareOut className="w-4 h-4 shrink-0 text-ink-3" weight="bold" />
              <span className="text-bodytext text-ink">Share…</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
