'use client'

import { Copy, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { getFontSource, getFontTypeLabel, getFontTypeBadgeColor } from '@/lib/font-sources'

interface TypographyDisplayProps {
  fonts: string[]
  onCopy?: (font: string) => void
}

export function TypographyDisplay({ fonts, onCopy }: TypographyDisplayProps) {
  const [copiedFont, setCopiedFont] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleCopy = (font: string) => {
    navigator.clipboard.writeText(font).then(() => {
      // Set copied state
      setCopiedFont(font)
      
      // Show toast notification
      setToastMessage(`Copied "${font}"`)
      
      // Clear toast after 2 seconds
      setTimeout(() => {
        setToastMessage(null)
      }, 2000)
      
      // Clear copy indicator after 2 seconds
      setTimeout(() => {
        setCopiedFont(null)
      }, 2000)
      
      onCopy?.(font)
    }).catch((err) => {
      console.error('[v0] Copy failed:', err)
      setToastMessage('Failed to copy')
      setTimeout(() => setToastMessage(null), 2000)
    })
  }

  if (!fonts || fonts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground font-mono p-3 border border-dashed border-border/40 rounded-sm bg-muted/20">
        No typography detected
      </div>
    )
  }

  return (
    <div className="space-y-2 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 bg-foreground text-background px-4 py-2 rounded-sm text-sm font-mono animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
          {toastMessage}
        </div>
      )}

      {fonts.map((font, i) => {
        const fontSource = getFontSource(font)
        const typeLabel = fontSource ? getFontTypeLabel(fontSource.type) : 'Unknown Font'
        const badgeColor = fontSource ? getFontTypeBadgeColor(fontSource.type) : 'bg-gray-500/10 text-gray-700 border-gray-200'

        return (
          <div
            key={i}
            className="group flex flex-col gap-2 p-3 border border-border/40 rounded-sm hover:border-border/60 hover:bg-muted/30 grid-transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono font-semibold text-foreground truncate">{font}</code>
                  <span className={`text-xs px-1.5 py-0.5 rounded-sm border font-mono whitespace-nowrap ${badgeColor}`}>
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
                    className="p-1 hover:bg-primary/10 rounded-sm text-primary hover:text-primary/80 grid-transition"
                    aria-label={`Get ${font} font`}
                    title={`Get ${font} from ${fontSource.name}`}
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                <button
                  onClick={() => handleCopy(font)}
                  className={`p-1 hover:bg-muted rounded-sm grid-transition opacity-0 group-hover:opacity-100 transition-all ${
                    copiedFont === font ? 'bg-green-500/10' : ''
                  }`}
                  aria-label={`Copy ${font} to clipboard`}
                  title={`Copy ${font}`}
                >
                  {copiedFont === font ? (
                    <Check className="w-4 h-4 text-green-600 animate-in scale-in duration-200" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {fontSource && (
              <div className="text-xs text-muted-foreground space-y-1 pl-1 border-l border-border/40">
                <p>
                  {fontSource.type === 'free' && (
                    <>
                      Free & open source. Download or use from{' '}
                      <span className="font-semibold">{fontSource.name}</span>.
                    </>
                  )}
                  {fontSource.type === 'premium' && (
                    <>
                      Premium font. Available through{' '}
                      <span className="font-semibold">{fontSource.name}</span> subscription or purchase.
                    </>
                  )}
                  {fontSource.type === 'trial' && (
                    <>
                      Trial available. Get from <span className="font-semibold">{fontSource.name}</span>.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
