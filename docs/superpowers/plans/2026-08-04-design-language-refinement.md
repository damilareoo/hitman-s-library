# Design Language Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the foundations of the existing warm-paper/ink design language (type scale, ink levels, edges, radius, motion) and sweep every surface to conform, plus one layout change: a roomier inspector (sidebar 2 / gallery 6 / panel 4).

**Architecture:** Tokens first in `app/globals.css` (+ a `lib/motion.ts` constants module), then shared primitives (`Spinner`, `SectionLabel`, copy feedback), then per-surface sweeps. No behavior changes except: `/` focuses search, panel error gets retry, copy feedback pattern unified. Spec: `docs/superpowers/specs/2026-08-04-design-language-refinement-design.md`.

**Tech Stack:** Next.js (app router, Turbopack), Tailwind v4 (CSS-first `@theme`/`@utility`), motion/react, Phosphor icons, Geist sans/mono.

## Global Constraints

- No emojis anywhere in code or copy.
- Do not touch deployed/live URLs.
- Geist only; no new fonts, colors, or modules. Refine, don't add.
- No UI text below 10px after this work.
- One easing everywhere: `cubic-bezier(0.22, 1, 0.36, 1)` (springs only for the mobile sheet drag, unchanged).
- Radius: `rounded-[4px]` for boxes, `rounded-full` for pills/swatches/dots. Mobile sheet keeps its 20px top radius.
- Every task: `pnpm type-check` must pass before commit.
- `data/changelog.ts` must get a prepended release entry before the work ships (Task 12).
- Verification workflow: dev server runs at `pnpm dev` (Turbopack); visual checks in light AND dark mode.

## Token vocabulary (produced by Task 1, consumed everywhere)

| Class | Meaning |
|---|---|
| `text-ink` / `text-ink-2` / `text-ink-3` / `text-ink-4` | foreground at 100% / 62% / 40% / 24% |
| `border-edge-strong` / `border-edge` / `border-edge-faint` | `--border` at 70% / 50% / 30% |
| `text-micro` | 10px mono uppercase, tracking 0.08em |
| `text-meta` | 11px mono |
| `text-ui` | 12px mono |
| `text-bodytext` | 13px sans, tracking −0.01em |
| `text-titletext` | 14px sans semibold, tracking −0.02em |
| `lib/motion.ts`: `EASE`, `DUR` | `EASE = [0.22, 1, 0.36, 1]`; `DUR = { exit: 0.12, color: 0.2, move: 0.3, reveal: 0.45 }` (seconds, for motion/react) |
| CSS vars `--ease-sig`, `--dur-1/2/3/4` | same values for plain CSS (`120ms/200ms/300ms/450ms`) |

Note: utility names are `text-bodytext`/`text-titletext` (not `text-body`/`text-title`) to avoid colliding with Tailwind's `text-{color}` utilities against the `--color-body`-style namespace; `text-micro`/`text-meta`/`text-ui` have no collisions.

---

### Task 1: Foundation tokens + system fixes

**Files:**
- Modify: `app/globals.css`
- Create: `lib/motion.ts`
- Modify: `app/layout.tsx` (viewport themeColor only)

**Interfaces:**
- Produces: everything in "Token vocabulary" above. Later tasks use these class names and imports verbatim: `import { EASE, DUR } from '@/lib/motion'`.

- [ ] **Step 1: Add ink/edge colors, motion vars, type utilities, and the missing `fade-in-up` keyframe to `app/globals.css`**

Insert inside `:root` (after the `--color-running` line):

```css
  /* Ink levels — all muted text derives from these */
  --ink: var(--foreground);
  --ink-2: oklch(from var(--foreground) l c h / 0.62);
  --ink-3: oklch(from var(--foreground) l c h / 0.4);
  --ink-4: oklch(from var(--foreground) l c h / 0.24);

  /* Edge weights — all borders derive from these */
  --edge-strong: oklch(from var(--border) l c h / 0.7);
  --edge: oklch(from var(--border) l c h / 0.5);
  --edge-faint: oklch(from var(--border) l c h / 0.3);

  /* Motion */
  --ease-sig: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-1: 120ms;
  --dur-2: 200ms;
  --dur-3: 300ms;
  --dur-4: 450ms;
```

(Relative oklch means the `.dark` block needs no duplicates — the values track `--foreground`/`--border` automatically. Do NOT add them to `.dark`.)

Insert inside the `@theme inline` block (after `--color-sidebar-ring`):

```css
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-ink-4: var(--ink-4);
  --color-edge-strong: var(--edge-strong);
  --color-edge: var(--edge);
  --color-edge-faint: var(--edge-faint);
```

Append after the `@layer base` block (top level, not nested):

```css
/* ============================================================================
   TYPE SCALE — the only UI text sizes. Content (specimens, changelog h1) exempt.
   ============================================================================ */

@utility text-micro {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
}

@utility text-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0;
}

@utility text-ui {
  font-family: var(--font-mono);
  font-size: 12px;
}

@utility text-bodytext {
  font-family: var(--font-sans);
  font-size: 13px;
  letter-spacing: -0.01em;
}

@utility text-titletext {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

Add next to the existing `scale-in` keyframe (fixes the latent bug — `type-specimen-card.tsx` references `fade-in-up`, which was never defined, leaving specimens at inline `opacity: 0` unless tw-animate-css happened to define it):

```css
/* Used inline in type-specimen-card.tsx */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Create `lib/motion.ts`**

