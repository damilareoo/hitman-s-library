# UX Polish — Theme, Scroll, Colors, Categories, Mobile Design

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five UX regressions and improvements: instant theme switching, scroll containment in preview, OKLCH color format toggle, design-context categorization, and mobile bottom sheet scroll lock.

**Architecture:** Five focused, independent fixes across `app/page.tsx`, `app/layout.tsx`, `components/preview-tab.tsx`, `components/colors-tab.tsx`, `app/api/design/extract/detectIndustry.ts`, and `app/api/design/categories/route.ts`. No new dependencies. No DB migrations required.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, next-themes, motion/react (Framer Motion v11), Neon PostgreSQL

---

## Area 1 — Theme Switch (instant, Vercel/v0 style)

### Problem
The current implementation uses a `ThemeTransitionOverlay` component — a full-page clip-path circle animation (600ms) that blocks interaction during the transition. It is over-engineered. Additionally, theme state is managed manually in `page.tsx` with `useState`, `localStorage`, and direct DOM class manipulation. The `ThemeProvider` component (`components/theme-provider.tsx`) exists but is **not currently in the component tree** — it has never been added to `layout.tsx`.

### Solution
1. Add `<ThemeProvider>` to `layout.tsx`, wrapping `MotionProvider`.
2. Remove the hand-rolled inline `<script>` in `layout.tsx` — `next-themes` handles flash-of-unstyled-content prevention internally via `suppressHydrationWarning` (already present on `<html>`).
3. In `page.tsx`, replace manual theme state with `useTheme()` from `next-themes`.
4. Remove the `ThemeTransitionOverlay` component and all related state.
5. The icon swap animation (existing `motion.span key={theme}`) stays as the only visual feedback.

### Files changed

**`app/layout.tsx`**
- Add `import { ThemeProvider } from '@/components/theme-provider'`
- Remove the entire `<script dangerouslySetInnerHTML={...} />` block (the one that reads `localStorage` and toggles `.dark` — lines 110–153).
- Wrap `<MotionProvider>` in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">`:
```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
  <MotionProvider>
    {children}
  </MotionProvider>
</ThemeProvider>
```
- `attribute="class"` tells next-themes to toggle the `dark` class on `<html>`, which is what Tailwind expects.
- `storageKey="theme"` preserves compatibility with any existing localStorage entries.

**`app/page.tsx`**
- Add `import { useTheme } from 'next-themes'`
- Remove `import { ThemeTransitionOverlay } from '@/components/theme-transition-overlay'`
- Remove: `theme` useState, `themeOverlay` useState, `themeButtonRef` useRef, `toggleTheme` function, `handleThemeTransitionComplete` function, the `useEffect` that syncs theme from DOM.
- Add: `const { theme, setTheme } = useTheme()`
- Toggle button `onClick`: `() => setTheme(theme === 'dark' ? 'light' : 'dark')`
- Remove: `ref={themeButtonRef}`, `disabled={!!themeOverlay}` from the toggle button.
- Remove: the `{themeOverlay && <ThemeTransitionOverlay ... />}` block at the bottom of the JSX.
- Remove: `document.documentElement.setAttribute('data-theme-transitioning', 'true')` (no longer needed).

**`app/globals.css`**
- Remove lines 1504–1506:
```css
[data-theme-transitioning] * {
  transition: none !important;
}
```

**Delete:** `components/theme-transition-overlay.tsx` — no longer needed.

---

## Area 2 — Preview Scroll Containment

### Problem
When the user scrolls to the bottom of the screenshot in the preview panel, continued scroll input chains to the page body (default browser `overscroll` behaviour). The body scrolls, then bounces/resets, making the preview appear to loop back to the hero.

On mobile, the bottom sheet `<dialog>` has `max-h-[70vh]` — this sets a *maximum* height but not an *explicit* height. `SiteDetailPanel`'s inner `h-full` resolves to 0 or the content height rather than the container height, so scroll is never properly contained inside the panel.

Also on mobile: when the bottom sheet opens, body scroll is not locked. Scrolling gestures on the sheet also scroll the background card list.

