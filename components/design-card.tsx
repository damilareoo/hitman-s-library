'use client'

import { useState } from 'react'
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
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
    <motion.article
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
      className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-1 " + (isSelected ? 'border-foreground/50' : 'border-border/60 hover:border-foreground/25')}
    >
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/50 z-10 pointer-events-none" />
      )}
      {/* Screenshot */}
      <div className="relative overflow-hidden bg-muted aspect-[16/10]">
        {imgStatus === 'loading' && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {imgSrc && (
          <img
            src={imgSrc}
            alt={design.title || domain}
            referrerPolicy="no-referrer"
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index < 3 ? 'high' : 'auto'}
            onLoad={e => (e.currentTarget.naturalWidth > 0 ? setImgStatus('loaded') : handleImgError())}
            onError={handleImgError}
            className={"w-full h-full object-cover object-top transition-[opacity,transform] duration-300 group-hover:scale-[1.03] " + (imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-mono text-muted-foreground/40">{domain}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />

        {/* Visit overlay button */}
        <a
          href={design.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border/50 rounded-[3px] px-2 py-1 text-[10px] font-mono text-foreground hover:border-foreground/50 hover:bg-background"
        >
          ↗
        </a>
      </div>

      {/* Metadata */}
      <div className="px-3.5 py-3.5 flex items-start justify-between gap-3 bg-background">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-foreground leading-snug line-clamp-1 tracking-[-0.02em]">
            {design.title}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/70 mt-0.5 truncate">{domain}</p>
          {design.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {design.tags.slice(0, 3).map(tag => (
                <button
                  key={tag}
                  onClick={e => { e.stopPropagation(); onTagClick(tag) }}
                  className="px-1.5 py-0.5 rounded-[2px] bg-muted text-[9px] font-mono text-muted-foreground/60 leading-none hover:bg-foreground hover:text-background transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {design.colors.length > 0 && (
          <div className="flex gap-1 shrink-0 mt-0.5">
            {design.colors.slice(0, 5).map((color, i) => (
              <div
                key={i}
                role="img"
                aria-label={color}
                className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  )
}