```ts
// Motion constants for motion/react — mirrors --ease-sig / --dur-* in globals.css.
export const EASE = [0.22, 1, 0.36, 1] as const

export const DUR = {
  exit: 0.12,
  color: 0.2,
  move: 0.3,
  reveal: 0.45,
} as const
```

- [ ] **Step 3: Fix `viewport.themeColor` in `app/layout.tsx`**

Replace the `themeColor` array values so they match the real background tokens:

```ts
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
```

- [ ] **Step 4: Verify**

Run: `pnpm type-check` — expected: no errors.
Run dev server, load `/` in light and dark: page renders unchanged (tokens are additive), type specimens in the panel's Type tab now animate in instead of potentially staying invisible.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css lib/motion.ts app/layout.tsx
git commit -m "Design tokens: ink levels, edges, type scale, motion vars; fix themeColor + fade-in-up keyframe"
```

---

### Task 2: Shared primitives

**Files:**
- Create: `components/ui/spinner.tsx`
- Create: `components/ui/section-label.tsx`
- Create: `lib/use-copied.ts`
- Modify: `components/tab-empty-state.tsx`

**Interfaces:**
- Consumes: token classes from Task 1.
- Produces:
  - `Spinner({ className?: string })` — 16px hairline ring; callers may pass palette overrides via `className` (presentation mode passes white-alpha classes).
  - `SectionLabel({ label: string, count?: number })`
  - `useCopied()` → `{ copiedId: number | string | null, markCopied: (id: number | string) => void }` (1.5s auto-reset, timer-safe on repeat calls)

- [ ] **Step 1: Create `components/ui/spinner.tsx`**

```tsx
// The one spinner. Palette can be overridden via className (e.g. presentation mode).
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`w-4 h-4 rounded-full border border-edge border-t-ink-3 animate-spin ${className}`}
    />
  )
}
```

- [ ] **Step 2: Create `components/ui/section-label.tsx`**

```tsx
// The one section-heading treatment: micro label + tabular count.
export function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-micro text-ink-3">{label}</span>
      {typeof count === 'number' && (
        <span className="text-meta text-ink-4 tabular-nums">{count}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `lib/use-copied.ts`**

```ts
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
```

- [ ] **Step 4: Refine `components/tab-empty-state.tsx` to the token system**

Replace the two returns' class names (structure and logic unchanged):

- Plain message `<p>`: `text-xs text-muted-foreground` → `text-meta text-ink-3`
- Error icon row: `text-muted-foreground/60` → `text-ink-3`; label span `text-[10px] uppercase tracking-widest font-mono` → `text-micro`
- Explanation `<p>`: `text-xs text-muted-foreground` → `text-bodytext text-ink-2`
- `<summary>`: `text-[10px] font-mono text-muted-foreground/40 cursor-pointer hover:text-muted-foreground/60` → `text-micro text-ink-4 cursor-pointer hover:text-ink-3 transition-colors`
- Technical details `<p>`: `font-mono text-[9px] text-muted-foreground/40` → `text-meta text-ink-4` (kills a 9px)

- [ ] **Step 5: Verify + commit**

Run: `pnpm type-check` — expected: no errors. In the app, open a site with no colors extracted (or filter to one) and confirm the empty tab state renders with the new treatment.

```bash
git add components/ui/spinner.tsx components/ui/section-label.tsx lib/use-copied.ts components/tab-empty-state.tsx
git commit -m "Shared primitives: Spinner, SectionLabel, useCopied; TabEmptyState on token system"
```

---

### Task 3: Layout split + header (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx` (header block ~lines 236–345, body grid ~line 348, gallery/aside/panel col-spans, grid columns ~line 439)

**Interfaces:**
- Consumes: token classes, `EASE`/`DUR` from `@/lib/motion`.
- Produces: `searchRef` (a `useRef<HTMLInputElement>(null)`) used by the `/` shortcut; column layout that Task 6+ panel work assumes (panel at `md:col-span-4`).

- [ ] **Step 1: Column split**

- Gallery `<main>`: `md:col-span-7` → `md:col-span-6`
- Desktop panel wrapper `<div className="hidden md:flex md:col-span-3 ...">` → `md:col-span-4`
- Card grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` → `grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3`

- [ ] **Step 2: `/` search shortcut + keycap hint**

Add `const searchRef = useRef<HTMLInputElement>(null)` beside the other refs. Extend the existing keydown effect (the one handling `p`):

```tsx
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
```

On the desktop search input add `ref={searchRef}`, and add `onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur() }}`. After the input, before the clear button, add the hint (only shown when empty — the clear X occupies the slot otherwise):

```tsx
            {!activeFilters.search && (
              <kbd className="absolute right-2 flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[4px] border border-edge text-micro text-ink-4 pointer-events-none">
                /
              </kbd>
            )}