### Solution
1. Add `overscroll-contain` (Tailwind) to the inner scroll div in `preview-tab.tsx`. Prevents scroll propagation to the body when the preview hits its bottom.
2. Change the mobile bottom sheet from `max-h-[70vh]` to `h-[70vh]` in `app/page.tsx`. The dialog is already marked `md:hidden`, so this has no effect on desktop.
3. Add body scroll lock in `app/page.tsx` via `useEffect`:

```tsx
useEffect(() => {
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  if (selectedDesign && isMobile) {
    document.body.style.overflow = 'hidden'
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [selectedDesign])
```

Cleanup always restores `overflow` to `''` (empty string = browser default), which is safe regardless of prior state.

### Files changed
- **`components/preview-tab.tsx`** — add `overscroll-contain` class to the `scrollRef` div (the one with `h-full overflow-y-auto overflow-x-hidden`).
- **`app/page.tsx`** — change `max-h-[70vh]` → `h-[70vh]` on the `<dialog>` element (line ~635); add the body scroll lock `useEffect`.

---

## Area 3 — OKLCH Color Format Toggle

### Problem
The current layout shows both `hex_value` and the raw `oklch(0.623 0.214 31.4)` string simultaneously for each color. The OKLCH numbers have no labels or units, making them hard to read. The dual-row display also adds visual noise for users who only care about HEX.

### Solution
Add a global `format` toggle (`'hex' | 'oklch'`) to `ColorsTab`. A small pill button in the section header switches all rows at once. This reduces noise by default (HEX only) while keeping OKLCH accessible for users who want it.

- **HEX mode (default):** shows `#C0523A` with a copy button.
- **OKLCH mode:** shows `oklch(62% 0.21 31°)` — lightness as integer %, chroma to 2 decimal places, hue as integer degrees — with a copy button. The value copied is the full CSS-valid string (e.g. `oklch(0.623 0.21 31)`).

The color swatch is always visible in both modes.

### OKLCH parsing helper
```ts
function parseOklch(s: string): { l: number; c: string; h: number } | null {
  const m = s.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return null
  return {
    l: Math.round(parseFloat(m[1]) * 100),
    c: parseFloat(m[2]).toFixed(2),
    h: Math.round(parseFloat(m[3])),
  }
}
// Display: `oklch(${parsed.l}% ${parsed.c} ${parsed.h}°)`
// Copy value: the original color.oklch string (CSS-valid)
```

### Files changed
- **`components/colors-tab.tsx`** — add `format` state (`useState<'hex'|'oklch'>('hex')`); add a pill toggle button in the header row; update per-row rendering to show either HEX or formatted OKLCH based on `format`.

---

## Area 4 — Design-Context Categorization

### Problem
The current category set is industry-biased (SaaS, Fintech, Healthcare, etc.) and detection is based on fragile keyword matching against URL and title. Creative agencies, portfolios, and editorial sites land in "General" or get misclassified (e.g. any Next.js site becomes "SaaS").

### Solution

**New category set** (design-context-first):
- `Agency` — creative/design/dev studios
- `Portfolio` — individual designer or developer sites
- `SaaS / App` — web apps, dashboards, tools
- `E-commerce` — online stores and marketplaces
- `Marketing` — product marketing pages, landing pages
- `Finance` — banks, fintech, crypto, payments
- `Editorial` — blogs, news, magazines, publications
- `Entertainment` — streaming, gaming, media
- `Other` — fallback

### `detectIndustry.ts` — full rewrite

Use an **ordered array of tuples** (not a `Record`) so iteration order is guaranteed. First match wins.

