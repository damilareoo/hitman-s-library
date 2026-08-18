'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { ArrowUpRight } from '@phosphor-icons/react'
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
  const label = design.title || domain

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
      // First paint uses the parent's staggered reveal. After that a card is
      // only ever new because the result set changed, so it crossfades in on
      // its own rather than queueing behind 31 others.
      variants={cardVariants}
      initial={hasAnimated ? { opacity: 0, y: 6 } : 'hidden'}
      animate={hasAnimated ? { opacity: 1, y: 0 } : 'show'}
      transition={hasAnimated ? { duration: DUR.color, ease: EASE } : undefined}
      exit={{ opacity: 0, transition: { duration: DUR.exit } }}
      onHoverStart={onHover}
      style={{ contain: 'layout paint style' }}
      // :active propagates from the title button, so pressing anywhere in the
      // card lights the border. A card is too large to scale — that reads as
      // cheap — so the press registers in the card's own language instead.
      className={
        'group relative flex flex-col rounded-[4px] overflow-hidden border ' +
        'transition-colors duration-[var(--dur-2)] ease-[var(--ease-hover)] ' +
        (isSelected
          ? 'border-foreground/60'
          : 'border-edge hover:border-edge-strong active:border-foreground/40')
      }
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden bg-muted aspect-[16/10]">
        {imgStatus === 'loading' && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {imgSrc && (
          <Image
            src={imgSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1279px) 50vw, (max-width: 1535px) 33vw, 25vw"
            // The grid runs one to four columns, so six covers the first row at
            // every width and reaches into the second where the columns are
            // narrow enough for two rows to sit above the fold — that second
            // row is where the LCP image actually lands on a wide screen.
            // Beyond six the browser fetched images it then reported as unused,
            // so the rest load eagerly without the preload.
            priority={index < 6}
            loading={index < 12 ? undefined : 'lazy'}
            onLoad={e => {
              const img = e.currentTarget as HTMLImageElement
              img.naturalWidth > 0 ? setImgStatus('loaded') : handleImgError()
            }}
            onError={handleImgError}
            className={"hover-zoom object-cover object-top transition-[opacity,transform] duration-[450ms] ease-[var(--ease-sig)] " + (imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-meta text-ink-4">{domain}</span>
          </div>
        )}

        {/* Hover scrim — subtle, not harsh */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.07] dark:group-hover:bg-black/[0.14] transition-colors duration-300 pointer-events-none" />
      </div>

      {/* Metadata */}
      <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-2 border-t border-edge-faint">
        <div className="min-w-0 flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            {/* The whole card opens the panel; this button carries the accessible
                name and the click target, so there is no nested interactive. */}
            <button
              type="button"
              onClick={onClick}
              title={label}
              // Its hit area is the whole card, so scaling it would scale
              // nothing visible. The card border carries the press instead.
              data-no-press
              className="text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 rounded-[2px] after:absolute after:inset-0 after:content-['']"
            >
              {/* No `block` here — it and line-clamp-1 both set display, and
                  block won, so the clamp never applied and titles ran to 2+
                  lines. The full title stays on the button's title attribute. */}
              <span className="text-bodytext font-medium text-ink leading-snug line-clamp-1">
                {label}
              </span>
              <span className="sr-only">— open details</span>
            </button>
            <p className="text-meta text-ink-4 mt-0.5 truncate">{domain}</p>
          </div>

          {/* Always visible so it works on touch, where there is no hover. */}
          <a
            href={design.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            aria-label={`Visit ${label} (opens in a new tab)`}
            title={`Visit ${domain}`}
            // 28px is the visible target; the ::before takes the hit area out to
            // 44px without growing the hover fill or the focus ring. It stops
            // short of the screenshot above and the palette row below, so the
            // card's own click target loses nothing but the 8px gutter.
            className="relative z-10 shrink-0 -mt-0.5 -mr-1 w-7 h-7 flex items-center justify-center rounded-[4px] text-ink-4 hover:text-ink hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 before:absolute before:-inset-2 before:content-['']"
          >
            <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
          </a>
        </div>

        <div className="flex items-center justify-between gap-2">
          {design.colors.length > 0 ? (
            // One label for the row — five separate hex announcements per card
            // made the grid unusable with a screen reader.
            <div
              // The palette is the stronger signal, so it holds its width and
              // the label beside it gives way.
              className="flex gap-[3px] shrink-0"
              role="img"
              aria-label={`Palette: ${design.colors.slice(0, 5).join(', ')}`}
            >
              {design.colors.slice(0, 5).map((color, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  // A near-black swatch on the dark background needs a real
                  // ring to read as a swatch at all, so dark mode carries more
                  // than the hairline light mode wants.
                  className="w-4 h-4 rounded-full border border-black/[0.06] dark:border-white/[0.22]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          ) : (
            // Holds the swatch row's height so a card with no palette is not
            // 6px shorter than the cards beside it.
            <span className="h-4" />
          )}
          {/* min-w-0, not shrink-0: a flex item that cannot shrink never
              reaches the width where truncate fires, so the label used to spill
              past the card and get sliced mid-word by overflow-hidden. */}
          {design.industry ? (
            <span className="text-micro text-ink-4 truncate min-w-0">{design.industry}</span>
          ) : design.tags[0] ? (
            <button
              onClick={e => { e.stopPropagation(); onTagClick(design.tags[0]) }}
              aria-label={`Filter by tag ${design.tags[0]}`}
              // Padding grows the target, the matching negative margin gives
              // the space back to the layout, so nothing moves. A ::before
              // would be clipped here — truncate sets overflow: hidden.
              className="relative z-10 text-micro text-ink-4 hover:text-ink-3 truncate min-w-0 transition-colors px-2 -mx-2 py-4 -my-4"
            >
              {design.tags[0]}
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  )
}
