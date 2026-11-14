// components/fade-img.tsx
// A small image that never pops: its box is already in place, and the picture
// fades up over 150ms once decoded (or straight away if it was cached).
'use client'

import { useState } from 'react'

export function FadeImg({ src, className = '' }: { src: string; className?: string }) {
  const [ready, setReady] = useState(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src} alt="" decoding="async"
      ref={el => { if (el?.complete && el.naturalWidth > 0 && !ready) setReady(true) }}
      onLoad={() => setReady(true)}
      className={className + ' transition-opacity duration-150 ease-[var(--ease-sig)] ' + (ready ? 'opacity-100' : 'opacity-0')}
    />
  )
}
