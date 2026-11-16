// app/system/_parts/kit.tsx
//
// The few pieces the design system page is built from. They use the same
// tokens as the site (CARD, R, ink, edge), so the page is itself a specimen.
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { CARD } from '@/components/member-card'

/** A section of the page: eyebrow number, heading, one line of lede. */
export function Section({ id, n, title, lede, children }: { id: string; n: string; title: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 lg:scroll-mt-20 pt-20 first:pt-0">
      <p className="text-micro text-ink-4">{n}</p>
      <h2 id={`${id}-h`} className="mt-3 text-heading text-ink">{title}</h2>
      {lede && <p className="mt-2 text-bodytext text-ink-3 max-w-[580px] text-pretty leading-[1.55]">{lede}</p>}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </section>
  )
}

/** A sub-heading inside a section. */
export function Sub({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-edge">
        <h3 className="text-[15px] font-[620] tracking-[-0.02em] text-ink">{title}</h3>
        {note && <span className="text-meta text-ink-4 text-right">{note}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

/**
 * A live example in the card anatomy: tinted head naming it and its file,
 * a plain stage, and optionally the class string it is built from.
 */
export function Specimen({ name, file, children, code, stage = 'center', className = '' }: {
  name: string; file?: string; children: ReactNode; code?: string; stage?: 'center' | 'start' | 'stretch'; className?: string
}) {
  const align = stage === 'center' ? 'items-center justify-center' : stage === 'start' ? 'items-start justify-start' : 'items-stretch'
  return (
    <figure className={'border border-edge-strong rounded-[16px] overflow-hidden bg-background ' + className}>
      <figcaption className={CARD.head}>
        <span className="truncate">{name}</span>
        {file && <span className="text-meta text-ink-4 truncate">{file}</span>}
      </figcaption>
      <div className={'relative p-6 max-sm:p-4 flex flex-wrap gap-3 ' + align}>{children}</div>
      {code && (
        <details className="group border-t border-edge bg-foreground/[0.025]">
          <summary className="h-10 px-4 flex items-center text-[12.5px] font-[500] text-ink-3 hover:text-ink cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show classes</span><span className="hidden group-open:inline">Hide classes</span>
          </summary>
          <pre className="px-4 pb-4 text-[12px] leading-[1.6] text-ink-2 whitespace-pre-wrap break-all font-mono">{code}</pre>
        </details>
      )}
    </figure>
  )
}

/** Token tables: name, value, use. Stacks on a phone. */
export function Rows({ head = ['Token', 'Value', 'Use'], rows }: { head?: [string, string, string]; rows: [ReactNode, ReactNode, ReactNode][] }) {
  return (
    <div role="table" className="text-[13px]">
      <div role="row" className="max-sm:hidden grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-4 pb-2 text-micro text-ink-4">
        {head.map(h => <span role="columnheader" key={h}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div role="row" key={i} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)] max-sm:grid-cols-1 gap-x-4 gap-y-0.5 py-2.5 border-t border-edge-faint">
          <span role="cell" className="font-[600] text-ink break-words">{r[0]}</span>
          <span role="cell" className="text-ink-3 break-words">{r[1]}</span>
          <span role="cell" className="text-ink-3 text-pretty">{r[2]}</span>
        </div>
      ))}
    </div>
  )
}

/** Inline code token. */
export function C({ children }: { children: ReactNode }) {
  return <code className="px-1 py-px rounded-[5px] bg-foreground/[0.06] text-[12px] font-[500] text-ink-2">{children}</code>
}

/** A short rule list, numbered. */
export function Rules({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((t, i) => (
        <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2.5 border-t border-edge-faint first:border-t-0 text-[13.5px] leading-[1.5] text-ink-2 text-pretty">
          <span className="text-ink-4">{String(i + 1).padStart(2, '0')}</span><span>{t}</span>
        </li>
      ))}
    </ol>
  )
}

/** Do / Don't pair. */
export function DoDont({ good, bad }: { good: ReactNode; bad: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {([['Do', good], ["Don't", bad]] as const).map(([k, v]) => (
        <div key={k} className="rounded-[10px] border border-edge p-3.5">
          <p className={'text-micro ' + (k === 'Do' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]')}>{k}</p>
          <div className="mt-2 text-[13.5px] leading-[1.5] text-ink-2 text-pretty">{v}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * Reads a CSS custom property off the document, live: it updates when the
 * theme class changes, so the swatches always show what the site renders.
 */
export function useCssVar(name: string) {
  const [v, setV] = useState('')
  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      // Minified CSS shortens #ffffff to #fff; show the six-digit form people copy.
      setV(/^#[0-9a-f]{3}$/i.test(raw) ? '#' + raw.slice(1).split('').map(c => c + c).join('') : raw)
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [name])
  return v
}

/** Replays a demo by remounting it. */
export function useReplay() {
  const [k, setK] = useState(0)
  return [k, () => setK(x => x + 1)] as const
}
