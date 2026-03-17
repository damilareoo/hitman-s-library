# Performance, Scroll & Touch — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix body scroll escaping the preview panel, add skeleton loading for initial page load and category filtering, and fix the mobile "Visit site" touch target.

**Architecture:** Three independent tasks across three files. No new dependencies. Each task is self-contained and safe to implement in isolation.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4

---

## File Map

| File | What changes |
|------|-------------|
| `app/globals.css` | Add `html`/`body` overflow lock; add `--safe-bottom` CSS variable |
| `app/page.tsx` | Fix grid wrapper height; remove JS body scroll lock effect; add `isPageLoading`/`isFiltering` states; add `loadDesignsRef`; replace filter `useEffect` with debounced version; add mount `useEffect`; add `SkeletonCard` component; update grid render |
| `components/site-detail-panel.tsx` | Footer safe-area padding; Visit site button `min-h-[44px]` |

---

## Task 1: Body Scroll Lock

**Files:**
- Modify: `app/globals.css:158-183` (html and body rules)
- Modify: `app/page.tsx:445` (grid wrapper)
- Modify: `app/page.tsx:131-140` (mobile scroll lock useEffect — delete it)

**Context:** Currently `html`/`body` have no `overflow: hidden`, so when scroll reaches the end of the preview panel it chains to the page body. The grid wrapper uses `min-h` which lets the page grow taller than the viewport. The card list at line 532 already has `flex-1 overflow-y-auto` which handles all scrolling once the body is locked. The mobile JS body scroll lock (lines 131–140) becomes a no-op after this change and should be removed.

- [ ] **Step 1: Add overflow lock to html and body**

In `app/globals.css`, find the `html` rule at line 158 and add `height` and `overflow`:

```css
html {
  color-scheme: light;
  transition: color-scheme 0.3s ease-out !important;
  height: 100dvh;
  overflow: hidden;
}
```

Find the `body` rule at line 169 and add `height` and `overflow` (after `will-change`):

```css
body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 40px 40px;
  background-attachment: fixed;
  transition: background-color 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              color 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
  will-change: background-color, color;
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 2: Fix grid wrapper from min-h to h**

In `app/page.tsx` line 445, change:
```tsx
// Before
<div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[calc(100vh-64px)]">

// After
<div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-[calc(100dvh-64px)] overflow-hidden">
```

- [ ] **Step 3: Delete the mobile JS body scroll lock useEffect**

In `app/page.tsx`, delete lines 131–140 entirely:
```tsx
// DELETE this entire block
// Lock body scroll when mobile detail sheet is open
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

- [ ] **Step 4: Verify in browser**

