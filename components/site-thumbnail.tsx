'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

interface SiteThumbnailProps {
  url: string
  alt: string
  className?: string
}

export function SiteThumbnail({ url, alt, className }: SiteThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function fetchOgImage() {
      try {
        const res = await fetch(`/api/og-image?url=${encodeURIComponent(url)}`)
        const data = await res.json()

        if (cancelled) return

        if (data.imageUrl) {
          setImageUrl(data.imageUrl)
        } else {
          // No OG image found, use thum.io as fallback
          setImageUrl(`https://image.thum.io/get/width/600/crop/400/noanimate/${url}`)
        }
      } catch {
        if (cancelled) return
        // On error, use thum.io as fallback
        setImageUrl(`https://image.thum.io/get/width/600/crop/400/noanimate/${url}`)
      }
    }

    fetchOgImage()
    return () => { cancelled = true }
  }, [url])

  return (
    <motion.div
      className={cn('relative w-full aspect-video bg-muted overflow-hidden', className)}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Loading shimmer */}
      {status === 'loading' && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className={cn(
            'w-full h-full object-cover object-top transition-all duration-500',
            status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
          )}
          loading="lazy"
          onLoad={() => setStatus('loaded')}
          onError={() => {
            if (status !== 'error') {
              setStatus('error')
              // If OG image fails, try thum.io; if thum.io fails, stay on error
              if (!imageUrl.includes('thum.io')) {
                setImageUrl(`https://image.thum.io/get/width/600/crop/400/noanimate/${url}`)
                setStatus('loading')
              }
            }
          }}
        />
      )}

      {/* Error state - just show a muted background, no text */}
      {status === 'error' && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-muted-foreground/10" />
        </div>
      )}
    </motion.div>
  )
}