```

- [ ] **Step 3: Header treatments (mapping)**

| Element | From | To |
|---|---|---|
| Wordmark `h1` | `text-[15px] font-semibold tracking-[-0.04em]` | keep sizes (this IS the wordmark token); no change except confirm |
| Search input | `text-[12px] font-mono ... border-border/50 rounded-[3px] ... placeholder:text-muted-foreground/40 focus:border-foreground/30` | `text-ui ... border-edge rounded-[4px] ... placeholder:text-ink-4 focus:border-foreground/30` |
| Search icon / clear X | `text-muted-foreground/50`, `text-muted-foreground/40 hover:text-muted-foreground` | `text-ink-3`, `text-ink-4 hover:text-ink-2` |
| Changelog link | `text-[11px] font-mono text-muted-foreground hover:text-foreground` | `text-meta text-ink-3 hover:text-ink` |
| Sort pills | `px-2 py-0.5 rounded-[3px] text-[10px] font-mono`; active `bg-muted text-foreground border-border/60`; inactive `text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:border-border/40` | `px-2 py-0.5 rounded-[4px] text-meta`; active `bg-muted text-ink border-edge-strong`; inactive `text-ink-4 border-transparent hover:text-ink-2` (drop hover border — one hover signal) |
| Count | `text-[11px] font-mono text-muted-foreground/50 tabular-nums` | `text-meta text-ink-4 tabular-nums` |
| Icon buttons (presentation/sound/theme) | `rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40` | `rounded-[4px] border border-edge-strong text-ink-3 hover:text-ink hover:border-foreground/40` |
| Header chrome | `border-b border-border/60` | `border-b border-edge-strong` |

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check`. Visual: desktop `/` focuses search with visible keycap when empty; panel area visibly wider (4/12); cards 2-across at ~1440px, 3-across only on very wide screens; header controls consistent in both themes.

```bash
git add app/page.tsx
git commit -m "Layout: sidebar 2 / gallery 6 / inspector 4; header on token system with / search shortcut"
```

---

### Task 4: Sidebar, mobile filters, skeletons, grid states (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx` (SkeletonCard ~lines 35–45, sidebar ~lines 351–381, mobile filter block ~lines 386–435, no-results ~lines 449–457, infinite-scroll loader ~lines 477–481, empty panel state ~lines 510–523, mobile sheet ~lines 545–592)

**Interfaces:**
- Consumes: `Spinner` from `@/components/ui/spinner`, token classes.

- [ ] **Step 1: SkeletonCard matches real card metrics**

Real card (post-Task 5): 4px radius, `border-edge`, 16/10 image, metadata `px-3.5 pt-2.5 pb-3` with 13px title line, 11px domain line, 16px swatch row. Replace `SkeletonCard`:

```tsx
function SkeletonCard() {
  return (
    <div className="flex flex-col border border-edge rounded-[4px] overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-muted" />
      <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-2 border-t border-edge-faint">
        <div className="space-y-1.5">
          <div className="h-[13px] bg-muted rounded-[3px] w-3/4" />
          <div className="h-[11px] bg-muted rounded-[3px] w-1/2" />
        </div>
        <div className="flex gap-[3px]">
          {[0, 1, 2, 3].map(i => <div key={i} className="w-4 h-4 rounded-full bg-muted" />)}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Sidebar mapping**

| Element | From | To |
|---|---|---|
| Aside chrome | `border-r border-border/60` | `border-r border-edge-strong` |
| Row button | `rounded-[3px] text-[12.5px]` | `rounded-[4px] text-bodytext` |
| Active row | `text-foreground font-medium bg-muted/70` | keep (already the spec treatment), swap `text-foreground` → `text-ink` |
| Inactive row | `text-muted-foreground/70 hover:text-foreground hover:bg-muted/40` | `text-ink-3 hover:text-ink-2 hover:bg-muted/40` |
| Count span | `text-[10.5px] tabular-nums font-mono opacity-35` | `text-meta text-ink-4 tabular-nums` (remove `opacity-35`) |

- [ ] **Step 3: Mobile filter rail — library materials**

Mobile search: same mapping as desktop search (Task 3 row), `rounded-[4px]`, no keycap hint (touch). Pills (both category and sort — keep `rounded-full`, they are pill objects):

```tsx
className={"shrink-0 px-3.5 py-2 rounded-full text-meta whitespace-nowrap transition-colors border " + (isActive
  ? 'bg-foreground text-background border-foreground'
  : 'bg-muted text-ink-3 border-edge hover:text-ink')}
```

Count inside pill: `<span className="opacity-50 font-mono text-[10px]">` → `<span className="text-ink-4 tabular-nums">` on active pills use `opacity-60` inherit (active pill text is `text-background`; use `<span className="opacity-50 tabular-nums">` there — implement as: count span `className="tabular-nums opacity-50"` so it inherits pill color in both states). Divider `bg-border/60` → `bg-edge-strong`. Mobile chrome `border-b border-border/60` → `border-edge-strong`.

- [ ] **Step 4: Grid states**

No-results block:

```tsx
<div className="col-span-full flex flex-col items-center justify-center py-24 gap-3">
  <p className="text-bodytext text-ink-3">No sites found</p>
  <button
    onClick={() => setActiveFilters({ industries: [], tags: [], search: '', sortBy: 'recent' })}
    className="text-meta text-ink-4 hover:text-ink underline underline-offset-2 transition-colors"
  >
    Clear filters
  </button>
