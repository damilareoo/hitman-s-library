'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowSquareOut, CaretLeft, CaretRight } from '@phosphor-icons/react'

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
  const touchStartX = useRef(0)

  const current = designs[index]
  const domain = getDomain(current.url)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(current.url)}&picker=0`
  const progressPct = ((index + 1) / designs.length) * 100

  const go = useCallback((dir: number) => {
    setDirection(dir)
    setIndex(i => (i + dir + designs.length) % designs.length)
  }, [designs.length])

  useEffect(() => {
    setIframeLoaded(false)
    setProxyFailed(false)
  }, [index])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'proxy-failed') setProxyFailed(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-[#090909] flex flex-col select-none"
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const delta = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1)
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06] z-30 pointer-events-none">
        <motion.div
          className="h-full bg-white/20"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Floating controls — top right */}
      <motion.div
        className="absolute top-4 right-4 z-30 flex items-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.25 }}
      >
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-black/60 border border-white/[0.08] text-white/30 hover:text-white/80 hover:bg-black/80 hover:border-white/15 transition-colors backdrop-blur-sm"
          aria-label="Open in new tab"
        >
          <ArrowSquareOut className="w-3.5 h-3.5" weight="regular" />
        </a>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-black/60 border border-white/[0.08] text-white/30 hover:text-white/80 hover:bg-black/80 hover:border-white/15 transition-colors backdrop-blur-sm"
          aria-label="Close presentation mode"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      </motion.div>

      {/* Preview */}
      <div className="flex-1 relative min-h-0 group/preview">
        {/* Thumbnail shown instantly while iframe loads */}
        {!iframeLoaded && !proxyFailed && current.thumbnail_url && (
          <img
            src={current.thumbnail_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
            referrerPolicy="no-referrer"
          />
        )}
        {/* Subtle corner spinner */}
        {!iframeLoaded && !proxyFailed && (
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <div className="w-4 h-4 border border-white/[0.08] border-t-white/25 rounded-full animate-spin" />
          </div>
        )}

        {proxyFailed ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          >
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="space-y-2">
                <p className="text-[20px] font-mono text-white/35 tracking-tight">{domain}</p>
                {current.industry && (
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.12em]">{current.industry}</p>
                )}
              </div>
              {current.colors?.length > 0 && (
                <div className="flex gap-2">
                  {current.colors.slice(0, 5).map((hex, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              )}
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[11px] font-mono text-white/25 hover:text-white/60 border border-white/[0.07] hover:border-white/15 rounded-[3px] px-4 py-2 transition-colors"
              >
                Visit site ↗
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={current.url}
            src={proxyUrl}
            title={domain}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setProxyFailed(true)}
            sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
            className="absolute inset-0 w-full h-full border-0"
            style={{ opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.35s ease' }}
          />
        )}

        {/* Left nav zone — wide invisible target, arrow appears on hover */}
        <button
          onClick={() => go(-1)}
          className="absolute left-0 inset-y-0 w-14 md:w-20 z-20 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200"
          aria-label="Previous site"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-black/55 backdrop-blur-sm border border-white/[0.07] text-white/35 hover:text-white hover:bg-black/75 hover:border-white/15 transition-colors">
            <CaretLeft className="w-4 h-4" weight="bold" />
          </div>
        </button>

        {/* Right nav zone */}
        <button
          onClick={() => go(1)}
          className="absolute right-0 inset-y-0 w-14 md:w-20 z-20 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200"
          aria-label="Next site"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-black/55 backdrop-blur-sm border border-white/[0.07] text-white/35 hover:text-white hover:bg-black/75 hover:border-white/15 transition-colors">
            <CaretRight className="w-4 h-4" weight="bold" />
          </div>
        </button>
      </div>

      {/* Bottom HUD */}
      <div className="shrink-0 border-t border-white/[0.05]">
        <div className="h-[60px] flex items-center px-5 gap-3">

          <button
            onClick={() => go(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-white/[0.05] hover:bg-white/[0.1] text-white/30 hover:text-white/80 transition-colors shrink-0"
            aria-label="Previous site"
          >
            <CaretLeft className="w-3.5 h-3.5" weight="bold" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id + '-hud'}
              initial={{ opacity: 0, x: direction * 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -5 }}
              transition={{ duration: 0.14 }}
              className="flex items-center gap-4 min-w-0 flex-1"
            >
              {/* Domain + industry — left */}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-mono text-white/65 tracking-[-0.01em] truncate leading-none">{domain}</p>
                {current.industry && (
                  <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.1em] mt-[5px]">{current.industry}</p>
                )}
              </div>

              {/* Color swatches — center */}
              {current.colors?.length > 0 && (
                <div className="hidden sm:flex gap-1.5 shrink-0">
                  {current.colors.slice(0, 5).map((hex, i) => (
                    <div
                      key={i}
                      className="w-3.5 h-3.5 rounded-full border border-white/[0.12]"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              )}

              {/* Counter — right */}
              <span className="text-[10px] font-mono text-white/15 tabular-nums shrink-0">
                {index + 1} / {designs.length}
              </span>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() => go(1)}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] bg-white/[0.05] hover:bg-white/[0.1] text-white/30 hover:text-white/80 transition-colors shrink-0"
            aria-label="Next site"
          >
            <CaretRight className="w-3.5 h-3.5" weight="bold" />
          </button>

        </div>
      </div>
    </motion.div>
  )
}
