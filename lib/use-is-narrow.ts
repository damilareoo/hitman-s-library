'use client'

import { useEffect, useState } from 'react'

/** The breakpoint at which the panel stops being a drawer and becomes a column. */
const SHEET_QUERY = '(max-width: 1279px)'

/**
 * Below this the panel is the page, and its preview is the phone layout. From
 * 640 to 1279 the drawer has room to behave like the desktop panel — including
 * the Mobile tab — which is what the prototype shows.
 */
const PHONE_QUERY = '(max-width: 639px)'

/**
 * Starts false so the server render and the first client render agree, then
 * corrects on mount. The panel is never part of the first paint, so there is
 * nothing to flash.
 */
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}

/**
 * True below the three-pane split, where the detail panel floats over the grid.
 *
 * The layout used to decide this in CSS alone, with both panels mounted and
 * one hidden. That is usually harmless and was not here: each panel holds a
 * live preview, so every site was being fetched and rendered twice, once into
 * a frame nobody could see. It also made failures cross over — the hidden copy
 * could report a preview dead and take the visible one with it.
 */
export function useIsNarrow(): boolean {
  return useMedia(SHEET_QUERY)
}

/** True on a phone, where the panel is the page and the mobile layout is the only one. */
export function useIsPhone(): boolean {
  return useMedia(PHONE_QUERY)
}