</div>
```

Infinite-scroll loader: replace the inline spinner div with `<Spinner />` (import at top). Desktop empty-panel state: `text-[12px] font-mono text-muted-foreground/30` → `text-meta text-ink-4`; the hint line `text-[9.5px] ... text-muted-foreground/18` → `text-micro text-ink-4` (kills a 9.5px and an /18).

- [ ] **Step 5: Mobile sheet details**

On the sheet content wrapper (`<div className="flex flex-col flex-1 min-h-0" ...>`) add `style={{ touchAction: 'pan-y', paddingBottom: 'var(--safe-bottom)' }}`. Drag handle `bg-foreground/12` → `bg-ink-4`. Panel chrome divider `border-l border-border/60` → `border-edge-strong`.

- [ ] **Step 6: Verify + commit**

Run: `pnpm type-check`. Visual: 390px viewport — pills read as library objects (mono, counts tabular), sheet opens with safe-area padding; desktop — skeletons indistinguishable from card geometry during filter, sidebar hierarchy reads in 3 ink levels.

```bash
git add app/page.tsx
git commit -m "Sidebar, mobile rail, skeletons, and grid states on token system"
```

---

### Task 5: Design card (`components/design-card.tsx`)

**Files:**
- Modify: `components/design-card.tsx`

**Interfaces:**
- Consumes: `EASE`, `DUR` from `@/lib/motion`; token classes.
- Produces: `cardVariants` export shape unchanged (page.tsx imports it — keep the name).

- [ ] **Step 1: Calmer entrance**

```tsx
export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
}
```

Exit stays `{ opacity: 0, transition: { duration: 0.12 } }` (use `DUR.exit`).

- [ ] **Step 2: Single selected treatment**

Delete the `{isSelected && <div className="absolute top-0 ... h-[2px] ..." />}` top-bar block entirely. Container className becomes:

```tsx
className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors " + (isSelected
  ? 'border-foreground/60'
  : 'border-edge hover:border-edge-strong')}
```

(Also removes the per-card `focus-visible:ring-*` classes — the global `:focus-visible` outline takes over.)

- [ ] **Step 3: Image + hover mapping**

| Element | From | To |
|---|---|---|
| Image hover scale | `duration-500 group-hover:scale-[1.02]` | `group-hover:scale-[1.015]` with `transition-[opacity,transform] duration-[450ms] ease-[var(--ease-sig)]` |
| Error domain | `text-[11px] font-mono text-muted-foreground/30` | `text-meta text-ink-4` |
| Visit chip | `rounded-[3px] px-2 py-1 text-[10px] font-mono text-foreground/70 hover:text-foreground hover:border-foreground/40` | `rounded-[4px] px-2 py-1 text-meta text-ink-2 hover:text-ink hover:border-foreground/40` |
| Metadata divider | `border-t border-border/40` | `border-t border-edge-faint` |
| Title | `text-[13px] font-medium ... tracking-[-0.025em]` | `text-bodytext font-medium text-ink leading-snug line-clamp-1` |
| Domain | `text-[11px] font-mono text-muted-foreground/40` | `text-meta text-ink-4` |
| Industry/tag | `text-[9.5px] font-mono text-muted-foreground/30 ... uppercase tracking-[0.06em]` | `text-micro text-ink-4` (tag button hover: `hover:text-ink-3`) |

Swatches unchanged.

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check`. Visual: select a card — one clean ink border, no top bar; hover — image eases 1.015 on the signature curve; keyboard-Tab a card — global focus ring shows.

```bash
git add components/design-card.tsx
git commit -m "Design card: single selected treatment, calmer motion, token mapping"
```

---

### Task 6: Detail panel + tabs (`components/site-detail-panel.tsx`, `components/panel-tabs.tsx`)

**Files:**
- Modify: `components/site-detail-panel.tsx`
- Modify: `components/panel-tabs.tsx`

**Interfaces:**
- Consumes: `Spinner`, `EASE`/`DUR`, token classes.
- Produces: `PanelTabs` props unchanged (`{ active, onChange }`).

- [ ] **Step 1: Panel tabs — micro labels + sliding underline**

Rewrite the button body in `panel-tabs.tsx`. Add `import { motion } from 'motion/react'` and `import { EASE, DUR } from '@/lib/motion'`. Container: `border-b border-edge-strong`. Each button gets `relative`, drop the `-mb-px border-b-[1.5px]` approach:

```tsx
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => { playTabChange(); onChange(key) }}
            className={[
              'relative flex-1 py-3 transition-colors flex flex-col items-center justify-center gap-1.5 min-h-[44px]',
              isActive ? 'text-ink' : 'text-ink-4 hover:text-ink-3',
            ].join(' ')}
          >
            <Icon className="w-4 h-4 shrink-0" weight={isActive ? 'fill' : 'regular'} />
            <span className="text-micro">{label}</span>
            {isActive && (
              <motion.div
                layoutId="panel-tab-underline"
                transition={{ duration: DUR.move, ease: EASE }}
                className="absolute -bottom-px left-4 right-4 h-[1.5px] bg-foreground/70"
              />
            )}
          </button>
```

(Label goes 9px → 10px micro; the opacity-splitting span classes are gone — color comes from the button.)

- [ ] **Step 2: Panel header mapping (`site-detail-panel.tsx`)**

| Element | From | To |
|---|---|---|
| Header chrome | `border-b border-border/60` | `border-b border-edge-strong` |
| Hostname link | `text-[13.5px] font-semibold ... tracking-[-0.03em] hover:opacity-70` | `text-titletext text-ink truncate hover:opacity-70 transition-opacity block` |
| Meta line | `text-[9.5px] font-mono text-muted-foreground/40 ... uppercase tracking-[0.06em]` | `text-micro text-ink-4` |
| Icon buttons | `rounded-[4px] text-muted-foreground/50 hover:text-foreground hover:bg-muted` | `rounded-[4px] text-ink-3 hover:text-ink hover:bg-muted` |

