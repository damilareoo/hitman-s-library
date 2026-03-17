# Performance, Scroll & Touch — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three UX issues — body scroll escaping the preview panel, laggy/unresponsive category filtering, and undersized touch target on the mobile "Visit site" button.

**Architecture:** Three focused, independent changes across `app/globals.css`, `app/page.tsx`, and `components/site-detail-panel.tsx`. No new dependencies. No DB changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion v11

---

## Area 1 — Body Scroll Lock

### Problem

When the user scrolls the preview panel to the bottom of a screenshot and continues scrolling, the page body scrolls — making the card grid jump or the overall page move. `overscroll-contain` on the preview panel is not sufficient because `html`/`body` have no `overflow: hidden`, so scroll events that escape the panel propagate to the document.

### Root Cause

- `app/globals.css`: no `overflow: hidden` on `html` or `body`
- `app/page.tsx`: the grid wrapper uses `min-h-[calc(100vh-64px)]` — a minimum height, not a fixed height — so the page can grow taller than the viewport and become scrollable

### Solution

**`app/globals.css`** — add after existing base styles:
```css
html,
body {
  height: 100dvh;
  overflow: hidden;
}
```

**`app/page.tsx`** — change the grid wrapper class:
```
min-h-[calc(100vh-64px)]
→
h-[calc(100dvh-64px)] overflow-hidden
```

The left card list already has `flex-1 overflow-y-auto` on its inner scroll container — this becomes the sole scroll container for the left side. The right detail panel already has `h-[calc(100vh-64px)]` with internal scrollable tabs. After this change, no part of the page body scrolls; all scrolling is contained within designated elements.

### Files changed
- `app/globals.css`
- `app/page.tsx`

---

## Area 2 — Category Filter Debounce + Skeleton Loading

### Problem

Every category click immediately fires a fetch to `/api/design/filter-advanced`. The SQL query runs LEFT JOINs with subqueries to aggregate colors and typography, so responses take 300–800ms. During this time there is no visual feedback — the card grid appears frozen, then suddenly swaps. This creates a "laggy" feel.

### Solution

**Debounce:** Wrap the filter `useEffect` in a 200ms debounce. If the user clicks multiple categories quickly, only one request fires (when they stop clicking).

**Skeleton loading state:** Show animated skeleton cards during the fetch. Skeletons match the real card shape so the layout does not jump when results arrive.

**`app/page.tsx`**

Add `isFiltering` state:
```tsx
const [isFiltering, setIsFiltering] = useState(false)
```

Replace the existing filter `useEffect`:
```tsx
useEffect(() => {
  setIsFiltering(true)
  const t = setTimeout(() => {
    loadDesigns().finally(() => setIsFiltering(false))
  }, 200)
  return () => clearTimeout(t)
}, [JSON.stringify(activeFilters)])
```

Skeleton card component (module-level, same file or extracted):
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

In the card grid render, replace the `filteredDesigns.map(...)` section:
```tsx
{isFiltering
  ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
  : filteredDesigns.map((design) => ( /* existing card JSX */ ))
}
```

The skeleton count (6) matches the default visible grid rows on most viewports. No animation variants needed — `animate-pulse` (Tailwind) handles the shimmer.

### Files changed
- `app/page.tsx`

---

## Area 3 — Visit Site Touch Target (Mobile)

### Problem

The "Visit site" button in `components/site-detail-panel.tsx` has `py-2` (8px vertical padding), giving it ~30px total height. Apple HIG and Material Design both require a minimum 44px touch target. Additionally, the footer container has no safe-area inset, so on iPhones with a home indicator the button sits directly above the system UI gesture area.

### Solution

**`components/site-detail-panel.tsx`**

Footer container — change `py-3` to account for safe area:
```
py-3
→
pt-3 pb-[max(12px,env(safe-area-inset-bottom))]
```

Visit site button — add minimum height:
```
py-2
→
py-2 min-h-[44px]
```

The `env(safe-area-inset-bottom)` value is `0px` on non-notch devices so this has no effect there. On iPhone with home indicator it expands the footer to clear the gesture zone.

### Files changed
- `components/site-detail-panel.tsx`

---

## Non-goals
- No virtualization of the card list (out of scope for this change)
- No changes to the filter API or SQL queries
- No changes to desktop layout breakpoints
- No changes to animation variants or motion components