```ts
// app/api/design/extract/detectIndustry.ts

const DESIGN_CONTEXT: Array<[string, string[]]> = [
  ['Agency',       ['agency', 'studio', 'creative', 'branding', 'production house', 'design firm']],
  ['Portfolio',    ['portfolio', 'freelance', 'case study', 'my work', 'about me', 'i design', 'i build']],
  ['E-commerce',   ['shop', 'store', 'cart', 'checkout', 'shopify', 'woocommerce']],
  ['Finance',      ['bank', 'fintech', 'payment', 'crypto', 'invest', 'trading', 'wallet', 'revolut', 'stripe', 'paypal']],
  ['SaaS / App',   ['dashboard', 'platform', 'workspace', 'analytics', 'saas', 'software as a service']],
  ['Marketing',    ['pricing', 'get started', 'sign up free', 'free trial', 'launch']],
  ['Editorial',    ['blog', 'news', 'magazine', 'article', 'publication', 'journal']],
  ['Entertainment',['stream', 'gaming', 'music', 'video', 'entertainment', 'watch', 'play']],
]

export function detectIndustry(title: string, url: string, metadata: { description?: string; [key: string]: unknown }): string {
  const signals = [title, url, metadata.description ?? ''].join(' ').toLowerCase()

  for (const [category, keywords] of DESIGN_CONTEXT) {
    if (keywords.some(kw => signals.includes(kw))) {
      return category
    }
  }

  return 'Other'
}
```

**Notes on ordering:**
- `Agency` and `Portfolio` are checked before `SaaS / App` so creative studios don't get misclassified as SaaS.
- `E-commerce` keywords (`shop`, `store`, `cart`) are specific enough not to conflict.
- `Finance` uses brand names (revolut, stripe) as strong signals.
- `SaaS / App` uses `dashboard`, `platform`, `workspace` — more specific than the old `app`/`software`/`tool` which matched too broadly.
- `Marketing` only fires on action-intent phrases (`get started`, `pricing`, `free trial`), not generic `product`.
- `Entertainment` is last among content categories; `play` and `watch` are late to avoid false positives.

### `categories/route.ts` — extend `normalize()` and update `DEPRIORITIZED`

Add old→new mappings and retire old category names:

```ts
function normalize(raw: string): string {
  const s = raw.trim()
  // Old category → new category mappings
  if (/^saas$/i.test(s)) return 'SaaS / App'
  if (/^fintech$/i.test(s)) return 'Finance'
  if (/^productivity$/i.test(s)) return 'SaaS / App'
  if (/^social\s*media$/i.test(s)) return 'Entertainment'
  if (/^health(care|tech)?$/i.test(s)) return 'Other'
  if (/^travel$/i.test(s)) return 'Other'
  if (/^education$/i.test(s)) return 'Other'
  if (/^marketing$/i.test(s)) return 'Marketing'
  if (/^e-commerce$/i.test(s)) return 'E-commerce'
  if (/^entertainment$/i.test(s)) return 'Entertainment'
  if (/^portfolio$/i.test(s)) return 'Portfolio'
  if (/^agency$/i.test(s)) return 'Agency'
  // Retire "General" and "Uncategorized" → "Other"
  if (/^(general|uncategorized)$/i.test(s)) return 'Other'
  // Junk
  if (/^code[\s/]+bugs$/i.test(s)) return 'Other'
  if (/^[a-z]$/.test(s)) return 'Other'
  // Capitalize first letter as fallback
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const DEPRIORITIZED = ['Other']
```

`DEPRIORITIZED` now contains only `'Other'` — `'General'` and `'Uncategorized'` are normalized away and never appear in the sidebar.

### Files changed
- **`app/api/design/extract/detectIndustry.ts`** — full rewrite (see above).
- **`app/api/design/categories/route.ts`** — replace `normalize()` body with expanded version above; replace `DEPRIORITIZED` constant.

---

## Area 5 — Mobile Bottom Sheet Scroll Lock

Fully covered in Area 2. Summary:
- `h-[70vh]` (was `max-h-[70vh]`) on the `<dialog>` — safe, dialog is `md:hidden`
- Body scroll lock `useEffect` keyed on `selectedDesign`
- `overscroll-contain` on preview scroll container

---

## Non-goals
- No DB schema changes.
- No new npm packages.
- No changes to the extraction pipeline or screenshot logic.
- No changes to desktop layout or the three-column grid.
- No re-categorization of existing entries in the DB (normalize() handles display-time mapping at read time).
