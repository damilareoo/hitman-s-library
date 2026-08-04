'use client'

import { useRef, useState } from 'react'

// Shared copy-feedback state: which id shows a check, auto-resets after 1.5s.
export function useCopied() {
  const [copiedId, setCopiedId] = useState<number | string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function markCopied(id: number | string) {
    setCopiedId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopiedId(null), 1500)
  }

  return { copiedId, markCopied }
}
