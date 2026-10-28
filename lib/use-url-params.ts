'use client'

// The URL is the source of truth for the gallery, but every filter or panel
// state that rides through the router costs a server round trip: the page is
// force-dynamic, so a router.push re-runs every gallery query before React
// even moves. This hook writes the same URLs with the history API instead —
// deep links, shares and the back button keep working, and the view updates
// in the same frame as the click.

import { useCallback, useEffect, useRef, useState } from 'react'

type ParamInput = Record<string, string | string[] | undefined>

// Links on the page (the brand, the Clear row) still navigate through the
// router, and the router writes the URL without firing popstate. Patch the
// history methods to announce every URL write; the hook below adopts a URL
// it did not write itself.
const NAV_EVENT = 'hl:urlchange'
let historyPatched = false
if (typeof window !== 'undefined' && !historyPatched) {
  historyPatched = true
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method].bind(window.history)
    window.history[method] = function (state: unknown, title: string, url?: string | URL | null) {
      original(state, title, url)
      window.dispatchEvent(new Event(NAV_EVENT))
    }
  }
}

export function useUrlParams(initial: ParamInput) {
  const [params, setParams] = useState<URLSearchParams>(() => {
    const p = new URLSearchParams()
    for (const [key, value] of Object.entries(initial)) {
      if (value === undefined) continue
      if (Array.isArray(value)) value.forEach(v => p.append(key, v))
      else p.append(key, value)
    }
    return p
  })

  // Consecutive edits compose: each starts from the latest, not from the
  // snapshot React happened to render last.
  const latest = useRef(params)
  latest.current = params

  // Back/forward, and router-driven writes this hook did not make (the
  // brand link, the Clear link): re-read the URL.
  useEffect(() => {
    function onPop() {
      setParams(new URLSearchParams(window.location.search))
    }
    function onNav() {
      const next = new URLSearchParams(window.location.search)
      if (next.toString() !== latest.current.toString()) setParams(next)
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener(NAV_EVENT, onNav)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener(NAV_EVENT, onNav)
    }
  }, [])

  const apply = useCallback((mutate: (p: URLSearchParams) => void, replace: boolean) => {
    const next = new URLSearchParams(latest.current)
    mutate(next)
    latest.current = next
    const qs = next.toString()
    const url = qs ? `/?${qs}` : '/'
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    setParams(next)
  }, [])

  const push = useCallback((mutate: (p: URLSearchParams) => void) => apply(mutate, false), [apply])
  const replace = useCallback((mutate: (p: URLSearchParams) => void) => apply(mutate, true), [apply])

  return { params, push, replace }
}