- [ ] **Step 3: Calmer content motion + retry**

- Loading block: replace inline spinner with `<Spinner />`.
- Data entrance: `initial={{ opacity: 0, scale: 0.98 }}` → `initial={{ opacity: 0, y: 4 }}`, `animate={{ opacity: 1, y: 0 }}`, add `transition={{ duration: DUR.move, ease: EASE }}`.
- Each tab wrapper: add `transition={{ duration: DUR.move, ease: EASE }}` to the enter animation; exits keep `duration: 0.12` (use `DUR.exit`).
- Error state: extract the fetch in the `useEffect` into `const load = useCallback(() => { ... }, [sourceId])`, call it from the effect, and replace the failed block:

```tsx
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
            <p className="text-meta text-ink-3">Failed to load</p>
            <button
              onClick={load}
              className="text-meta text-ink-4 hover:text-ink underline underline-offset-2 transition-colors"
            >
              Retry
            </button>
          </motion.div>
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check`. Visual: switch tabs — underline slides between them on the signature curve; content loads with fade+y (no scale-pop); arrow keys still cycle tabs; kill the network in devtools and confirm Retry refetches.

```bash
git add components/site-detail-panel.tsx components/panel-tabs.tsx
git commit -m "Panel: sliding tab underline, micro labels, calmer content motion, retry on error"
```

---

### Task 7: Colors tab (`components/colors-tab.tsx`)

**Files:**
- Modify: `components/colors-tab.tsx`

**Interfaces:**
- Consumes: `useCopied` from `@/lib/use-copied`, token classes.

- [ ] **Step 1: Replace local copy state with `useCopied`; fix export-button layout shift**

Replace `exportCopied`/`copiedIndex` states and their timer refs with two hook instances:

```tsx
  const rowCopy = useCopied()
  const exportCopy = useCopied()
```

`copyExport` calls `exportCopy.markCopied(type)`; `copyColor` calls `rowCopy.markCopied(index)`. Export buttons become fixed-width with an in-place check (no `✓` string prepend — that was the layout shift):

```tsx
          {(['css', 'tailwind'] as const).map(type => (
            <button
              key={type}
              onClick={() => copyExport(type)}
              className={[
                'w-9 py-0.5 rounded-[4px] text-micro flex items-center justify-center transition-colors',
                exportCopy.copiedId === type ? 'text-ink' : 'text-ink-4 hover:text-ink-2',
              ].join(' ')}
            >
              {exportCopy.copiedId === type
                ? <Check className="w-3 h-3" weight="bold" />
                : (type === 'css' ? 'CSS' : 'TW')}
            </button>
          ))}
```

(Import `Check` is already there.)

- [ ] **Step 2: Toolbar + rows mapping**

| Element | From | To |
|---|---|---|
| Toolbar chrome | `border-b border-border/40 px-4 py-2` | `border-b border-edge px-4 py-2` |
| Format toggle | `rounded-[3px] text-[9px] font-mono uppercase tracking-wide`; active `bg-foreground text-background`; inactive `text-muted-foreground/50 hover:text-muted-foreground` | `rounded-[4px] text-micro`; active `bg-foreground text-background`; inactive `text-ink-4 hover:text-ink-2` |
| Count | `text-[9px] font-mono text-muted-foreground/25 ml-1 tabular-nums` | `text-meta text-ink-4 ml-1 tabular-nums` |
| Row button | `rounded-[4px] px-3 py-2.5 hover:bg-muted/60` | keep |
| Swatch | `w-8 h-8 rounded-[3px] ... border-black/[0.07] dark:border-white/[0.07]` | `w-8 h-8 rounded-[4px]` same hairline borders |
| Value | `font-mono text-[11px] text-foreground/70` | `text-meta text-ink-2` |
| Row copy icons | `Check ... text-foreground/50` / `Copy ... text-muted-foreground/40` | `Check ... text-ink-2` / `Copy ... text-ink-4`; keep the fixed `w-3 h-3` slot (already no shift). Use `rowCopy.copiedId === i` for both the reveal condition and the icon swap; the `hoveredIndex` state stays for hover reveal. |

- [ ] **Step 3: Verify + commit**

Run: `pnpm type-check`. Visual: click CSS/TW — button width does not change when the check appears; click a row — check morphs in place; format toggle at micro scale.

```bash
git add components/colors-tab.tsx
git commit -m "Colors tab: useCopied, fixed-width export states, token mapping"
```

---

### Task 8: Type specimens (`components/type-specimen-card.tsx`)

**Files:**
- Modify: `components/type-specimen-card.tsx`

**Interfaces:**
- Consumes: token classes. Specimen cascade sizes are content — do not change them.

- [ ] **Step 1: Footer + badge mapping**

