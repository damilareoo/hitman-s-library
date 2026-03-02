'use client'

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebsitePreviewProps {
  url: string
  colors?: { primary?: string; secondary?: string; accent?: string }
  sourceNameContent?: string
  industryContent?: string
  className?: string
}

/**
 * Beautiful hero section preview using extracted design colors and typography
 * Displays a visual representation of the website's hero without external APIs
 */
export function WebsitePreview({ 
  url, 
  colors, 
  sourceNameContent = "Website Hero",
  industryContent = "Design",
  className 
}: WebsitePreviewProps) {
  const primaryColor = colors?.primary || '#3b82f6'
  const secondaryColor = colors?.secondary || '#e5e7eb'
  const accentColor = colors?.accent || '#10b981'

  return (
    <div
      className={cn(
        'relative w-full aspect-[4/3] sm:aspect-video md:aspect-[5/4] rounded-lg overflow-hidden',
        'border border-border/40 group cursor-pointer transition-all duration-300 hover:border-primary/50',
        'animate-content-fade',
        className
      )}
    >
      {/* Hero Section Background - Dynamic color layout */}
      <div className="w-full h-full flex relative">
        {/* Primary color section - 40% width */}
        <div 
          className="w-2/5 h-full transition-all duration-300"
          style={{ backgroundColor: primaryColor }}
        />
        
        {/* Secondary color section - 30% width */}
        <div 
          className="w-3/10 h-full transition-all duration-300"
          style={{ backgroundColor: secondaryColor }}
        />
        
        {/* Accent color section - 30% width */}
        <div 
          className="w-3/10 h-full transition-all duration-300"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Content Overlay - positioned bottom with gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 md:p-5">
        {/* Hero Text Content */}
        <div className="space-y-1 mb-auto" />
        
        {/* Bottom content area */}
        <div className="space-y-2">
          {/* Source name / headline */}
          <h3 className="text-white font-bold text-sm sm:text-base truncate line-clamp-2">
            {sourceNameContent}
          </h3>
          
          {/* Industry / subtitle */}
          <p className="text-white/70 text-xs sm:text-sm">
            {industryContent}
          </p>
        </div>
      </div>

      {/* Color indicator dots at bottom */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex gap-1.5">
        <div
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-1 ring-white/30 transition-transform hover:scale-125"
          style={{ backgroundColor: primaryColor }}
          title="Primary color"
        />
        <div
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-1 ring-white/30 transition-transform hover:scale-125"
          style={{ backgroundColor: secondaryColor }}
          title="Secondary color"
        />
        <div
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-1 ring-white/30 transition-transform hover:scale-125"
          style={{ backgroundColor: accentColor }}
          title="Accent color"
        />
      </div>

      {/* Interactive overlay with site link - appears on hover */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100',
          'transition-all duration-300 flex items-center justify-center',
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
            'transition-all duration-200 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
          aria-label={`Visit ${url}`}
          title={`Visit ${url}`}
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>
    </div>
  )
}
