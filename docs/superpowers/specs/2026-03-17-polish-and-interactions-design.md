# Polish & Interactions Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Hitman's Library UI feel alive and delightful — spring physics on all key interactions, a circular theme-switch reveal, a working full-page preview, clear failure messaging, and a real-time extraction loading indicator.

**Architecture:** Add `motion` (Framer Motion v11+) as the single animation dependency. Wrap the app in `MotionConfig` with shared spring defaults. Convert card grid, detail panel, and tab transitions to `motion` components. Theme switch uses a CSS clip-path animation triggered from a React overlay component. All other changes are targeted fixes to existing components.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, `motion` (Framer Motion v11), TypeScript

---

## Section 1: Dependencies & MotionConfig

### What changes
- Install `motion` package
- Add `<MotionConfig>` to `app/layout.tsx` wrapping children
- Define shared transition defaults: `type: "spring", stiffness: 400, damping: 30`
- `reducedMotion: "user"` on `MotionConfig` — automatically disables all animations for users with `prefers-reduced-motion: reduce` set in their OS
- Existing CSS spring curves in `globals.css` stay for CSS-only elements (skeletons, swatches)

### MotionConfig
```tsx
<MotionConfig
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
  reducedMotion="user"
>
  {children}
</MotionConfig>
```

---

## Section 2: Card Grid Animations

### Files affected
- `app/page.tsx` — grid container + card wrappers
- `components/site-thumbnail.tsx` — thumbnail image

### Behaviour

**Initial load stagger (first mount only):**
- Grid container: `motion.div` with `variants` that sets `staggerChildren: 0.04`
- Each card: `motion.div` with `initial="hidden"` → `animate="show"` on first mount
- After first mount, a `useRef` flag (`hasAnimated`) is set to `true`. On subsequent renders (e.g. filter changes), cards render with `initial={false}` — this disables the enter animation so the stagger doesn't re-fire on every filter change
- Concrete pattern:
```tsx
const hasAnimated = useRef(false)
useEffect(() => { hasAnimated.current = true }, [])

// On each card:
<motion.div
  layout
  variants={cardVariants}
  initial={hasAnimated.current ? false : 'hidden'}
  animate="show"
  exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
>
```

**Filter reflow (the Emil effect):**
- Each card gets `layout` prop — cards animate into new grid positions when filters change
- `AnimatePresence mode="popLayout"` wraps the card list — removed cards scale out (`scale: 0.9, opacity: 0`) before remaining cards reflow
- Exit transition: `duration: 0.15, ease: "easeIn"` (faster exit than enter)

**Hover:**
- Card `whileHover={{ scale: 1.015 }}` — subtle lift
- Thumbnail `whileHover={{ scale: 1.04 }}` (replaces current CSS `group-hover:scale-[1.02]`)

**Press:**
- Card `whileTap={{ scale: 0.98 }}` — press feedback

### Variants pattern
```tsx
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}
```

**Note — React Strict Mode (dev only):** In development, React 19 Strict Mode runs effects twice. The `useEffect` that sets `hasAnimated.current = true` fires on the second pass, which may suppress the entrance stagger when testing locally. This is not a production bug. If the entrance animation appears missing in dev, temporarily disable Strict Mode to verify it works correctly, then re-enable.

---

## Section 3: Detail Panel & Tab Transitions

### Files affected
- `components/site-detail-panel.tsx` — panel wrapper + loading state + re-extract button
- `components/panel-tabs.tsx` — tab content switch
- `app/page.tsx` — panel mount/unmount (desktop + mobile)

### Desktop panel
- Panel wrapper: `motion.div` with `initial={{ opacity: 0, x: 24 }}` → `animate={{ opacity: 1, x: 0 }}`
- Wrapped in `AnimatePresence` so it animates out when no site is selected
- Content (not full panel) fades when switching between sites: `key={sourceId}` on inner content triggers re-mount animation

### Mobile bottom sheet
- `motion.div` wrapping the dialog inner content
- `initial={{ y: '100%', opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`
- Softer spring via local override: `transition={{ type: 'spring', stiffness: 300, damping: 35 }}`
- Note: per-component `transition` props override `MotionConfig` defaults in Framer Motion — this is the correct way to use softer physics on specific elements without changing global defaults

### Tab content transitions
- `AnimatePresence mode="wait"` wrapping the active tab component
- Each tab: `key={activeTab}` to trigger re-mount on tab change
- Exit: `{ opacity: 0, y: -4, transition: { duration: 0.12 } }`
- Enter: `initial={{ opacity: 0, y: 4 }}` → `animate={{ opacity: 1, y: 0 }}`

### Loading → content transition
- Loading spinner wrapped in `AnimatePresence`
- Content wrapper: `motion.div` with `initial={{ opacity: 0, scale: 0.98 }}` → `animate={{ opacity: 1, scale: 1 }}`