| Element | From | To |
|---|---|---|
| Card divider | `border-b border-border/20` | `border-b border-edge-faint` |
| Entrance | `animation: fade-in-up 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 70}ms both` | `animation: fade-in-up 0.45s var(--ease-sig) ${index * 70}ms both` (keyframe now exists from Task 1) |
| Role label | `text-[8px] font-mono uppercase tracking-[0.18em] text-muted-foreground/25` | `text-micro text-ink-4` |
| Weight | `text-[8px] font-mono text-muted-foreground/20 tabular-nums` | `text-meta text-ink-4 tabular-nums` |
| free/paid badge | `text-[7.5px] font-mono uppercase tracking-[0.1em] px-1.5 py-[3px] rounded-[2px]`; free `bg-[var(--color-success)]/10 text-[var(--color-success)]/60`; paid `bg-muted/60 text-muted-foreground/30` | `text-micro px-1.5 py-[3px] rounded-[4px]`; free tint kept as-is; paid `bg-muted/60 text-ink-4` |
| Source name | `text-[9px] font-mono text-muted-foreground/25 group-hover/src:text-muted-foreground/60` | `text-meta text-ink-4 group-hover/src:text-ink-2` |
| Source arrow icon | `text-muted-foreground/15 group-hover/src:text-muted-foreground/40` | `text-ink-4 group-hover/src:text-ink-3` |

- [ ] **Step 2: Drop the duplicate Google Fonts icon**

Delete the second `{typography.google_fonts_url && (<a ...><ArrowSquareOut .../></a>)}` block — when the source is Google Fonts the first link already points there.

- [ ] **Step 3: Verify + commit**

Run: `pnpm type-check`. Visual: Type tab — footers legible at 10/11px, one external-link affordance per specimen, cascade sizes untouched, entrance staggers on the signature curve.

```bash
git add components/type-specimen-card.tsx
git commit -m "Type specimens: legible footer scale, single source link, token mapping"
```

---

### Task 9: Assets + Preview tabs (`components/assets-tab.tsx`, `components/preview-tab.tsx`)

**Files:**
- Modify: `components/assets-tab.tsx`
- Modify: `components/preview-tab.tsx`

**Interfaces:**
- Consumes: `SectionLabel`, `useCopied`, `Spinner`, token classes. `ArrowSquareOut` from `@phosphor-icons/react` for image tiles.

- [ ] **Step 1: Assets — shared primitives**

- Delete the local `SectionLabel` and `useClipboard`; import `SectionLabel` from `@/components/ui/section-label` and `useCopied` from `@/lib/use-copied`. In `LogoSection` and `AssetItem`, replace `const { copiedId, copy } = useClipboard()` with `const { copiedId, markCopied } = useCopied()` and a local `copy`:

```tsx
  async function copy(id: number | string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      markCopied(id)
    } catch { /* clipboard unavailable */ }
  }
```

- Copy feedback = in-place check morph, not a text overlay. In `AssetItem`, replace both the hover copy affordance and the `copied` overlay with one bottom-right chip that is always the feedback slot:

```tsx
      {asset.type !== 'image' ? (
        <div className={[
          'absolute bottom-1 right-1 transition-opacity',
          copiedId === asset.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}>
          <div className="bg-background border border-edge rounded-[4px] p-0.5">
            {copiedId === asset.id
              ? <Check className="w-2.5 h-2.5 text-ink" weight="bold" />
              : <Copy className="w-2.5 h-2.5 text-ink-3" weight="regular" />}
          </div>
        </div>
      ) : (
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background border border-edge rounded-[4px] p-0.5">
            <ArrowSquareOut className="w-2.5 h-2.5 text-ink-3" weight="regular" />
          </div>
        </div>
      )}
```

(Import `Check` and `ArrowSquareOut`.) Same morph pattern in `LogoSection`: replace its `copied` overlay with a bottom-right chip using the identical markup (`copiedId === logo.id`).

- Tiles: `rounded-md` → `rounded-[4px]`, `border-border` → `border-edge`, `hover:border-foreground/30` → `hover:border-edge-strong` (logo tiles keep `checkerboard`).
- Grid cols per wider panel: icons `grid-cols-5 sm:grid-cols-4` → `grid-cols-5`; illustrations and images `grid-cols-3 sm:grid-cols-2` → `grid-cols-3`.
- Keep the `scale-in` entrance but retime: `animation: 'scale-in 0.3s ...'` → `animation: 'scale-in 0.3s var(--ease-sig) both'` with the existing delay.

- [ ] **Step 2: Preview tab**