Run `bun dev`, open the app. Scroll the preview panel to the bottom of a screenshot and keep scrolling. The page body should not scroll. The left card list should still scroll normally.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "fix: lock body scroll to contain preview panel scroll"
```

---

## Task 2: Skeleton Loading (Initial Load + Category Filter)

**Files:**
- Modify: `app/page.tsx` (multiple sections — states, ref, effects, component, render)

**Context:**

Key facts about the existing code:
- `isLoading` at line 66 is already used for the Add Link form — **do not repurpose it**. Add a separate `isPageLoading` state.
- `loadDesigns` is declared at line 162 as `const loadDesigns = async () => { ... }`. It captures `activeFilters` from the component closure.
- The existing filter `useEffect` at lines 120–123 calls `loadDesigns()` on every `activeFilters` change, including initial mount. **Replace this effect entirely.**
- The `filteredDesigns` variable at line 117 is just `const filteredDesigns = designs` — no filtering, just an alias.
- The card grid render starts at line 541 with `<AnimatePresence mode="popLayout">` wrapping `{filteredDesigns.map(...)}`.

**The plan:**

Replace the single filter effect with two separate effects:
1. **Mount effect** (runs once, `[]` deps): sets `isPageLoading = true`, loads designs, sets `isPageLoading = false`
2. **Filter effect** (runs on activeFilters change, skips initial run): 200ms debounce, sets `isFiltering = true` during fetch

To skip the initial run of the filter effect, use a `isFirstFilterRun` ref that starts `true` and flips to `false` after the first run.

To avoid stale closures in the debounce timeout, store `loadDesigns` in a ref that's updated every render.

- [ ] **Step 1: Add isPageLoading and isFiltering states**

In `app/page.tsx`, find line 87 (end of state declarations, after `const [categories, setCategories] = ...`):

```tsx
// Add after line 87, before the clearSubmitTimers function
const [isPageLoading, setIsPageLoading] = useState(true)
const [isFiltering, setIsFiltering] = useState(false)
```

**Note:** The spec names the initial loading state `isLoading`, but that name is already taken at line 66 (used for the Add Link form spinner). The plan intentionally uses `isPageLoading` to avoid shadowing that state. Do not rename it back to `isLoading`.

- [ ] **Step 2: Add loadDesignsRef after the loadDesigns function**

`loadDesigns` is declared at line 162. Immediately after its closing `}` at line 202, add:

```tsx
// Ref to always hold the latest loadDesigns — prevents stale closures in debounced effect
const loadDesignsRef = useRef(loadDesigns)
loadDesignsRef.current = loadDesigns
```

- [ ] **Step 3: Add isFirstFilterRun ref**

Immediately after `const hasAnimated = useRef(false)` (line 114), add:

```tsx
const isFirstFilterRun = useRef(true)
```

- [ ] **Step 4: Replace the existing filter useEffect**

Find and replace lines 119–123:

```tsx
// Before (lines 119-123)
// Load designs on mount and when filters change
useEffect(() => {
  loadDesigns()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [JSON.stringify(activeFilters)])

// After — two separate effects
// Initial page load
useEffect(() => {
  loadDesignsRef.current().finally(() => setIsPageLoading(false))
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

// Filter changes — debounced, skips initial mount
useEffect(() => {
  if (isFirstFilterRun.current) {
    isFirstFilterRun.current = false
    return
  }
  const t = setTimeout(() => {
    setIsFiltering(true)
    loadDesignsRef.current().finally(() => setIsFiltering(false))
  }, 200)
  return () => clearTimeout(t)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [JSON.stringify(activeFilters)])
```

- [ ] **Step 5: Add the SkeletonCard component**

Add this function before the `export default function DesignLibrary()` line (around line 62):

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

- [ ] **Step 6: Update the grid render to show skeletons**

In `app/page.tsx`, find line 541 where `<AnimatePresence mode="popLayout">` wraps `{filteredDesigns.map(...)}`.

Replace the `<AnimatePresence>` block with:

```tsx
<AnimatePresence mode="popLayout">
  {(isPageLoading || isFiltering)
    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
    : filteredDesigns.map((design) => (
        // ... existing card motion.div JSX unchanged ...
      ))
  }
</AnimatePresence>
```

Keep the existing card `motion.div` JSX (lines 543–589) exactly as-is inside the ternary.

- [ ] **Step 7: Verify in browser**

Run `bun dev`. On first load, 6 skeleton cards should appear and then be replaced by real cards. When clicking a category, skeletons should appear briefly then swap to filtered results. No blank grid at any point.

**React Strict Mode note:** In development, React 19 Strict Mode mounts, unmounts, and remounts effects. This means the filter effect's `isFirstFilterRun` guard only prevents a double fetch on the true initial mount — on the Strict Mode remount, `isFirstFilterRun.current` is already `false`, so you may see two fetches on first load in development. This is expected dev-only behavior and does not occur in production.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add skeleton loading for initial page load and category filtering"
```

---

## Task 3: Visit Site Touch Target + Safe Area

**Files:**
- Modify: `app/globals.css` (add `--safe-bottom` variable to `:root`)
- Modify: `components/site-detail-panel.tsx:162,167` (footer padding + button height)

**Context:** The footer div at line 162 of `site-detail-panel.tsx` has `py-3` — no safe area inset. The Visit site anchor at line 167 has `py-2` giving ~30px height, below the 44px minimum. `env(safe-area-inset-bottom)` cannot be used directly in Tailwind v4 arbitrary values reliably — use a CSS variable instead.

- [ ] **Step 1: Add --safe-bottom CSS variable to globals.css**

In `app/globals.css`, find the `:root` block at line 9. Add `--safe-bottom` as the last variable before the closing `}`:

```css
:root {
  /* ... existing variables ... */
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 2: Update footer padding in site-detail-panel.tsx**

In `components/site-detail-panel.tsx` line 162, change:

```tsx
// Before
<div className="flex-shrink-0 border-t border-border px-4 py-3 flex gap-2">

// After
<div className="flex-shrink-0 border-t border-border px-4 pt-3 pb-[max(12px,var(--safe-bottom))] flex gap-2">
```

- [ ] **Step 3: Update Visit site button minimum height**

In `components/site-detail-panel.tsx` line 167, add `min-h-[44px]` to the anchor className:

```tsx
// Before
className="flex items-center justify-center gap-1.5 flex-1 text-xs border border-border rounded-md py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors font-mono"

// After
className="flex items-center justify-center gap-1.5 flex-1 text-xs border border-border rounded-md py-2 min-h-[44px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors font-mono"
```

- [ ] **Step 4: Verify in browser**

Open browser DevTools, toggle device toolbar to iPhone (e.g. iPhone 14 Pro). The Visit site button should be at least 44px tall. On a real iPhone, the footer should not be hidden behind the home indicator. On desktop/non-notch devices, the footer looks identical to before.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/site-detail-panel.tsx
git commit -m "fix: 44px visit site touch target and safe area inset on mobile"
```
