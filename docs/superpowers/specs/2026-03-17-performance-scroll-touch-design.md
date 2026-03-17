# Performance, Scroll & Touch — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UX issues — body scroll escaping the preview panel, laggy/unresponsive category filtering (including initial page load), and undersized touch target on the mobile "Visit site" button.

**Architecture:** Three focused, independent changes across `app/globals.css`, `app/page.tsx`, and `components/site-detail-panel.tsx`. No new dependencies. No DB changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion v11

---

## Area 1 — Body Scroll Lock

### Problem

When the user scrolls the preview panel to the bottom of a screenshot and continues scrolling, the page body scrolls — making the card grid jump or the overall page move. `overscroll-contain` on the preview panel is not sufficient because `html`/`body` have no `overflow: hidden`, so scroll events that escape the panel propagate to the document.

### Root Cause

- `app/globals.css`: no `overflow: hidden` on `html` or `body`
- `app/page.tsx` line 445: the grid wrapper uses `min-h-[calc(100vh-64px)]` — a minimum height, not a fixed height — so the page can grow taller than the viewport and become scrollable

### Solution

**`app/globals.css`** — add inside the `:root` block or as standalone rules after existing base styles:
```css
html {
  height: 100dvh;
  overflow: hidden;
}

body {
  height: 100%;
  overflow: hidden;
}
```

This works because:
- On desktop: the card list already has its own `flex-1 overflow-y-auto` scroll container (line 532 of `page.tsx`). The detail panel already has `h-[calc(100vh-64px)]` with internal scrollable tabs. Neither relies on body scroll.
- On mobile: the same `flex-1 overflow-y-auto` card list container handles scrolling. The `<dialog>` sheet is `position: fixed` and unaffected.
- The existing `background-attachment: fixed` on `body` (globals.css line ~176) remains correct — it positions the grid pattern relative to the viewport, which is unchanged.

**`app/page.tsx` line 445** — change the grid wrapper:
```diff
- <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[calc(100vh-64px)]">
+ <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-[calc(100dvh-64px)] overflow-hidden">
```

**`app/page.tsx` — remove the mobile body scroll lock `useEffect`** (lines ~131–140):
```tsx
// REMOVE this entire effect — body is always locked via CSS now
useEffect(() => {
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  if (!selectedDesign || !isMobile) return
  const previous = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  return () => {
    document.body.style.overflow = previous
  }
}, [selectedDesign])
```

With body always locked via CSS, this effect is a no-op and can be deleted cleanly.

### Files changed
- `app/globals.css`
- `app/page.tsx`

---

## Area 2 — Skeleton Loading (Initial Load + Category Filter)

### Problem

Two moments in the card grid show a blank/frozen state with no feedback:

1. **Initial page load** — on first visit, the grid fetches designs from the DB and the card area is empty for 300–800ms.
2. **Category filter clicks** — every click immediately fires a new fetch with no visual feedback. The grid appears frozen, then suddenly swaps.

### Solution

**Two loading states:**
- `isLoading` — true on initial mount until the first fetch completes
- `isFiltering` — true only when a filter-change fetch is in-flight (debounced)

Both show the same `SkeletonCard` grid. `isLoading` fires immediately on mount; `isFiltering` fires 200ms after a filter change (debounce prevents skeletons flashing on rapid clicks).

**Stale closure safety:** `loadDesigns` captures `activeFilters` from its closure. To ensure the debounced call always uses the latest version, store the function in a ref that is updated on every render.

**`app/page.tsx`**

Add two loading states (after the existing state declarations, around line 87):
```tsx
const [isLoading, setIsLoading] = useState(true)
const [isFiltering, setIsFiltering] = useState(false)
```

Add a ref to hold the latest `loadDesigns` (immediately after the `loadDesigns` function definition):
```tsx
const loadDesignsRef = useRef(loadDesigns)
loadDesignsRef.current = loadDesigns
```

**Initial load** — add a `useEffect` that runs once on mount:
```tsx
useEffect(() => {
  loadDesignsRef.current().finally(() => setIsLoading(false))
}, [])
```

**Filter changes** — replace the existing filter `useEffect` (currently around line 120–123):
```tsx
useEffect(() => {
  const t = setTimeout(() => {
    setIsFiltering(true)
    loadDesignsRef.current().finally(() => setIsFiltering(false))
  }, 200)
  return () => clearTimeout(t)
}, [JSON.stringify(activeFilters)])
```

Key points:
- `isLoading` starts `true` and turns off after the very first fetch — covers the blank initial grid
- `setIsFiltering(true)` is inside the `setTimeout` — skeletons only appear when a fetch actually fires, not on every debounce tick
- `loadDesignsRef.current` always points to the latest `loadDesigns` — no stale closure
- The existing `useEffect` that calls `loadDesigns()` on mount (triggered by initial `activeFilters`) may need to be removed or guarded to avoid a double initial fetch — the implementer should verify there is only one mount-time fetch

Add a `SkeletonCard` component (module-level, before `export default`):
```tsx
function SkeletonCard() {
  return (
    <div className="flex flex-col border border-border/40 rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}
```

In the card grid render, replace the existing `filteredDesigns.map(...)` block:
```tsx
{(isLoading || isFiltering)
  ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
  : filteredDesigns.map((design) => ( /* existing card JSX unchanged */ ))
}
```

The skeleton count (6) fills the visible grid on most viewports. `animate-pulse` (Tailwind built-in) provides the shimmer.

### Files changed
- `app/page.tsx`

---

## Area 3 — Visit Site Touch Target (Mobile)

### Problem

The "Visit site" button in `components/site-detail-panel.tsx` has `py-2` (8px vertical padding), giving it ~30px total height. Apple HIG and Material Design both require a minimum 44px touch target. Additionally, the footer container has no safe-area inset, so on iPhones with a home indicator the button sits directly above the system UI gesture area.

### Solution

**`app/globals.css`** — add a CSS custom property for safe area (add alongside other `:root` or base variables):
```css
:root {
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

This indirection is required because Tailwind v4's arbitrary value parser does not reliably compile `env()` directly inside `max()` — using `var(--safe-bottom)` is the safe cross-browser approach.

**`components/site-detail-panel.tsx`**

Footer container (line ~162) — change `py-3` to account for safe area:
```diff
- <div className="flex-shrink-0 border-t border-border px-4 py-3 flex gap-2">
+ <div className="flex-shrink-0 border-t border-border px-4 pt-3 pb-[max(12px,var(--safe-bottom))] flex gap-2">
```

Visit site anchor (line ~167) — add minimum height:
```diff
- className="flex items-center justify-center gap-1.5 flex-1 text-xs border border-border rounded-md py-2 ..."
+ className="flex items-center justify-center gap-1.5 flex-1 text-xs border border-border rounded-md py-2 min-h-[44px] ..."
```

`var(--safe-bottom)` resolves to `0px` on non-notch devices, so there is no visual change on those devices. On iPhone with the home indicator it expands the footer padding to clear the gesture zone.

### Files changed
- `app/globals.css`
- `components/site-detail-panel.tsx`

---

## Non-goals
- No virtualization of the card list
- No changes to the filter API or SQL queries
- No changes to animation variants or motion components
- No changes to desktop layout breakpoints