- Loading state: replace the three pulsing dots block with `<Spinner />`; domain line `text-[12px] font-mono text-muted-foreground/30` → `text-meta text-ink-3`.
- Failure state: domain `text-[14px] font-mono text-foreground/45` → `text-meta text-ink-2`; label `text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/30` → `text-micro text-ink-4`; button `text-[11px] font-mono text-muted-foreground/40 hover:text-foreground border-border/40 hover:border-foreground/25 rounded-[3px]` → `text-ui text-ink-3 hover:text-ink border-edge hover:border-foreground/25 rounded-[4px]`.
- Extraction-error card: `rounded-md border border-border` → `rounded-[4px] border border-edge`; icon row `text-muted-foreground/60` → `text-ink-3`; label `text-[10px] uppercase tracking-widest font-mono` → `text-micro`; explanation `text-xs text-muted-foreground` → `text-bodytext text-ink-2`.
- Iframe fade: `transition: 'opacity 0.35s ease'` → `'opacity var(--dur-4) var(--ease-sig)'`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm type-check`. Visual: copy an icon — chip morphs to a check in place (no overlay flash); image tiles show ↗ on hover and open in new tab; preview loads with domain + shared spinner.

```bash
git add components/assets-tab.tsx components/preview-tab.tsx
git commit -m "Assets/Preview tabs: shared SectionLabel + copy morph, wider-panel grids, one spinner"
```

---

### Task 10: Presentation mode (`components/presentation-mode.tsx`)

**Files:**
- Modify: `components/presentation-mode.tsx`

**Interfaces:**
- Consumes: `Spinner` (with white-palette className), `EASE`/`DUR`, token utilities for size/tracking only (palette stays hardcoded white-alpha — always-dark surface, per spec: white at /62 /40 /24, edges /12 /8).

- [ ] **Step 1: White-alpha normalization + type scale**

| Element | From | To |
|---|---|---|
| Progress track / fill | `bg-white/[0.06]` / `bg-white/20` | `bg-white/[0.08]` / `bg-white/24`; fill transition `duration: 0.3, ease: [0.22,1,0.36,1]` → `duration: DUR.move, ease: EASE` |
| Top-right controls | `rounded-md ... border-white/[0.08] text-white/30 hover:text-white/80 ... hover:border-white/15` | `rounded-[4px] ... border-white/[0.08] text-white/40 hover:text-white/80 hover:border-white/[0.12]` |
| Corner spinner | inline div | `<Spinner className="border-white/[0.08] border-t-white/24" />` |
| Proxy-fail domain | `text-[20px] font-mono text-white/35` | `text-[20px] font-mono text-white/62` (content-size exception, kept) |
| Proxy-fail industry | `text-[10px] font-mono text-white/20 uppercase tracking-[0.12em]` | `text-micro text-white/24` |
| Proxy-fail visit button | `text-[11px] font-mono text-white/25 ... border-white/[0.07] hover:border-white/15 rounded-[3px]` | `text-ui text-white/40 hover:text-white/80 border-white/[0.08] hover:border-white/[0.12] rounded-[4px]` |
| HUD domain | `text-[14px] font-mono text-white/65` | `text-meta text-white/62` at 14px? No — keep 14px: `text-[14px] font-mono text-white/62 tracking-[-0.01em]` (HUD hero line, content-adjacent) |
| HUD industry | `text-[9px] font-mono text-white/25 uppercase tracking-[0.1em]` | `text-micro text-white/24` |
| HUD counter | `text-[10px] font-mono text-white/15 tabular-nums` | `text-meta text-white/24 tabular-nums` |
| Caret buttons | `rounded-[4px] bg-white/10 hover:bg-white/20 text-white/70` | keep, `text-white/70` → `text-white/62 hover:text-white` |
| HUD swap motion | `duration: 0.14` | `duration: DUR.exit, ease: EASE` |
| Container fade | `duration: 0.18` | `duration: DUR.color, ease: EASE` |
| Iframe fade | `opacity 0.35s ease` | `opacity var(--dur-4) var(--ease-sig)` |

- [ ] **Step 2: Keycap hints in the HUD (hidden on touch)**

Insert before the closing caret button, after the counter span:

```tsx
              <div className="hidden [@media(pointer:fine)]:flex items-center gap-1 shrink-0">
                {['←', '→', 'esc'].map(k => (
                  <kbd key={k} className="flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[4px] border border-white/[0.08] text-micro text-white/24">
                    {k}
                  </kbd>
                ))}
              </div>
