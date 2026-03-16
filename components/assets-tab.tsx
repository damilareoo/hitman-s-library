// components/assets-tab.tsx
'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

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

function useClipboard() {
  const [copiedId, setCopiedId] = useState<number | string | null>(null)
  async function copy(id: number | string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }
  return { copiedId, copy }
}

const CHECKERBOARD = {
  backgroundImage: `
    linear-gradient(45deg,#1a1a1a 25%,transparent 25%),
    linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#1a1a1a 75%),
    linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)
  `,
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px',
  backgroundColor: '#111',
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">{label}</span>
      <span className="text-[9px] text-muted-foreground/40 bg-secondary border border-border rounded-full px-2 py-0.5">{count}</span>
    </div>
  )
}

function LogoSection({ logos }: { logos: Asset[] }) {
  const { copiedId, copy } = useClipboard()
  return (
    <div>
      <SectionLabel label="Logo" count={logos.length} />
      <div className="flex gap-2 flex-wrap mt-2">
        {logos.map(logo => (
          <button
            key={logo.id}
            onClick={() => copy(logo.id, logo.content)}
            className="relative group border border-border rounded-md p-3 hover:border-foreground/30 transition-colors"
            style={CHECKERBOARD}
            title={isSvg(logo.content) ? 'Copy SVG' : 'Copy URL'}
          >
            {isSvg(logo.content) ? (
              <div
                className="h-10 min-w-[60px] max-w-[140px] flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: logo.content }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.content} alt="Logo" className="h-10 max-w-[140px] object-contain" />
            )}
            {copiedId === logo.id && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                <span className="font-mono text-[9px] text-foreground">copied</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function AssetItem({ asset, size, index }: { asset: Asset; size: 'sm' | 'md'; index: number }) {
  const { copiedId, copy } = useClipboard()
  const animDelay = Math.min(index, 11) * 30

  function handleClick() {
    if (asset.type === 'image') window.open(asset.content, '_blank')
    else copy(asset.id, asset.content)
  }

  return (
    <div
      className="group relative border border-border rounded-md overflow-hidden bg-secondary/30 cursor-pointer hover:border-foreground/30 transition-colors"
      style={{ animationDelay: `${animDelay}ms`, animation: 'scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      onClick={handleClick}
    >
      <div className={`${size === 'sm' ? 'h-11' : 'h-20'} flex items-center justify-center p-1`}>
        {isSvg(asset.content) ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: asset.content }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.content} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>
      {asset.type !== 'image' && (
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background border border-border rounded p-0.5">
            <Copy className="w-2.5 h-2.5 text-muted-foreground" />
          </div>
        </div>
      )}
      {copiedId === asset.id && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <span className="font-mono text-[9px] text-foreground">copied</span>
        </div>
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

export function AssetsTab({ assets }: { assets: Asset[] }) {
  const logos = assets.filter(a => a.type === 'logo')

  if (!assets.length) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <p className="text-xs text-muted-foreground">No assets extracted</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto">
      {logos.length > 0 && <LogoSection logos={logos} />}
      <AssetSection label="Icons" assets={assets} type="icon" cols="grid-cols-5 sm:grid-cols-4" size="sm" />
      <AssetSection label="Illustrations" assets={assets} type="illustration" cols="grid-cols-3 sm:grid-cols-2" size="md" />
      <AssetSection label="Images" assets={assets} type="image" cols="grid-cols-3 sm:grid-cols-2" size="md" />
    </div>
  )
}
