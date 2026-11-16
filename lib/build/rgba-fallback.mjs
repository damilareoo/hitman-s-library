// lib/build/rgba-fallback.mjs
//
// A PostCSS step after Tailwind. Tailwind writes every "colour at N%" tint as
// color-mix() inside @supports, with the solid colour as the fallback, so on a
// Safari without color-mix (older iPhones) every 5% tint turned into a solid
// block: blank switchers, white borders, invisible labels. For the colours
// that have an rgb twin in globals.css, this adds the same tint as rgba() just
// before the @supports block, which every browser reads; browsers with
// color-mix still get the original after it.
const RGB = {
  foreground: 'var(--foreground-rgb)',
  border: 'var(--border-rgb)',
  background: 'var(--background-rgb)',
  card: 'var(--card-rgb)',
  primary: 'var(--primary-rgb)',
  secondary: 'var(--secondary-rgb)',
  'color-white': '255, 255, 255',
  'color-black': '0, 0, 0',
}
const MIX = /color-mix\(in oklab,\s*var\(--([a-z0-9-]+)\)\s*([\d.]+)%,\s*transparent\)/g

function toRgba(value) {
  let all = true, any = false
  const out = value.replace(MIX, (m, name, pct) => {
    if (!RGB[name]) { all = false; return m }
    any = true
    return `rgba(${RGB[name]}, ${Math.round(Number(pct) * 100) / 10000})`
  })
  return any && all ? out : null
}

/** A copy of `node` holding only the rgba-convertible declarations, keeping any
 *  nested at-rules (@media for hover, etc.) around them; null when there are none. */
function twinOf(node) {
  if (node.type === 'decl') { const v = toRgba(node.value); return v ? node.clone({ value: v }) : null }
  if (node.type !== 'rule' && node.type !== 'atrule') return null
  const kids = (node.nodes ?? []).map(twinOf).filter(Boolean)
  if (!kids.length) return null
  const copy = node.clone({ nodes: [] })
  kids.forEach(k => copy.append(k))
  return copy
}

export default function rgbaFallback() {
  return {
    postcssPlugin: 'rgba-fallback',
    OnceExit(root) {
      root.walkAtRules('supports', at => {
        if (!at.params.includes('color-mix')) return
        // Same nesting as the @supports block, just before it.
        for (const child of [...(at.nodes ?? [])]) {
          const twin = twinOf(child)
          if (twin) at.before(twin)
        }
      })
    },
  }
}
rgbaFallback.postcss = true
