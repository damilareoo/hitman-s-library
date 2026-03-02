'use client'

import { useState } from 'react'
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebsitePreviewProps {
  url: string
  colors?: { primary?: string; secondary?: string; accent?: string }
  className?: string
}

export function WebsitePreview({ url, colors, className }: WebsitePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageKey, setImageKey] = useState(0)

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // Retry loading image
  const retryImage = () => {
    setIsLoading(true)
    setHasError(false)
    setImageKey(prev => prev + 1)
  }

  // Fallback to empty state if preview fails
  if (hasError || !url) {
    return (
      <div
        className={cn(
          'relative w-full aspect-[4/3] sm:aspect-video md:aspect-[5/4] rounded-lg overflow-hidden',
          'bg-muted border border-border/40 flex flex-col items-center justify-center p-3 sm:p-4',
          'animate-content-fade',
          className
        )}
      >
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Unable to load preview</p>
          {hasError && (
            <button
              onClick={retryImage}
              className={cn(
                'flex items-center gap-1 text-xs px-3 py-1.5 rounded-md',
                'bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200',
                'hover:scale-105 active:scale-95'
              )}
              aria-label="Retry loading preview"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-full aspect-[4/3] sm:aspect-video md:aspect-[5/4] rounded-lg overflow-hidden',
        'bg-muted border border-border/40',
        'group cursor-pointer transition-all duration-300 hover:border-primary/50',
        'animate-content-fade',
        className
      )}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-20">
          <div className="text-center space-y-2">
            <Loader2 className="h-5 w-5 animate-spin-fast text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      )}

      {/* Website hero section screenshot */}
      <img
        key={imageKey}
        src={`https://urlbox.io/render/${encodeURIComponent(url)}?width=1366&height=768&format=jpg&quality=90&retina=false`}
        alt={`Website hero preview for ${url}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          'group-hover:scale-105',
          isLoading && 'opacity-0'
        )}
      />

      {/* Interactive overlay with site link */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent',
          'opacity-0 group-hover:opacity-100 transition-all duration-300',
          'flex flex-col items-center justify-center gap-2',
          'backdrop-blur-sm'
        )}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'p-2.5 rounded-full bg-white/95 text-black shadow-lg',
            'hover:bg-white hover:scale-110 hover:shadow-xl',
            'transition-all duration-200',
            'active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
          aria-label={`Visit ${url}`}
          title={`Visit ${url}`}
        >
          <ExternalLink className="h-5 w-5" />
        </a>
        <p className="text-xs text-white/80 font-medium text-center px-2">Visit Site</p>
      </div>
    </div>
  )
}
