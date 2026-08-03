'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { getDomain } from '@/lib/get-domain'

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
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
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
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
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
      className={"group relative flex flex-col cursor-pointer rounded-[3px] overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-1 " + (isSelected ? 'border-foreground/40 shadow-[0_0_0_1px_var(--foreground)] shadow-foreground/10' : 'border-border/50 hover:border-foreground/20')}
    >
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/60 z-10 pointer-events-none" />
      )}

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
            className={"object-cover object-top transition-[opacity,transform] duration-500 group-hover:scale-[1.02] " + (imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0')}
            unoptimized={!imgSrc.includes('vercel-storage.com')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-mono text-muted-foreground/30">{domain}</span>
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
          className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-background/85 backdrop-blur-[6px] border border-border/60 rounded-[3px] px-2 py-1 text-[10px] font-mono text-foreground/70 hover:text-foreground hover:border-foreground/40 hover:bg-background"
        >
          ↗
        </a>
      </div>

      {/* Metadata */}
      <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-2 border-t border-border/40">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-1 tracking-[-0.025em]">
            {design.title}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/40 mt-0.5 truncate">{domain}</p>
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
            <span className="text-[9.5px] font-mono text-muted-foreground/30 truncate shrink-0 uppercase tracking-[0.06em]">{design.industry}</span>
          ) : design.tags[0] ? (
            <button
              onClick={e => { e.stopPropagation(); onTagClick(design.tags[0]) }}
              className="text-[9.5px] font-mono text-muted-foreground/30 hover:text-muted-foreground truncate shrink-0 transition-colors uppercase tracking-[0.06em]"
            >
              {design.tags[0]}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
