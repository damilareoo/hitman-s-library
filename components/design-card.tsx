'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { getDomain } from '@/lib/get-domain'
import { EASE, DUR } from '@/lib/motion'

export interface Design {
  id: string
  url: string
  title: string
  industry: string
  thumbnail_url?: string
  fallback_thumbnail?: string | null
  colors: string[]
  typography: string[]
  layout: string
  quality: number
  tags: string[]
  architecture: string
  addedDate: string
  designStyle?: string
  complexity?: string
  useCase?: string
}

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.move, ease: EASE } },
}

interface DesignCardProps {
  design: Design
  index: number
  isSelected: boolean
  onClick: () => void
  onHover: () => void
  onTagClick: (tag: string) => void
  hasAnimated: boolean
}

export function DesignCard({ design, index, isSelected, onClick, onHover, onTagClick, hasAnimated }: DesignCardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(design.thumbnail_url ?? null)
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const domain = getDomain(design.url)

  function handleImgError() {
    if (design.fallback_thumbnail && imgSrc !== design.fallback_thumbnail) {
      setImgSrc(design.fallback_thumbnail)
      setImgStatus('loading')
    } else {
      setImgStatus('error')
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial={hasAnimated ? false : 'hidden'}
      animate="show"
      exit={{ opacity: 0, transition: { duration: DUR.exit } }}
      onClick={onClick}
      onHoverStart={onHover}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${design.title || getDomain(design.url)}`}
      style={{ contain: 'layout paint style' }}
      className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors " + (isSelected ? 'border-foreground/60' : 'border-edge hover:border-edge-strong')}
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden bg-muted aspect-[16/10]">
        {imgStatus === 'loading' && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {imgSrc && (
          <Image
            src={imgSrc}
            alt={design.title || domain}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={index < 3}
            loading={index < 3 ? undefined : index < 6 ? 'eager' : 'lazy'}
            onLoad={e => {
              const img = e.currentTarget as HTMLImageElement
              img.naturalWidth > 0 ? setImgStatus('loaded') : handleImgError()
            }}
            onError={handleImgError}
            className={"object-cover object-top transition-[opacity,transform] duration-[450ms] ease-[var(--ease-sig)] group-hover:scale-[1.015] " + (imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0')}
            unoptimized={!imgSrc.includes('vercel-storage.com')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-meta text-ink-4">{domain}</span>
          </div>
        )}

        {/* Hover scrim — subtle, not harsh */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.07] dark:group-hover:bg-black/[0.14] transition-colors duration-300 pointer-events-none" />

        {/* Visit link — revealed on hover */}
        <a
          href={design.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          aria-label={`Visit ${design.title || domain}`}
          className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-background/85 backdrop-blur-[6px] border border-edge-strong rounded-[4px] px-2 py-1 text-meta text-ink-2 hover:text-ink hover:border-foreground/40 hover:bg-background"
        >
          ↗
        </a>
      </div>

      {/* Metadata */}
      <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-2 border-t border-edge-faint">
        <div className="min-w-0">
          <p className="text-bodytext font-medium text-ink leading-snug line-clamp-1">
            {design.title}
          </p>
          <p className="text-meta text-ink-4 mt-0.5 truncate">{domain}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {design.colors.length > 0 ? (
            <div className="flex gap-[3px]">
              {design.colors.slice(0, 5).map((color, i) => (
                <div
                  key={i}
                  role="img"
                  aria-label={color}
                  className="w-4 h-4 rounded-full border border-black/[0.06] dark:border-white/[0.08]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          ) : <span />}
          {design.industry ? (
            <span className="text-micro text-ink-4 truncate shrink-0">{design.industry}</span>
          ) : design.tags[0] ? (
            <button
              onClick={e => { e.stopPropagation(); onTagClick(design.tags[0]) }}
              className="text-micro text-ink-4 hover:text-ink-3 truncate shrink-0 transition-colors"
            >
              {design.tags[0]}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