### Re-extract button icon
- Use `useAnimate` from `motion/react` for imperative control (required because re-triggering the same end value with a static `animate` prop does nothing in Framer Motion)
- The spin and the fetch run concurrently — do not `await` the spin before starting the fetch (that would leave the icon idle during the actual network call)
- During the fetch, keep the icon spinning with a continuous loop using `repeat: Infinity`; on completion/error, stop the loop and reset
- Error handling is required: on fetch error, call `classifyExtractionError` (Section 6) and surface the result in the tab's empty state

```tsx
const [scope, animate] = useAnimate()
const [isReextracting, setIsReextracting] = useState(false)

async function handleReextract() {
  if (isReextracting) return
  setIsReextracting(true)

  // Start continuous spin — runs while fetch is in progress
  animate(scope.current, { rotate: 360 }, {
    duration: 0.7, ease: 'linear', repeat: Infinity, repeatType: 'loop'
  })

  try {
    await fetch(`/api/design/${id}/reextract`, { method: 'POST' })
    // refetch data to update tabs
  } catch (err) {
    // surface error via classifyExtractionError (see Section 6)
  } finally {
    setIsReextracting(false)
    // Stop spin, snap back to 0
    animate(scope.current, { rotate: 0 }, { duration: 0 })
  }
}

<motion.span ref={scope}>
  <RefreshCw className="w-3 h-3" />
</motion.span>
```

---

## Section 4: Theme Switch — Circular Clip-Path Reveal

### Files affected
- `components/theme-toggle.tsx` — captures button position, triggers animation
- `components/theme-transition-overlay.tsx` — NEW component, full-screen overlay
- `app/page.tsx` — mounts the overlay component

### Correct sequencing (important)
The overlay shows a solid `var(--background)` color block in the new theme, revealing the new theme's background color as the circle expands. It does NOT clone the full page. The visual effect is: the new-theme background sweeps across from the toggle button. At animation end, the *actual* new theme class is applied to `<html>` (making everything on the page switch properly), then the overlay is unmounted. The result looks seamless because the overlay's background colour matches the new theme's background exactly.

**Resolving "system" theme:** The existing toggle cycles through `light → dark → system`. Before constructing the overlay, resolve `"system"` to its effective value: `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`. Pass only `'dark'` or `'light'` to the overlay — never `'system'`. This ensures the overlay's `className` and `var(--background)` resolve correctly.

Step-by-step:
1. User clicks theme toggle
2. Determine `effectiveNewTheme`: resolve next theme in cycle, converting `"system"` → `"dark"` or `"light"` based on OS preference
3. Record button centre: `{ x, y }` from `getBoundingClientRect()`
4. Disable the toggle button (prevent double-trigger while animation runs)
5. Set `data-theme-transitioning="true"` on `<html>` to pause CSS color transitions (`[data-theme-transitioning] * { transition: none !important }`)
6. Mount `ThemeTransitionOverlay` with `effectiveNewTheme` and `origin: { x, y }` props
7. Overlay starts with `clip-path: circle(0% at Xpx Ypx)` and transitions to `circle(150% at Xpx Ypx)` over 600ms
8. On completion: apply new theme class to `<html>`, remove `data-theme-transitioning`, unmount overlay, re-enable toggle button
9. The page is now fully in the new theme — no flash

**Completion trigger:** Use both `onTransitionEnd` AND a `setTimeout(onComplete, 650)` safety net (50ms longer than the 600ms transition). Guard the callback so it only fires once (whichever fires first). This handles cases where `transitionend` silently fails (browser jank, low-power GPU throttling).

```tsx
// ThemeTransitionOverlay
<div
  className={newTheme === 'dark' ? 'dark' : ''}
  style={{
    position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
    background: 'var(--background)',
    clipPath: animating
      ? `circle(150% at ${origin.x}px ${origin.y}px)`
      : `circle(0% at ${origin.x}px ${origin.y}px)`,
    transition: 'clip-path 600ms ease-in-out',
  }}
  onTransitionEnd={onComplete}
/>
```
Trigger the expanding `clipPath` value on the next tick after mount (via `useEffect` + `setTimeout(0)`) so the browser registers the initial state before animating.

### Sun/Moon icon animation
- Icon: `motion.div` with `key={theme}` — triggers re-mount on theme change
- `initial={{ rotate: -30, scale: 0.7 }}` → `animate={{ rotate: 0, scale: 1 }}`

---

## Section 5: Preview Tab Fix — Bounded Scroll Container

### Files affected
- `components/site-detail-panel.tsx` — add height constraint to desktop panel column
- `components/preview-tab.tsx` — scroll back-to-top button

### Root cause
The panel chain lacks a height constraint, so `flex-1` + `h-full overflow-y-auto` on the preview container doesn't activate — the page itself scrolls instead of the preview box. The full-page screenshot renders at its full height (2000–8000px) and escapes the container.