```

(Note: `hidden [@media(pointer:fine)]:flex` shows them only for mouse/trackpad users; inside the AnimatePresence HUD div, so they swap with it — acceptable.)

- [ ] **Step 3: Verify + commit**

Run: `pnpm type-check`. Visual: press P — progress bar, HUD, and controls read in consistent white-alpha steps; keycaps visible on desktop; arrows/Esc/Enter behavior unchanged.

```bash
git add components/presentation-mode.tsx
git commit -m "Presentation mode: white-alpha ink steps, keycap hints, tokenized motion"
```

---

### Task 11: Changelog page (`app/changelog/page.tsx`)

**Files:**
- Modify: `app/changelog/page.tsx`

**Interfaces:**
- Consumes: token classes. Server component — no motion imports.

- [ ] **Step 1: Mapping**

| Element | From | To |
|---|---|---|
| Nav chrome | `border-b border-border/40` | `border-b border-edge` |
| Back link | `text-[11px] font-mono text-muted-foreground/60 hover:text-foreground` | `text-meta text-ink-3 hover:text-ink` |
| Nav title | `text-[11px] font-mono text-muted-foreground/30 tracking-wide` | `text-meta text-ink-4` |
| h1 | 28px semibold | keep (page-level exception) |
| Subtitle | `text-[13px] text-muted-foreground/50` | `text-bodytext text-ink-3` |
| Timeline line | `bg-border/40` | `bg-edge` |
| Date | `text-[11px] font-mono text-muted-foreground/50 tracking-wide` | `text-meta text-ink-3` |
| Latest badge | `text-[8px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[2px] bg-foreground text-background` | `text-micro px-1.5 py-0.5 rounded-[4px] bg-foreground text-background` |
| Release title | `text-[16px] font-semibold tracking-[-0.02em]` | keep (spec allows 16px here) |
| Description | `text-[12.5px] text-muted-foreground/55` | `text-bodytext text-ink-2` |
| Item text | `text-[12.5px] text-foreground/70` | `text-bodytext text-ink-2` |
| Item type label | `text-[9px] font-mono pt-[3px]` + TYPE_TEXT | `text-micro pt-[3px]`; TYPE_TEXT map: `fixed` value `text-muted-foreground/35` → `text-ink-4` (new/improved tints kept) |
| Footer stamp | `text-[10px] font-mono text-muted-foreground/20` | `text-meta text-ink-4` |

- [ ] **Step 2: Verify + commit**

Run: `pnpm type-check`. Visual: `/changelog` in both themes — three ink levels, no sub-10px text.

```bash
git add app/changelog/page.tsx
git commit -m "Changelog page on token system"
```

---

### Task 12: Cleanup, changelog entry, final QA

**Files:**
- Delete: `components/theme-toggle.tsx`, `components/typography-display.tsx` (verified unreferenced)
- Modify: `components/preloader.tsx` (ink/edge conformance only, if it renders text/borders)
- Modify: `data/changelog.ts`

- [ ] **Step 1: Delete dead components**

```bash
git rm components/theme-toggle.tsx components/typography-display.tsx
```

Run `pnpm type-check` to confirm nothing referenced them.

- [ ] **Step 2: Preloader conformance**

Read `components/preloader.tsx`; map any `text-muted-foreground/NN` → nearest ink level, `border-border/NN` → nearest edge, ad-hoc mono sizes → micro/meta, radii → `rounded-[4px]`. If it renders no text/borders, no change.

- [ ] **Step 3: Prepend changelog entry to `data/changelog.ts`**

```ts
  {
    date: '2026-08-04',
    title: 'Design Language Refinement',
    description: 'Same character, sharper execution. The language now runs on a real system: a six-step type scale, four ink levels, three edge weights, one radius, one easing — swept across every surface. Plus a roomier inspector.',
    items: [
      { type: 'improved', text: 'Foundation tokens: ink levels (100/62/40/24) replace eleven ad-hoc text opacities; edge weights (70/50/30) replace four border treatments; 4px radius everywhere; one signature easing with four tokenized durations' },
      { type: 'improved', text: 'Type scale: micro 10px / meta 11px / ui 12px / body 13px / title 14px — nothing in the UI renders below 10px anymore (specimen footers were 7.5px)' },
      { type: 'new',      text: 'Roomier inspector: desktop split is now sidebar 2 / gallery 6 / panel 4 — specimens, palettes, and asset grids finally breathe; cards are wider at typical desktop widths (2-up, 3-up on very large screens)' },
      { type: 'new',      text: 'Press / to focus search (keycap hint in the field); panel load failures now offer Retry' },
      { type: 'improved', text: 'Panel tabs: sliding active underline (shared layout animation), legible 10px labels' },
      { type: 'improved', text: 'One spinner, one copy-feedback pattern (in-place check morph, no layout shift — export buttons no longer jump), one section-label treatment, one focus ring' },
      { type: 'improved', text: 'Calmer motion: scale-pop removed from panel content, card hover eased to 1.015 on the signature curve, all durations tokenized' },
      { type: 'improved', text: 'Skeleton cards now match real card geometry exactly; mobile filter pills returned to library materials (mono, tabular counts); sheet respects safe-area' },
      { type: 'improved', text: 'Presentation mode: white-alpha steps mirroring the ink system, keycap hints for pointer users, tokenized progress motion' },
      { type: 'fixed',    text: 'Type specimens: fade-in-up keyframe was never defined in globals — specimens could render invisible; now defined' },
      { type: 'fixed',    text: 'viewport themeColor now matches the real background tokens (#f7f7f5 / #0e0e0e)' },
      { type: 'fixed',    text: 'Removed dead components theme-toggle.tsx and typography-display.tsx; duplicate Google Fonts link on specimens' },
    ],
  },
```

- [ ] **Step 4: Full verification**

Run: `pnpm type-check` — no errors.
Run: `pnpm build` — build succeeds.
Visual QA (dev server, light + dark, desktop + 390px):
- Grid: skeletons ↔ cards, no-results + clear filters, infinite scroll spinner
- Panel: all four tabs, tab underline slide, empty panel, error + Retry
- Mobile: filter rail, sheet drag/dismiss, safe-area
- Presentation: P to open, arrows, Esc, keycaps, proxy-fail state
- Changelog page renders new entry
- Keyboard: `/`, Tab focus rings, arrow keys in tabs
Grep gate: `grep -rn "text-\[9\|text-\[8\|text-\[7" app components --include="*.tsx"` returns nothing; `grep -rn "muted-foreground/" app components --include="*.tsx"` returns nothing (all mapped).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Design language refinement: changelog entry, dead code removal, final QA"
```

---

## Self-review notes

- Spec coverage: tokens (T1), primitives (T2), layout split (T3), header (T3), sidebar/mobile/skeletons/states (T4), cards (T5), panel+tabs (T6), colors (T7), type (T8), assets/preview (T9), presentation (T10), changelog page (T11), system details + cleanup + changelog entry + QA (T1, T12). All spec sections have a task.
- The `text-bodytext`/`text-titletext` naming is deliberate (see Token vocabulary note).
- `cardVariants` export name preserved for `page.tsx` import.
- Tasks 3–4 both touch `app/page.tsx` — execute sequentially, never in parallel.
