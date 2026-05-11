'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowLeft, ArrowRight, ArrowSquareOut } from '@phosphor-icons/react'

interface Design {
  id: string
  url: string
  title: string
  thumbnail_url?: string
  colors: string[]
  tags: string[]
  industry: string
}

interface PresentationModeProps {
  designs: Design[]
  initialIndex: number
  onClose: () => void
  onSelect: (design: Design) => void
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

export function PresentationMode({ designs, initialIndex, onClose, onSelect }: PresentationModeProps) {
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)

  const current = designs[index]
  const domain = getDomain(current.url)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(current.url)}&picker=0`

  const go = useCallback((dir: number) => {
    setDirection(dir)
    setIndex(i => (i + dir + designs.length) % designs.length)
  }, [designs.length])

  // Reset iframe state on navigation
  useEffect(() => {
    setIframeLoaded(false)
    setProxyFailed(false)
  }, [index])

  // Listen for proxy failure postMessage from iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'proxy-failed') setProxyFailed(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'Escape') onClose()
      else if (e.key === 'Enter') { onSelect(current); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose, onSelect, current])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 bg-[#0c0c0c] flex flex-col"
    >
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 h-10 border-b border-white/[0.06] select-none">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-white/20 tabular-nums shrink-0">
            {index + 1} / {designs.length}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={current.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="text-[12px] text-white/40 truncate"
            >
              {domain}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono text-white/15 mr-2 hidden sm:block">
            ←→ navigate · Enter inspect · Esc close
          </span>
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-white/10 text-white/25 hover:text-white/70 hover:border-white/20 transition-colors"
            aria-label="Open in new tab"
          >
            <ArrowSquareOut className="w-3 h-3" weight="regular" />
          </a>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-white/10 text-white/25 hover:text-white/70 hover:border-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-3 h-3" weight="bold" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 relative min-h-0">

        {/* Spinner — shown while loading, hidden once ready */}
        {!iframeLoaded && !proxyFailed && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-4 h-4 border border-white/10 border-t-white/35 rounded-full animate-spin" />
          </div>
        )}

        {proxyFailed ? (
          /* Screenshot fallback when proxy can't load the site */
          <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c0c]">
            {current.thumbnail_url ? (
              <img
                src={current.thumbnail_url}
                alt={domain}
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            ) : (
              <span className="text-[12px] font-mono text-white/15">{domain}</span>
            )}
          </div>
        ) : (
          <iframe
            key={current.url}
            src={proxyUrl}
            title={domain}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setProxyFailed(true)}
            className="absolute inset-0 w-full h-full border-0"
            style={{ opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
          />
        )}

        {/* Nav arrows — overlaid, backdrop-blurred so they're readable over any bg */}
        <button
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-white/40 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all backdrop-blur-md select-none"
          aria-label="Previous site"
        >
          <ArrowLeft className="w-4 h-4" weight="regular" />
        </button>
        <button
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-white/40 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all backdrop-blur-md select-none"
          aria-label="Next site"
        >
          <ArrowRight className="w-4 h-4" weight="regular" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 h-10 border-t border-white/[0.06] select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5 min-w-0 overflow-hidden"
          >
            {current.industry && (
              <span className="text-[9px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-[2px] shrink-0">
                {current.industry}
              </span>
            )}
            {current.tags?.slice(0, 4).map(tag => (
              <span key={tag} className="text-[9px] font-mono text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded-[2px] shrink-0 hidden sm:block">
                {tag}
              </span>
            ))}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex gap-1 shrink-0"
          >
            {current.colors?.slice(0, 8).map((hex, i) => (
              <div key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