### Fix
In `site-detail-panel.tsx`, the desktop panel column wrapper gets a height constraint scoped to `md:` and above (mobile uses the bottom sheet from Section 3 and must not be affected):
```tsx
// desktop only — mobile is a separate dialog/sheet
className="hidden md:flex md:flex-col md:h-[calc(100vh-4rem)] md:sticky md:top-16"
```
This bounds all flex children on desktop. The preview container's existing `flex-1 h-full overflow-y-auto` then actually constrains the scroll inside the box. Mobile layout is unchanged.

### Back-to-top button
- Show when `scrollTop > 200` inside the preview container
- `motion.button` with `AnimatePresence`: fades + slides in from bottom-right corner of the preview area
- `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`
- Clicking: `scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })`
- Label: `↑` in monospace, same muted style as the scroll hint

### Hint update
- "scroll to explore ↓" hint stays, fades out at 50px scroll
- Once hidden, stays hidden until `screenshotUrl` changes (already correct in current code)

---

## Section 6: Extraction Failure Messaging

### Files affected
- `lib/classify-extraction-error.ts` — NEW utility
- `components/preview-tab.tsx`, `components/colors-tab.tsx`, `components/type-tab.tsx`, `components/assets-tab.tsx` — use classifier

### Classifier
```ts
export type FailureCategory =
  | 'bot_protection'
  | 'login_required'
  | 'timeout'
  | 'not_found'
  | 'unknown'

export function classifyExtractionError(message: string | null): FailureCategory {
  if (!message) return 'unknown'
  const m = message.toLowerCase()
  if (m.includes('403') || m.includes('cloudflare') || m.includes('bot') || m.includes('blocked')) return 'bot_protection'
  if (m.includes('401') || m.includes('login') || m.includes('auth') || m.includes('sign in')) return 'login_required'
  if (m.includes('timeout') || m.includes('timed out') || m.includes('navigation')) return 'timeout'
  if (m.includes('404') || m.includes('not found')) return 'not_found'
  return 'unknown'
}
```

### Copy per category
Use Lucide icons (already a dependency) — not emoji (inconsistent rendering cross-platform).

| Category | Lucide Icon | Label | Explanation |
|---|---|---|---|
| `bot_protection` | `ShieldAlert` | Bot protection | This site blocks automated access. Design data can't be extracted — it requires a real browser session. |
| `login_required` | `Lock` | Login required | This site requires authentication. Only public pages can be analyzed. |
| `timeout` | `Clock` | Timed out | This site renders entirely client-side and timed out during extraction. Try re-extracting — it may work on a second attempt. |
| `not_found` | `FileQuestion` | Not found | This URL returned a 404. Check the address and try again. |
| `unknown` | `AlertTriangle` | Extraction failed | This site may use bot protection, require login, or block external requests. |

### UI structure (empty states)
```
[LucideIcon 14px]  [Label — small caps, muted]
[One-sentence explanation — text-sm muted-foreground]
[Re-extract button — existing component]
<details>
  <summary>Show technical details</summary>
  [raw error string in font-mono text-[10px]]
</details>
```

---

## Section 7: Submit Loading Indicator

### Files affected
- `app/page.tsx` — add animated progress state to URL submission form

### Behaviour
After submitting a URL, while extraction is in progress:

1. Submit button disables, shows a spinner icon
2. A status line appears below the input cycling through stage labels with `AnimatePresence`:
   - "Launching browser..." (0–3s)
   - "Rendering page..." (3–8s)
   - "Extracting colors..." (8–15s)
   - "Capturing screenshot..." (15–25s)
   - "Saving..." (25s+)
3. Each stage label animates in: `initial={{ opacity: 0, y: 4 }}` → `animate={{ opacity: 1, y: 0 }}`
4. **On completion or error (regardless of which timer stage is active):** immediately cancel all pending timers, clear the stage label, and show result. The status line jumps straight to the final state — it never stays on a mid-stage label after the fetch resolves.
5. On success: status fades out, new card enters the grid with the standard card entrance animation
6. On error: status shows the classified failure reason (using `classifyExtractionError`) immediately

Timing is cosmetic only — it reflects the typical extraction flow to reduce perceived wait time. The actual fetch result always wins.

---

## Error Handling & Edge Cases

- **Extraction timeout on Vercel (Hobby plan 10s limit):** Error stored in `metadata.extraction_error` will contain "timeout" and the UI classifies it via `classifyExtractionError`. No pipeline changes needed.
- **`motion` layout animations with dynamic grid:** Use `layoutId` only on elements with stable IDs (card's `sourceId`). Do not use `layoutId` on filter-generated elements without stable keys — it causes layout animation bugs.
- **Clip-path browser support:** `clip-path: circle()` is supported in all modern browsers. No fallback needed.
- **Theme transition overlay flash:** If the user clicks the toggle rapidly, a second overlay could mount while the first is still animating. Debounce the toggle click by disabling the button while `data-theme-transitioning` is active.

---

## Out of Scope

- Page transitions between routes (there's only one route)
- Drag-and-drop reordering of cards
- Any changes to the extraction pipeline beyond what's already deployed
- Carousel or lightbox for screenshots
