// components/assets-tab.tsx
'use client'

import { Copy, Check, ArrowSquareOut } from '@phosphor-icons/react'
import { TabEmptyState } from './tab-empty-state'
import { SectionLabel } from './ui/section-label'
import { useCopied } from '@/lib/use-copied'

interface Asset {
  id: number
  type: 'logo' | 'icon' | 'illustration' | 'image'
  content: string
  width: number
  height: number
}

function isSvg(content: string) {
  return content.trimStart().toLowerCase().startsWith('<svg')
}

// Strip script tags and event-handler attributes before rendering SVG inline
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '')
}

async function copyToClipboard(value: string, id: number | string, markCopied: (id: number | string) => void) {
  try {
    await navigator.clipboard.writeText(value)
    markCopied(id)
  } catch { /* clipboard unavailable */ }
}

function FeedbackChip({ copied, Idle }: { copied: boolean; Idle: typeof Copy }) {
  return (
    <div className={[
      'absolute bottom-1 right-1 transition-opacity',
      copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
    ].join(' ')}>
      <div className="bg-background border border-edge rounded-[4px] p-0.5">
        {copied
          ? <Check className="w-2.5 h-2.5 text-ink" weight="bold" />
          : <Idle className="w-2.5 h-2.5 text-ink-3" weight="regular" />}
      </div>
    </div>
  )
}

function LogoSection({ logos }: { logos: Asset[] }) {
  const { copiedId, markCopied } = useCopied()
  return (
    <div>
      <SectionLabel label="Logo" count={logos.length} />
      <div className="flex gap-2 flex-wrap mt-2">
        {logos.map(logo => (
          <button
            key={logo.id}
            onClick={() => copyToClipboard(logo.content, logo.id, markCopied)}
            className="checkerboard relative group border border-edge rounded-[4px] p-3 hover:border-edge-strong transition-colors"
            aria-label={isSvg(logo.content) ? 'Copy SVG' : 'Copy URL'}
          >
            {isSvg(logo.content) ? (
              <div
                className="h-10 min-w-[60px] max-w-[140px] flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(logo.content) }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.content} alt="Logo" className="h-10 max-w-[140px] object-contain" />
            )}
            <FeedbackChip copied={copiedId === logo.id} Idle={Copy} />
          </button>
        ))}
      </div>
    </div>
  )
}

function AssetItem({ asset, size, index }: { asset: Asset; size: 'sm' | 'md'; index: number }) {
  const { copiedId, markCopied } = useCopied()
  const animDelay = Math.min(index, 11) * 30

  function handleClick() {
    if (asset.type === 'image') window.open(asset.content, '_blank')
    else copyToClipboard(asset.content, asset.id, markCopied)
  }

  return (
    <div
      className="group relative border border-edge rounded-[4px] overflow-hidden bg-secondary/30 cursor-pointer hover:border-edge-strong transition-colors"
      style={{ animationDelay: `${animDelay}ms`, animation: 'scale-in 0.3s var(--ease-sig) both' }}
      onClick={handleClick}
    >
      <div className={`${size === 'sm' ? 'h-11' : 'h-20'} flex items-center justify-center p-1`}>
        {isSvg(asset.content) ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(asset.content) }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.content} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
      {asset.type !== 'image' ? (
        <FeedbackChip copied={copiedId === asset.id} Idle={Copy} />
      ) : (
        <FeedbackChip copied={false} Idle={ArrowSquareOut} />
      )}
    </div>
  )
}

function AssetSection({
  label, assets, type, cols, size,
}: {
  label: string
  assets: Asset[]
  type: Asset['type']
  cols: string
  size: 'sm' | 'md'
}) {
  const filtered = assets.filter(a => a.type === type)
  if (!filtered.length) return null
  return (
    <div>
      <SectionLabel label={label} count={filtered.length} />
      <div className={`grid ${cols} gap-1.5 mt-2`}>
        {filtered.map((asset, i) => (
          <AssetItem key={asset.id} asset={asset} size={size} index={i} />
        ))}
      </div>
    </div>
  )
}

export function AssetsTab({ assets, extractionError }: { assets: Asset[]; extractionError?: string | null }) {
  const logos = assets.filter(a => a.type === 'logo')

  if (!assets.length) {
    return <TabEmptyState message="No assets extracted" extractionError={extractionError} />
  }

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto">
      {logos.length > 0 && <LogoSection logos={logos} />}
      <AssetSection label="Icons" assets={assets} type="icon" cols="grid-cols-5" size="sm" />
      <AssetSection label="Illustrations" assets={assets} type="illustration" cols="grid-cols-3" size="md" />
      <AssetSection label="Images" assets={assets} type="image" cols="grid-cols-3" size="md" />
    </div>
  )
}
