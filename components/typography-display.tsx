'use client'

import { Copy, Check, ArrowSquareOut } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getFontSource, getFontTypeLabel, getFontTypeBadgeColor } from '@/lib/font-sources'

interface FontWithCategory {
  name: string
  category?: 'heading' | 'body' | 'mono'
}

interface TypographyDisplayProps {
  fonts?: (string | FontWithCategory)[]
  headingFonts?: (string | FontWithCategory)[]
  bodyFonts?: (string | FontWithCategory)[]
  monoFonts?: (string | FontWithCategory)[]
  onCopy?: (font: string) => void
  compact?: boolean
}

export function TypographyDisplay({ 
  fonts, 
  headingFonts, 
  bodyFonts, 
  monoFonts, 
  onCopy,
  compact = false 
}: TypographyDisplayProps) {
  const [copiedFont, setCopiedFont] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Normalize fonts to array of objects
  const normalizeFonts = (fontList?: (string | FontWithCategory)[]) => {
    if (!fontList) return []
    return fontList.map(f => typeof f === 'string' ? { name: f } : f)
  }

  const normalizedHeadingFonts = normalizeFonts(headingFonts)
  const normalizedBodyFonts = normalizeFonts(bodyFonts)
  const normalizedMonoFonts = normalizeFonts(monoFonts)
  const normalizedAllFonts = normalizeFonts(fonts)

  const handleCopy = (fontName: string) => {
    navigator.clipboard.writeText(fontName).then(() => {
      // Set copied state
      setCopiedFont(fontName)
      
      // Show toast notification
      setToastMessage(`Copied "${fontName}"`)
      
      // Clear toast after 2 seconds
      setTimeout(() => {
        setToastMessage(null)
      }, 2000)
      
      // Clear copy indicator after 2 seconds
      setTimeout(() => {
        setCopiedFont(null)
      }, 2000)
      
      onCopy?.(fontName)
    }).catch((err) => {
      console.error('[v0] Copy failed:', err)
      setToastMessage('Failed to copy')
      setTimeout(() => setToastMessage(null), 2000)
    })
  }

  const hasAnyFonts = (normalizedHeadingFonts.length > 0 || 
                       normalizedBodyFonts.length > 0 || 
                       normalizedMonoFonts.length > 0 ||
                       normalizedAllFonts.length > 0)

  if (!hasAnyFonts) {
    return (
      <div className="text-xs text-muted-foreground font-mono p-3 border border-dashed border-border/40 rounded-sm bg-muted/20">
        No typography detected
      </div>
    )
  }

  // Render individual font item
  const renderFontItem = (fontObj: FontWithCategory, index?: number) => {
    const fontSource = getFontSource(fontObj.name)
    const typeLabel = fontSource ? getFontTypeLabel(fontSource.type) : 'Unknown Font'
    const badgeColor = fontSource ? getFontTypeBadgeColor(fontSource.type) : 'bg-gray-500/10 text-gray-700 border-gray-200'

    return (
      <div
        key={fontObj.name}
        className={cn(
          "group flex flex-col gap-2 p-3 border border-border/40 rounded-sm",
          "hover:border-primary/30 hover:bg-primary/3 hover:shadow-sm",
          "transition-all duration-300 ease-out",
          "cursor-default",
          "animate-content-fade"
        )}
        style={index !== undefined ? { animationDelay: `${index * 50}ms` } : {}}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs font-mono font-semibold text-foreground truncate">{fontObj.name}</code>
              <span className={cn(
                `text-xs px-1.5 py-0.5 rounded-sm border font-mono whitespace-nowrap`,
                badgeColor,
                'animate-badge-pop'
              )}>
                {fontSource?.type === 'free' ? '✓' : fontSource?.type === 'trial' ? '⚡' : '$'} {typeLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {fontSource?.url && (
              <a
                href={fontSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "p-1 rounded-sm text-primary",
                  "hover:bg-primary/10 hover:text-primary/80",
                  "transition-all duration-200",
                  "active:scale-90"
                )}
                aria-label={`Get ${fontObj.name} font`}
                title={`Get ${fontObj.name} from ${fontSource.name}`}
              >
                <ArrowSquareOut className="w-4 h-4 transition-transform group-hover:scale-110" weight="regular" aria-hidden="true" />
              </a>
            )}
            <button
              onClick={() => handleCopy(fontObj.name)}
              className={cn(
                "p-1 rounded-sm transition-all duration-200",
                "opacity-0 group-hover:opacity-100",
                copiedFont === fontObj.name ? 'bg-green-500/10' : 'hover:bg-muted'
              )}
              aria-label={`Copy ${fontObj.name} to clipboard`}
              title={`Copy ${fontObj.name}`}
            >
              {copiedFont === fontObj.name ? (
                <Check className="w-4 h-4 text-[var(--color-success)] animate-checkmark" weight="bold" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" weight="regular" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {fontSource && (
          <div className="text-xs text-muted-foreground space-y-1 pl-1 border-l border-border/40 animate-content-blur">
            <p>
              {fontSource.type === 'free' && (
                <>
                  Free & open source. Download or use from{' '}
                  <span className="font-semibold text-muted-foreground/80">{fontSource.name}</span>.
                </>
              )}
              {fontSource.type === 'premium' && (
                <>
                  Premium font. Available through{' '}
                  <span className="font-semibold text-muted-foreground/80">{fontSource.name}</span> subscription or purchase.
                </>
              )}
              {fontSource.type === 'trial' && (
                <>
                  Trial available. Get from <span className="font-semibold text-muted-foreground/80">{fontSource.name}</span>.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (compact) {
    // Compact mode - show all fonts in a single view
    const allFonts = [...normalizedHeadingFonts, ...normalizedBodyFonts, ...normalizedMonoFonts]
    const fontsToDisplay = allFonts.length === 0 ? normalizedAllFonts : allFonts
    return (
      <div className="space-y-2 relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className={cn(
            "fixed bottom-4 right-4 md:bottom-8 md:right-8",
            "bg-foreground text-background px-4 py-2 rounded-sm text-sm font-mono",
            "z-50 shadow-lg",
            "animate-toast-in"
          )}>
            {toastMessage}
          </div>
        )}
        
        <div className="space-y-2">
          {fontsToDisplay.map((font, idx) => renderFontItem(font, idx))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 bg-foreground text-background px-4 py-2 rounded-sm text-sm font-mono animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
          {toastMessage}
        </div>
      )}

      {/* Display fonts by category */}
      {normalizedHeadingFonts.length > 0 && (
        <div className="space-y-2 animate-content-fade">
          <h4 className="text-sm font-semibold text-foreground">Heading Fonts</h4>
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            {normalizedHeadingFonts.map((font, idx) => renderFontItem(font, idx))}
          </div>
        </div>
      )}

      {normalizedBodyFonts.length > 0 && (
        <div className="space-y-2 animate-content-fade" style={{ animationDelay: '100ms' }}>
          <h4 className="text-sm font-semibold text-foreground">Body Fonts</h4>
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            {normalizedBodyFonts.map((font, idx) => renderFontItem(font, idx))}
          </div>
        </div>
      )}

      {normalizedMonoFonts.length > 0 && (
        <div className="space-y-2 animate-content-fade" style={{ animationDelay: '200ms' }}>
          <h4 className="text-sm font-semibold text-foreground">Monospace Fonts</h4>
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            {normalizedMonoFonts.map((font, idx) => renderFontItem(font, idx))}
          </div>
        </div>
      )}

      {normalizedAllFonts.length > 0 && normalizedHeadingFonts.length === 0 && normalizedBodyFonts.length === 0 && normalizedMonoFonts.length === 0 && (
        <div className="space-y-2 animate-content-fade">
          <h4 className="text-sm font-semibold text-foreground">All Detected Fonts</h4>
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            {normalizedAllFonts.map((font, idx) => renderFontItem(font, idx))}
          </div>
        </div>
      )}
    </div>
  )
}
