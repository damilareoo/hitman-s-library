// components/pro-word.tsx
//
// Pro in the header: the word itself, in BDO Grotesk, filled with the same
// library colours as the Pro card (one coherent hue window, hue running left
// to right). On first paint the word sits pale, then the colours wash across
// it once, the way Refero's type arrives, and it rests. Nothing moves on
// hover; it's seen too often for that. Members see the same mark; it opens
// Manage. Reduced motion shows it at rest straight away.
'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useAccount } from '@/lib/account-client'
import { hsl, hueWindow, centreOf, hueDist, type Swatch } from '@/lib/pro/palette'

// Amber, the Pro colour, until library colours arrive.
const AMBER = ['#c96a1c', '#d9822b', '#e07b39', '#e8a04a', '#d4952f']
const W = 27, SWEEP_MS = 900
// Far enough left that the colour-to-pale edge clears the P before the sweep.
const START = -Math.round(W * 1.3)
const TYPE = { font: '760 15px "BDO Grotesk", "Helvetica Neue", system-ui, sans-serif', letterSpacing: '-0.03em' }

/** Five stops across the hue window: hue left to right, each legible on the surface. */
function stops(colors: string[], dark: boolean): string[] {
  const all = colors.filter(c => /^#[0-9a-f]{6}$/i.test(c)).map(c => [c.toLowerCase(), ''] as Swatch)
  if (!all.length) return AMBER
  const pool = hueWindow(all, all, dark)
  const centre = centreOf(pool)
  const rel = (c: string) => ((hsl(c)[0] - centre + 540) % 360) - 180
  const sorted = [...new Set(pool.map(s => s[0]))].filter(c => hueDist(hsl(c)[0], centre) < 46).sort((a, b) => rel(a) - rel(b))
  if (sorted.length < 3) return AMBER
  return [0, 0.25, 0.5, 0.75, 1].map(t => sorted[Math.round(t * (sorted.length - 1))])
}

export function ProWord({ colors }: { colors: string[] }) {
  const pro = Boolean(useAccount().pro)
  const id = useId().replace(/:/g, '')
  const [dark, setDark] = useState(false)
  const [phase, setPhase] = useState<'pale' | 'sweep' | 'rest'>('pale')
  const started = useRef(false)
  const sweep = useRef<SVGAnimateTransformElement>(null)

  // SMIL begins on the document clock; one added after load has to be started.
  useEffect(() => { if (phase === 'sweep') sweep.current?.beginElement() }, [phase])

  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark'))
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    if (!started.current) {
      started.current = true
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPhase('rest')
      else {
        // After the face loads, so the sweep runs over the real letterforms.
        const go = () => setPhase('sweep')
        document.fonts?.ready.then(go, go)
      }
    }
    return () => mo.disconnect()
  }, [])

  const c = stops(colors, dark)
  const pale = dark ? 'rgba(232,228,220,0.2)' : 'rgba(22,22,21,0.13)'

  return (
    <Link
      href="/pro"
      aria-label={pro ? 'Your Pro membership' : 'Hitman’s Library Pro'}
      title={pro ? 'Your Pro membership' : 'Pro: unlimited kits and search by palette'}
      className="relative inline-flex items-center h-8 px-2 max-sm:px-1 rounded-[10px] hover:bg-foreground/[0.05] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
    >
      <svg width={W} height="14" viewBox={`0 0 ${W} 14`} aria-hidden="true" className="block overflow-visible">
        <defs>
          {/* Twice the word's width: colours on the left half, pale on the
              right. It starts shifted one word-width left (pale over the
              letters) and slides home, so the colours wash in from the left. */}
          <linearGradient
            id={`pw-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={2 * W} y2="0"
            gradientTransform={phase === 'pale' ? `translate(${START} 0)` : undefined}
          >
            {c.map((col, i) => <stop key={i} offset={i * 0.1} stopColor={col} />)}
            <stop offset="0.5" stopColor={c[c.length - 1]} />
            <stop offset="0.64" stopColor={pale} />
            <stop offset="1" stopColor={pale} />
            {phase === 'sweep' && (
              <animateTransform
                ref={sweep}
                attributeName="gradientTransform" type="translate" from={`${START} 0`} to="0 0"
                begin="indefinite" dur={`${SWEEP_MS}ms`} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.23 1 0.32 1"
              />
            )}
          </linearGradient>
        </defs>
        <text x="0" y="11.6" fill={`url(#pw-${id})`} style={TYPE}>Pro</text>
      </svg>
    </Link>
  )
}
