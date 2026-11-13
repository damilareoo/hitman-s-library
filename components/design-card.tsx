'use client'

import { isOwnMedia } from '@/lib/media'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { ArrowUpRight, Heart } from '@phosphor-icons/react'
import { getDomain } from '@/lib/get-domain'
import { UNSORTED } from '@/lib/categories'
import { DRIFT_ENABLED } from '@/lib/drift'
import { EASE, DUR } from '@/lib/motion'

export interface Design {
  id: string
  url: string
  title: string
  kind: string
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
  redesigned?: boolean
  motion_clip_url?: string | null
}

export const cardVariants = {
  hidden: { opacity: 0, transform: 'translateY(12px)' },
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
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onColorClick?: (hex: string) => void
}

export function DesignCard({ design, index, isSelected, onClick, onHover, onTagClick, hasAnimated, isFavorite = false, onToggleFavorite, onColorClick }: DesignCardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(design.thumbnail_url ?? null)
  // 'ssr': rendered on the server, shown as it streams in — never hidden
  // behind JavaScript. Only an image still loading once the page is
  // interactive switches to 'loading' and fades in.
  const [imgStatus, setImgStatus] = useState<'ssr' | 'loading' | 'loaded' | 'error'>('ssr')
  const imgRef = useRef<HTMLImageElement>(null)
  // Latched at mount: the gallery flips hasAnimated right after hydration,
  // which would strip the entrance mid-stagger and snap later cards in.
  const [cssEnter] = useState(!hasAnimated)
  // Hover clip (Phase 3): the <video> mounts only while hovered, so no clip
  // bytes load on first paint — the URL rides in the card data (~100 bytes)
  // and the network starts on hover. Honors reduced-motion by staying still.
  const [playing, setPlaying] = useState(false)
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const showClip = playing && !reduceMotion && Boolean(design.motion_clip_url)
  const domain = getDomain(design.url)
  const label = design.title || domain

  // Screenshots live in our own blob storage and are safe to run through the
  // image optimizer. A fallback og:image comes from whatever host the site is
  // on, and allowing those meant configuring the optimizer for every hostname
  // on the internet. Serve them as-is instead.
  const isOptimizable = isOwnMedia(imgSrc)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete) img.naturalWidth > 0 ? setImgStatus('loaded') : handleImgError()
    // A server-rendered image still streaming stays visible; hiding it to fade
    // back in would blink the first screen. Only client-mounted cards fade.
    else if (!cssEnter) setImgStatus(s => (s === 'ssr' ? 'loading' : s))
    // Mount only: later loads report through onLoad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // First paint enters with the CSS .card-enter animation, which runs from
      // the server HTML; waiting for JavaScript held the grid invisible for
      // seconds on a phone. Later cards crossfade in through motion.
      initial={hasAnimated ? { opacity: 0, transform: 'translateY(6px)' } : false}
      animate={hasAnimated ? { opacity: 1, transform: 'translateY(0px)' } : 'show'}
      transition={hasAnimated ? { duration: DUR.color, ease: EASE } : undefined}
      exit={{ opacity: 0, transition: { duration: DUR.exit } }}
      onHoverStart={() => { onHover(); if (design.motion_clip_url) setPlaying(true) }}
      onHoverEnd={() => setPlaying(false)}
      style={{ contain: 'layout paint style', ...(cssEnter ? { ['--i' as string]: Math.min(index, 31) } : null) }}
      // :active propagates from the title button, so pressing anywhere in the
      // card lights the border. A card is too large to scale — that reads as
      // cheap — so the press registers in the card's own language instead.
      className={
        (cssEnter ? 'card-enter ' : '') +
        'group relative flex flex-col rounded-[12px] overflow-hidden border cursor-pointer ' +
        'transition-[border-color,outline-color,outline-offset,background-color] duration-[var(--dur-1)] ease-[var(--ease-hover)] ' +
        // Selected, in the card system's own language: the card takes the
        // header tint, its border firms up, and a soft neutral halo hugs it
        // (an outline follows the radius, so the halo stays concentric).
        'outline outline-[3px] outline-offset-0 ' +
        // Keyboard focus anywhere in the card shows a ring in the accent.
        'has-[:focus-visible]:outline-[#E8A04A] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[3px] ' +
        (isSelected
          ? 'bg-foreground/[0.025] border-foreground/25 outline-foreground/[0.07]'
          : 'border-edge outline-transparent hover:border-edge-strong active:border-foreground/30')
      }
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden bg-muted aspect-[16/10]">
        {(imgStatus === 'loading' || imgStatus === 'ssr') && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {imgSrc && (
          <Image
            ref={imgRef}
            src={imgSrc}
            alt=""
            fill
            // Cards render at ~283px, so 320px covers DPR 2 with headroom and
            // the optimizer never serves wider than 640. The old breakpoints
            // (up to 25vw) asked for 3840px files for these slots.
            sizes="(max-width: 640px) 100vw, 320px"
            // Only the first two preload: on a phone that is the whole first
            // screen, and six full-size preloads (some from other sites,
            // unoptimised) starved the page of bandwidth. The rest of the
            // first rows load eagerly; everything below is lazy.
            priority={index < 2}
            loading={index < 6 ? undefined : 'lazy'}
            onLoad={e => {
              const img = e.currentTarget as HTMLImageElement
              img.naturalWidth > 0 ? setImgStatus('loaded') : handleImgError()
            }}
            onError={handleImgError}
            unoptimized={!isOptimizable}
            // Hover eases the screenshot in a touch; a press dims it for an instant.
            className={"hover-zoom object-cover object-top transition-[opacity,transform,filter] duration-300 ease-[var(--ease-sig)] group-active:brightness-[.94] group-active:duration-100 " + (imgStatus === 'loading' ? 'opacity-0' : 'opacity-100')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-meta text-ink-4">{domain}</span>
          </div>
        )}

        {/* Hover clip — mounted only while hovered, over the still. Muted,
            looping, inline: a card preview, not a video player. */}
        {showClip && (
          <video
            src={design.motion_clip_url!}
            className="absolute inset-0 w-full h-full object-cover object-top"
            muted
            loop
            playsInline
            autoPlay
            aria-hidden="true"
          />
        )}

        {/* Hover scrim — subtle, not harsh */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.04] dark:group-hover:bg-black/[0.1] transition-colors duration-200 pointer-events-none" />
        {DRIFT_ENABLED && design.redesigned && (
          <span className="absolute top-2 left-2 rounded-full border border-edge bg-background/90 px-2 py-0.5 text-micro text-ink-2 backdrop-blur-sm">
            Redesigned
          </span>
        )}
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
            {/* The title is often the domain, so this line would repeat it
                verbatim. On a phone it goes away for good; from sm up it keeps
                its box, because dropping it lifted the palette row and left
                the swatches ragged across a grid row. */}
            <p
              className={`text-meta text-ink-4 mt-0.5 truncate ${label.toLowerCase() === domain.toLowerCase() ? 'hidden sm:block' : ''}`}
              aria-hidden={label.toLowerCase() === domain.toLowerCase()}
            >
              {label.toLowerCase() === domain.toLowerCase() ? '\u00A0' : domain}
            </p>
          </div>

          {/* Always visible so it works on touch, where there is no hover. */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleFavorite() }}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Remove ${label} from favorites` : `Favorite ${label}`}
              title={isFavorite ? 'Favorited' : 'Favorite'}
              className="relative z-10 shrink-0 -mt-0.5 -mr-1 w-7 h-7 flex items-center justify-center rounded-[10px] text-ink-4 group-hover:text-ink-2 hover:!text-ink hover:bg-foreground/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 before:absolute before:-inset-2 before:content-['']"
            >
              <Heart className="w-3.5 h-3.5" weight={isFavorite ? 'fill' : 'bold'} />
            </button>
          )}
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
            className="relative z-10 shrink-0 -mt-0.5 -mr-1 w-7 h-7 flex items-center justify-center rounded-[10px] text-ink-4 group-hover:text-ink-2 hover:!text-ink hover:bg-foreground/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 before:absolute before:-inset-2 before:content-['']"
          >
            <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
          </a>
        </div>

        <div className="flex items-center justify-between gap-2">
          {design.colors.length > 0 ? (
            // Each dot is a door into that color's neighborhood. Out of the
            // tab order — 60 cards × 5 dots would bury keyboard users — but
            // still named, and the same action lives in the panel's Colors
            // tab at full touch size.
            <div className="flex gap-[3px] shrink-0">
              {design.colors.slice(0, 5).map((color, i) => (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  onClick={e => { e.stopPropagation(); onColorClick?.(color) }}
                  aria-label={`Find sites near ${color}`}
                  title={`Find sites near ${color}`}
                  // The ::before widens the touch target without growing the
                  // row; neighbors' targets overlap slightly, and the panel's
                  // Colors tab is the precise surface on a thumb.
                  className="relative before:absolute before:-inset-1 before:content-[''] w-4 h-4 rounded-full border border-black/[0.06] dark:border-white/[0.22] transition-transform duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:scale-[1.25] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          ) : (
            // No palette yet: five muted swatches in the row's own shape, so
            // the card keeps its anatomy instead of reading as a different
            // component. Real swatches replace them on the next extraction.
            <div
              aria-hidden="true"
              className="flex gap-[3px] shrink-0 animate-pulse"
            >
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full bg-muted border border-black/[0.06] dark:border-white/[0.22]"
                />
              ))}
            </div>
          )}
          {/* min-w-0, not shrink-0: a flex item that cannot shrink never
              reaches the width where truncate fires, so the label used to spill
              past the card and get sliced mid-word by overflow-hidden. */}
          {/* Unsorted renders no chip: to a visitor it reads as unfinished
              work, and the swatches carry the card without it. */}
          {design.kind && design.kind !== UNSORTED ? (
            <span className="text-micro text-ink-4 truncate min-w-0">{design.kind}</span>
          ) : design.kind === UNSORTED ? null : design.tags[0] ? (
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
