# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 28 issues from the 2026-05-11 quality audit — accessibility, theming, performance, and anti-patterns — while logging every change to `data/changelog.ts`.

**Architecture:** Work is ordered by severity (Critical → High → Medium → Low). Each task is a single focused fix with its own commit and changelog entry. No task depends on a later task; tasks within the same group may share a single changelog release entry. The single release added to changelog.ts for all fixes has date `2026-05-11` and title `"Accessibility, Polish & Code Health"`.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 / `@phosphor-icons/react` / `motion/react` / `next-themes` / Neon DB

---

## Changelog Strategy

Every task ends with a changelog entry. Add entries to the **top** of `data/changelog.ts` — prepend into the array. A single release block covers all fixes:

```ts
{
  date: '2026-05-11',
  title: 'Accessibility, Polish & Code Health',
  description: 'Keyboard navigation, screen-reader labels, design-token alignment, and bundle cleanup from a full quality audit.',
  items: [
    // append each fix as a { type: 'fixed' | 'improved', text: '...' } as tasks complete
  ],
},
```

Start by inserting this empty shell at the top of the array. Each subsequent task appends one item to its `items` array.

---

## Task 0: Insert changelog release shell

**Files:**
- Modify: `data/changelog.ts`

- [ ] **Step 1: Open `data/changelog.ts` and prepend the release block**

Insert as the FIRST element of the `changelog` array (before the existing `2026-05-11` entry):

```ts
{
  date: '2026-05-11',
  title: 'Accessibility, Polish & Code Health',
  description: 'Keyboard navigation, screen-reader labels, design-token alignment, and bundle cleanup from a full quality audit.',
  items: [],
},
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd "/Users/v/hitman's library" && git add data/changelog.ts && git commit -m "chore: add audit changelog release shell"
```

---

## Task 1 (C-1): Delete dead `design-browser.tsx` component

**Files:**
- Delete: `components/design-browser.tsx`
- Delete (verify no usage): grep for `DesignBrowser` in `app/`

**Context:** `DesignBrowser` is exported but never imported anywhere. It imports `lucide-react` (a second icon library) and uses hard-coded `text-blue-600`, `text-red-*`, `text-green-*` colors outside the token system.

- [ ] **Step 1: Confirm zero imports**

```bash
grep -r "DesignBrowser\|design-browser" "/Users/v/hitman's library/app" "/Users/v/hitman's library/components" 2>/dev/null | grep -v "design-browser.tsx"
```

Expected: no output. If any output appears, do NOT delete yet — find and update the import first.

- [ ] **Step 2: Delete the file**

```bash
rm "/Users/v/hitman's library/components/design-browser.tsx"
```

- [ ] **Step 3: Verify build still passes**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

Expected: no errors

- [ ] **Step 4: Update changelog — append to the Task 0 items array**

```ts
{ type: 'improved', text: 'Removed unused DesignBrowser component — eliminates dead code and reduces bundle' },
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/v/hitman's library" && git add -A && git commit -m "fix(C-1): remove orphaned design-browser component"
```

---

## Task 2 (C-2): Fix color-space mismatch in TypeSpecimenCard

**Files:**
- Modify: `components/type-specimen-card.tsx:130–154`

**Context:** Lines 135 and 148 use `color: 'hsl(var(--muted-foreground) / 0.45)'` and `color: 'hsl(var(--muted-foreground) / 0.18)'`. The `--muted-foreground` CSS variable stores an `oklch(...)` value. Wrapping it in `hsl()` is invalid — browsers silently discard the style, making the sample text and glyph strip render at full foreground opacity instead of the intended ghost levels.

- [ ] **Step 1: Open `components/type-specimen-card.tsx` and locate the two inline color styles**

Line 130–140 (sample `<p>`):
```tsx
style={{
  fontFamily,
  fontSize: isMono ? 10.5 : 12.5,
  fontWeight: isMono ? 400 : Math.min(weight, 450),
  color: 'hsl(var(--muted-foreground) / 0.45)',  // ← wrong
  opacity: fontLoaded ? 1 : 0.04,
}}
```

Line 143–150 (glyph `<p>`):
```tsx
style={{
  fontFamily,
  fontSize: 9,
  letterSpacing: '0.14em',
  color: 'hsl(var(--muted-foreground) / 0.18)',  // ← wrong
  opacity: fontLoaded ? 1 : 0.03,
}}
```

- [ ] **Step 2: Replace the color values with valid CSS**

Replace line with `color: 'hsl(var(--muted-foreground) / 0.45)'`:
```tsx
color: 'oklch(from var(--muted-foreground) l c h / 0.45)',
```

Replace line with `color: 'hsl(var(--muted-foreground) / 0.18)'`:
```tsx
color: 'oklch(from var(--muted-foreground) l c h / 0.18)',
```

Note: `oklch(from ...)` is the CSS relative color syntax, supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 16.4+). This correctly derives opacity from the existing oklch token.

- [ ] **Step 3: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

- [ ] **Step 4: Visual check** — start dev server, open a design with multiple typefaces, verify sample text appears ghosted (not full foreground)

```bash
cd "/Users/v/hitman's library" && bun dev &
```

Open http://localhost:3000, click a card, go to Type tab. Sample sentence should be faint, glyphs even fainter.

- [ ] **Step 5: Update changelog**

```ts
{ type: 'fixed', text: 'Type specimen sample text and glyphs now render at correct opacity — was using hsl() around an oklch token which browsers silently ignored' },
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/type-specimen-card.tsx data/changelog.ts && git commit -m "fix(C-2): correct oklch relative color in TypeSpecimenCard"
```

---

## Task 3 (C-3): Make DesignCard keyboard-accessible

**Files:**
- Modify: `app/page.tsx` (the `DesignCard` function component, lines 549–649)

**Context:** `DesignCard` is a `motion.article` with an `onClick`. Keyboard users cannot reach or activate it. Need `tabIndex={0}`, `role="button"`, `aria-label`, and `onKeyDown` Enter/Space handler.

- [ ] **Step 1: Locate the `DesignCard` return statement in `app/page.tsx`**

The `motion.article` opens at ~line 565:
```tsx
<motion.article
  variants={cardVariants}
  initial={hasAnimated ? false : 'hidden'}
  animate="show"
  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
  onClick={onClick}
  onHoverStart={onHover}
  style={{ contain: 'layout paint style' }}
  className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors " + ...}
>
```

- [ ] **Step 2: Add keyboard props to `motion.article`**

```tsx
<motion.article
  variants={cardVariants}
  initial={hasAnimated ? false : 'hidden'}
  animate="show"
  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
  onClick={onClick}
  onHoverStart={onHover}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }}
  tabIndex={0}
  role="button"
  aria-label={`View ${design.title || getDomain(design.url)}`}
  style={{ contain: 'layout paint style' }}
  className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-1 " + ...}
>
```

Note: added `focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-1` to the className for a visible focus indicator.

- [ ] **Step 3: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

- [ ] **Step 4: Manual test** — tab to a card in the browser, press Enter, verify detail panel opens. Press Space, same result.

- [ ] **Step 5: Update changelog**

```ts
{ type: 'fixed', text: 'Design cards are now keyboard-navigable — Tab to reach, Enter or Space to open the detail panel' },
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx data/changelog.ts && git commit -m "fix(C-3): keyboard activation and focus indicator on DesignCard"
```

---

## Task 4 (H-6): Add semantic status tokens and replace all hard-coded colors

**Files:**
- Modify: `app/globals.css`
- Modify: `components/type-specimen-card.tsx`
- Modify: `components/figma-tab.tsx`
- Modify: `components/nodes/design-retriever-node.tsx`
- Modify: `components/nodes/image-analyzer-node.tsx`
- Modify: `components/nodes/excel-parser-node.tsx`
- Modify: `components/nodes/url-analyzer-node.tsx`
- Modify: `components/typography-display.tsx`
- Modify: `app/changelog/page.tsx` (also uses hard-coded emerald/blue)

**Context:** The `--color-success` and `--color-error` tokens don't exist. Components independently pick emerald, green, red, blue. This task adds those tokens and wires all usages to them.

- [ ] **Step 1: Add status tokens to `app/globals.css`**

Inside the `:root { }` block, after `--sidebar-ring: ...`:
```css
  --color-success: oklch(0.65 0.17 155);   /* green — matches emerald-500 tone */
  --color-error:   oklch(0.58 0.22 27);    /* red — matches red-500 tone */
  --color-running: oklch(0.58 0.19 250);   /* blue — matches blue-500 tone */
```

Inside the `.dark { }` block, after `--sidebar-ring: ...`:
```css
  --color-success: oklch(0.72 0.16 155);
  --color-error:   oklch(0.65 0.21 27);
  --color-running: oklch(0.65 0.18 250);
```

Inside `@theme inline { }`, after `--color-sidebar-ring: ...`:
```css
  --color-success: var(--color-success);
  --color-error:   var(--color-error);
  --color-running: var(--color-running);
```

- [ ] **Step 2: Replace hard-coded colors in `components/type-specimen-card.tsx`**

Find:
```tsx
? <Check className="w-3 h-3 text-emerald-500" weight="bold" />
```
Replace with:
```tsx
? <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
```

Find:
```tsx
? 'bg-emerald-500/10 text-emerald-600/60 dark:text-emerald-400/50'
: 'bg-muted/60 text-muted-foreground/35',
```
Replace with:
```tsx
? 'bg-[var(--color-success)]/10 text-[var(--color-success)]/70'
: 'bg-muted/60 text-muted-foreground/35',
```

- [ ] **Step 3: Replace hard-coded colors in `components/figma-tab.tsx`**

Find every `text-emerald-500`, `bg-emerald-500`, `text-emerald-600`, `dark:text-emerald-400` in the file and replace:
- `text-emerald-500` → `text-[var(--color-success)]`
- `bg-emerald-500` → `bg-[var(--color-success)]`
- `text-emerald-600 dark:text-emerald-400` → `text-[var(--color-success)]`

Also find any `text-emerald-*` and replace with the token.

- [ ] **Step 4: Replace in node components**

In each of `design-retriever-node.tsx`, `image-analyzer-node.tsx`, `excel-parser-node.tsx`, `url-analyzer-node.tsx`:

Find the status icon map (varies by file):
```tsx
running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
error: <XCircle className="h-3 w-3 text-red-500" />,
```
Replace with:
```tsx
running: <Loader2 className="h-3 w-3 animate-spin text-[var(--color-running)]" />,
completed: <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" />,
error: <XCircle className="h-3 w-3 text-[var(--color-error)]" />,
```

In `excel-parser-node.tsx` also replace:
```tsx
<FileSpreadsheet className="h-4 w-4 text-green-500" />
```
→ `text-[var(--color-success)]`

```tsx
className="text-xs bg-green-500/10 text-green-500 border-green-500/20"
```
→ `className="text-xs bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20"`

All other `text-green-*` and `text-green-600` instances → `text-[var(--color-success)]`

- [ ] **Step 5: Replace in `components/typography-display.tsx`**

Find:
```tsx
<Check className="w-4 h-4 text-green-600 animate-checkmark" weight="bold" aria-hidden="true" />
```
Replace:
```tsx
<Check className="w-4 h-4 text-[var(--color-success)] animate-checkmark" weight="bold" aria-hidden="true" />
```

- [ ] **Step 6: Replace in `app/changelog/page.tsx`**

The changelog page hardcodes type colors too:
```tsx
const TYPE_COLOR: Record<ChangeItem['type'], string> = {
  new:      'bg-emerald-500',
  improved: 'bg-blue-400',
  fixed:    'bg-foreground/20',
}
const TYPE_TEXT: Record<ChangeItem['type'], string> = {
  new:      'text-emerald-600 dark:text-emerald-400',
  improved: 'text-blue-500 dark:text-blue-400',
  fixed:    'text-muted-foreground/50',
}
```

Replace with:
```tsx
const TYPE_COLOR: Record<ChangeItem['type'], string> = {
  new:      'bg-[var(--color-success)]',
  improved: 'bg-[var(--color-running)]',
  fixed:    'bg-foreground/20',
}
const TYPE_TEXT: Record<ChangeItem['type'], string> = {
  new:      'text-[var(--color-success)]',
  improved: 'text-[var(--color-running)]',
  fixed:    'text-muted-foreground/50',
}
```

- [ ] **Step 7: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

- [ ] **Step 8: Update changelog**

```ts
{ type: 'improved', text: 'Status colors (success green, error red, loading blue) now use design tokens — consistent across nodes, type specimens, figma tab, and changelog' },
```

- [ ] **Step 9: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/globals.css components/type-specimen-card.tsx components/figma-tab.tsx components/nodes/ components/typography-display.tsx app/changelog/page.tsx data/changelog.ts && git commit -m "fix(H-6): add semantic status tokens, replace all hard-coded emerald/green/red/blue"
```

---

## Task 5 (H-7): Port lucide-react → @phosphor-icons/react in node components

**Files:**
- Modify: `components/nodes/design-retriever-node.tsx`
- Modify: `components/nodes/image-analyzer-node.tsx`
- Modify: `components/nodes/excel-parser-node.tsx`
- Modify: `components/nodes/url-analyzer-node.tsx`
- Modify: `components/design-panel.tsx`
- Modify: `package.json` (remove `lucide-react`)

**Context:** `lucide-react` is used only in node components and `design-panel.tsx`. The rest of the app uses `@phosphor-icons/react`. Phosphor equivalents: `Loader2` → `CircleNotch`, `CheckCircle2` → `CheckCircle`, `XCircle` → `XCircle` (same name), `Globe` → `Globe`, `AlertCircle` → `Warning`, `Type` → `TextT`, `FileSpreadsheet` → `FileXls`, `Table` → `Table`.

- [ ] **Step 1: Open each node file and replace lucide imports**

For each file that has `from 'lucide-react'`:

Replace:
```tsx
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
```
With:
```tsx
import { CircleNotch, CheckCircle, XCircle } from '@phosphor-icons/react'
```

Then in JSX, replace:
- `<Loader2 className="... animate-spin ..."` → `<CircleNotch className="... animate-spin ..." weight="regular"`
- `<CheckCircle2 className="..."` → `<CheckCircle className="..." weight="regular"`
- `XCircle` stays `XCircle`, but add `weight="regular"`

Note: Phosphor icons require a `weight` prop. Default is `"regular"`.

- [ ] **Step 2: Fix `components/design-panel.tsx` lucide imports**

Find:
```tsx
import { Globe, ... } from 'lucide-react'
```

Check what icons are used. Replace each with Phosphor equivalent:
- `Globe` → `Globe` (from phosphor, add `weight="regular"`)
- `BookOpen` → `BookOpen` (phosphor has this)
- `AlertCircle` → `Warning`
- `Type` → `TextT`

Update the import:
```tsx
import { Globe, BookOpen, Warning, TextT } from '@phosphor-icons/react'
```

And in JSX replace usages (add `weight="regular"` to each).

- [ ] **Step 3: Also replace `text-blue-500` in design-panel.tsx (covers M-7)**

Find:
```tsx
<BookOpen className="h-5 w-5 text-blue-500" />
```
Replace:
```tsx
<BookOpen className="h-5 w-5 text-muted-foreground" weight="regular" />
```

Find any `text-blue-500` on link elements in design-panel:
```tsx
className="text-xs font-medium text-blue-500 hover:underline truncate block"
```
Replace:
```tsx
className="text-xs font-medium text-foreground hover:underline underline-offset-2 truncate block"
```

- [ ] **Step 4: Remove lucide-react from package.json**

In `package.json`, delete the line:
```json
"lucide-react": "^0.454.0",
```

Then run:
```bash
cd "/Users/v/hitman's library" && bun install
```

- [ ] **Step 5: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

Expected: no errors. If you see `Cannot find module 'lucide-react'`, you missed an import — grep for it:
```bash
grep -r "lucide-react" "/Users/v/hitman's library/components" "/Users/v/hitman's library/app" 2>/dev/null
```

- [ ] **Step 6: Update changelog**

```ts
{ type: 'improved', text: 'Consolidated to single icon library (@phosphor-icons) — removed lucide-react dependency' },
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/nodes/ components/design-panel.tsx package.json bun.lock data/changelog.ts && git commit -m "fix(H-7,M-7): port lucide-react to phosphor icons, remove dependency"
```

---

## Task 6 (H-1): Add accessible labels to search inputs

**Files:**
- Modify: `app/page.tsx` (two `<input type="text">` elements, lines ~231 and ~374)

- [ ] **Step 1: Add `aria-label` to desktop search input (~line 231)**

Find:
```tsx
<input
  type="text"
  placeholder="Search sites…"
  value={activeFilters.search}
  onChange={e => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
  className="w-full h-7 pl-7 pr-6 text-[12px] font-mono bg-muted/60 border border-border/50 rounded-[3px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
/>
```

Add `aria-label="Search sites"`:
```tsx
<input
  type="text"
  placeholder="Search sites…"
  aria-label="Search sites"
  value={activeFilters.search}
  onChange={e => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
  className="w-full h-7 pl-7 pr-6 text-[12px] font-mono bg-muted/60 border border-border/50 rounded-[3px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
/>
```

- [ ] **Step 2: Add `aria-label` to mobile search input (~line 374)**

Same fix — add `aria-label="Search sites"` to the second input element.

- [ ] **Step 3: Update changelog**

```ts
{ type: 'fixed', text: 'Search inputs now have accessible labels for screen readers' },
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx data/changelog.ts && git commit -m "fix(H-1): add aria-label to search inputs"
```

---

## Task 7 (H-2): Add `aria-pressed` to all filter and sort buttons

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add `aria-pressed` to sort pills (~line 260–273)**

Find the sort pill buttons:
```tsx
<button
  key={value}
  onClick={() => setActiveFilters(prev => ({ ...prev, sortBy: value }))}
  className={...}
>
```

Add `aria-pressed`:
```tsx
<button
  key={value}
  onClick={() => setActiveFilters(prev => ({ ...prev, sortBy: value }))}
  aria-pressed={activeFilters.sortBy === value}
  className={...}
>
```

- [ ] **Step 2: Add `aria-pressed` to sidebar category buttons (~line 340–364)**

Find the "All" button:
```tsx
<button
  onClick={() => handleFilterChange('All')}
  className={...}
>
```

Add:
```tsx
<button
  onClick={() => handleFilterChange('All')}
  aria-pressed={activeFilters.industries.length === 0}
  className={...}
>
```

For category buttons:
```tsx
<button
  onClick={() => handleFilterChange(name)}
  aria-pressed={isActive}
  className={...}
>
```

- [ ] **Step 3: Add `aria-pressed` to mobile category pills (~line 393–405)**

Find:
```tsx
<button
  key={name}
  onClick={() => handleFilterChange(name)}
  className={...}
>
```

Add:
```tsx
<button
  key={name}
  onClick={() => handleFilterChange(name)}
  aria-pressed={name === 'All' ? activeFilters.industries.length === 0 : activeFilters.industries.includes(name)}
  className={...}
>
```

- [ ] **Step 4: Update changelog**

```ts
{ type: 'fixed', text: 'Filter and sort buttons now announce their active/inactive state to screen readers via aria-pressed' },
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx data/changelog.ts && git commit -m "fix(H-2): add aria-pressed to filter and sort toggle buttons"
```

---

## Task 8 (H-3): Add accessible label to CopyBtn

**Files:**
- Modify: `components/colors-tab.tsx`

- [ ] **Step 1: Update `CopyBtn` component**

Find:
```tsx
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const { playCopy } = useSoundsContext()
  async function copy() { ... }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      {copied
        ? <Check className="w-3 h-3 text-foreground" weight="bold" />
        : <Copy className="w-3 h-3" weight="regular" />}
    </button>
  )
}
```

Replace with:
```tsx
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const { playCopy } = useSoundsContext()
  async function copy() { ... }
  return (
    <button
      onClick={copy}
      aria-label={copied ? 'Copied' : `Copy ${value}`}
      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      {copied
        ? <Check className="w-3 h-3 text-foreground" weight="bold" />
        : <Copy className="w-3 h-3" weight="regular" />}
    </button>
  )
}
```

- [ ] **Step 2: Update changelog**

```ts
{ type: 'fixed', text: 'Color copy buttons now announce what value will be copied to screen readers' },
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/colors-tab.tsx data/changelog.ts && git commit -m "fix(H-3): add aria-label to CopyBtn in colors tab"
```

---

## Task 9 (H-4): Replace `title` with `aria-label` on re-extract button

**Files:**
- Modify: `components/site-detail-panel.tsx`

- [ ] **Step 1: Update the re-extract button**

Find (~line 148):
```tsx
<button
  type="button"
  onClick={handleReextract}
  disabled={isReextracting}
  title="Re-extract design data"
  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
>
```

Replace with:
```tsx
<button
  type="button"
  onClick={handleReextract}
  disabled={isReextracting}
  aria-label={isReextracting ? 'Re-extracting…' : 'Re-extract design data'}
  title="Re-extract design data"
  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
>
```

(Keep `title` for sighted mouse hover tooltip; `aria-label` takes precedence for AT.)

- [ ] **Step 2: Update changelog**

```ts
{ type: 'fixed', text: 'Re-extract button now has a proper screen-reader label' },
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/site-detail-panel.tsx data/changelog.ts && git commit -m "fix(H-4): add aria-label to re-extract button"
```

---

## Task 10 (H-5): Fix mobile dialog focus management

**Files:**
- Modify: `app/page.tsx` (mobile bottom sheet `<dialog>`, ~line 494–519)

**Context:** The `<dialog open>` attribute shows the dialog visually but doesn't trigger native dialog focus-trap behavior. `showModal()` is needed for that. We'll use a `useEffect` with a ref.

- [ ] **Step 1: Add a `dialogRef` to the parent component**

In `DesignLibrary`, near the other refs (after `sentinelRef`):
```tsx
const mobileDialogRef = useRef<HTMLDialogElement>(null)
```

- [ ] **Step 2: Replace the `<dialog open>` with a ref-driven dialog**

Find:
```tsx
<dialog
  className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 rounded-t-xl z-40 h-[72vh] w-full flex flex-col"
  open
  aria-label="Design details"
>
```

Replace with:
```tsx
<dialog
  ref={mobileDialogRef}
  className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 rounded-t-xl z-40 h-[72vh] w-full flex flex-col"
  aria-label="Design details"
>
```

- [ ] **Step 3: Add a useEffect to call showModal() when selectedDesign is set**

Add after the other `useEffect` blocks in `DesignLibrary`:
```tsx
useEffect(() => {
  const dialog = mobileDialogRef.current
  if (!dialog) return
  if (selectedDesign) {
    if (!dialog.open) dialog.showModal()
  } else {
    if (dialog.open) dialog.close()
  }
}, [selectedDesign])
```

- [ ] **Step 4: Remove the backdrop `div` (dialog::backdrop handles it now)**

The previous implementation had:
```tsx
<div
  className="md:hidden fixed inset-0 bg-black/50 z-30 top-14"
  onClick={() => setSelectedDesign(null)}
  role="presentation"
  aria-hidden="true"
/>
```

Native `<dialog>` created with `showModal()` has a `::backdrop` pseudo-element. Add CSS to `app/globals.css`:
```css
dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
}
```

And add a click handler to the dialog to close on backdrop click:
```tsx
<dialog
  ref={mobileDialogRef}
  onClick={(e) => { if (e.target === e.currentTarget) setSelectedDesign(null) }}
  className="..."
  aria-label="Design details"
>
```

- [ ] **Step 5: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

- [ ] **Step 6: Manual test on mobile viewport** — open Chrome DevTools, set to mobile size (390px), click a card, verify dialog opens, verify Esc closes it, verify tab focus stays within the dialog.

- [ ] **Step 7: Update changelog**

```ts
{ type: 'fixed', text: 'Mobile site detail sheet now traps keyboard focus correctly using native dialog — Esc to close works' },
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx app/globals.css data/changelog.ts && git commit -m "fix(H-5): use showModal() for mobile dialog with native focus trap"
```

---

## Task 11 (H-8): Fix presentation mode screenshot alt text and body overflow cleanup

**Files:**
- Modify: `components/presentation-mode.tsx`

- [ ] **Step 1: Fix the screenshot fallback alt text (~line 139–148)**

Find:
```tsx
<img
  src={current.thumbnail_url}
  alt={domain}
  className="w-full h-full object-cover object-top"
  referrerPolicy="no-referrer"
  draggable={false}
/>
```

Replace with:
```tsx
<img
  src={current.thumbnail_url}
  alt={`Screenshot of ${current.title || domain}`}
  className="w-full h-full object-cover object-top"
  referrerPolicy="no-referrer"
  draggable={false}
/>
```

- [ ] **Step 2: Make body overflow cleanup more robust**

Find:
```tsx
useEffect(() => {
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [])
```

Replace with a class-toggle approach:
```tsx
useEffect(() => {
  document.documentElement.classList.add('overflow-hidden')
  return () => { document.documentElement.classList.remove('overflow-hidden') }
}, [])
```

Add to `app/globals.css`:
```css
html.overflow-hidden {
  overflow: hidden;
}
```

- [ ] **Step 3: Update changelog**

```ts
{ type: 'fixed', text: 'Presentation mode screenshot description now includes the site title for screen readers' },
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/presentation-mode.tsx app/globals.css data/changelog.ts && git commit -m "fix(H-8): improve presentation mode screenshot alt text and overflow handling"
```

---

## Task 12 (M-1): Extract shared NodeStatus component

**Files:**
- Create: `components/nodes/node-status.tsx`
- Modify: `components/nodes/design-retriever-node.tsx`
- Modify: `components/nodes/image-analyzer-node.tsx`
- Modify: `components/nodes/excel-parser-node.tsx`
- Modify: `components/nodes/url-analyzer-node.tsx`

- [ ] **Step 1: Create `components/nodes/node-status.tsx`**

```tsx
import { CircleNotch, CheckCircle, XCircle } from '@phosphor-icons/react'

type Status = 'idle' | 'running' | 'completed' | 'error'

interface NodeStatusProps {
  status: Status
}

export function NodeStatus({ status }: NodeStatusProps) {
  if (status === 'running') {
    return <CircleNotch className="h-3 w-3 animate-spin text-[var(--color-running)]" weight="regular" />
  }
  if (status === 'completed') {
    return <CheckCircle className="h-3 w-3 text-[var(--color-success)]" weight="regular" />
  }
  if (status === 'error') {
    return <XCircle className="h-3 w-3 text-[var(--color-error)]" weight="regular" />
  }
  return null
}
```

- [ ] **Step 2: Replace the inline status icon objects in each node file**

For each node file, find the status icon map:
```tsx
const STATUS_ICONS = {
  idle: null,
  running: <CircleNotch .../>,
  completed: <CheckCircle .../>,
  error: <XCircle .../>,
}
```

Replace with:
```tsx
import { NodeStatus } from './node-status'
// ...
// Replace STATUS_ICONS[status] with:
<NodeStatus status={status} />
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

- [ ] **Step 4: Commit** (no changelog entry — internal refactor, no user-visible change)

```bash
cd "/Users/v/hitman's library" && git add components/nodes/ && git commit -m "refactor(M-1): extract NodeStatus component, DRY status icon pattern"
```

---

## Task 13 (M-2): Deduplicate Google Fonts link injection

**Files:**
- Modify: `components/type-specimen-card.tsx`

- [ ] **Step 1: Update the font loading useEffect**

Find (~line 45–53):
```tsx
useEffect(() => {
  if (!typography.google_fonts_url) { setFontLoaded(true); return }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = typography.google_fonts_url
  link.onload = () => setFontLoaded(true)
  document.head.appendChild(link)
  return () => { try { document.head.removeChild(link) } catch {} }
}, [typography.google_fonts_url])
```

Replace with:
```tsx
useEffect(() => {
  if (!typography.google_fonts_url) { setFontLoaded(true); return }
  const url = typography.google_fonts_url
  const existing = document.querySelector(`link[href="${CSS.escape ? url : url}"]`)
  if (existing) {
    setFontLoaded(true)
    return
  }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.onload = () => setFontLoaded(true)
  link.onerror = () => setFontLoaded(true)
  document.head.appendChild(link)
  return () => { try { document.head.removeChild(link) } catch {} }
}, [typography.google_fonts_url])
```

Note: The check `document.querySelector(`link[href="${url}"]`)` finds any existing tag with that href before appending. The `onerror` is a bonus: if the font 404s, we still show the specimen at full opacity rather than staying at 4%.

- [ ] **Step 2: Commit** (no changelog entry — internal improvement)

```bash
cd "/Users/v/hitman's library" && git add components/type-specimen-card.tsx && git commit -m "fix(M-2): deduplicate Google Fonts link tags, add onerror fallback"
```

---

## Task 14 (M-3): Fix theme toggle aria-label to reflect current state

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the theme toggle button aria-label (~line 300)**

Find:
```tsx
<button
  onClick={(e) => { ... }}
  className="w-8 h-8 ..."
  aria-label="Toggle theme"
>
```

Replace:
```tsx
<button
  onClick={(e) => { ... }}
  className="w-8 h-8 ..."
  aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
```

- [ ] **Step 2: Commit** (no separate changelog entry — bundle with accessibility fixes already committed)

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx && git commit -m "fix(M-3): theme toggle aria-label reflects current state"
```

---

## Task 15 (M-4): Hide preloader from assistive technology

**Files:**
- Modify: `components/preloader.tsx`

- [ ] **Step 1: Add `aria-hidden` to the preloader**

Find:
```tsx
<motion.div
  className="fixed inset-0 z-[9999] bg-background flex items-center justify-center pointer-events-none"
  animate={exiting ? { y: '-100%' } : { y: 0 }}
  transition={...}
>
```

Replace:
```tsx
<motion.div
  aria-hidden="true"
  className="fixed inset-0 z-[9999] bg-background flex items-center justify-center pointer-events-none"
  animate={exiting ? { y: '-100%' } : { y: 0 }}
  transition={...}
>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/preloader.tsx && git commit -m "fix(M-4): hide preloader from screen readers with aria-hidden"
```

---

## Task 16 (M-5): Add `aria-label` to color swatches in DesignCard

**Files:**
- Modify: `app/page.tsx` (DesignCard component, color dots ~line 634–645)

- [ ] **Step 1: Update color swatch divs**

Find:
```tsx
<div
  key={i}
  className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10"
  style={{ backgroundColor: color }}
  title={color}
/>
```

Replace:
```tsx
<div
  key={i}
  role="img"
  aria-label={color}
  className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10"
  style={{ backgroundColor: color }}
  title={color}
/>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx && git commit -m "fix(M-5): add aria-label to color swatches"
```

---

## Task 17 (M-8): Replace bounce easing with ease-out-expo on content animations

**Files:**
- Modify: `app/globals.css`

**Context:** `fade-in-up` and `scale-in` keyframes use `cubic-bezier(0.34, 1.56, 0.64, 1)` which overshoots (bounces). This is fine for isolated UI moments (theme toggle icon) but distracting when 20 cards animate simultaneously. Replace with `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-expo).

- [ ] **Step 1: Find and update the easing in globals.css**

Find:
```css
.stagger-item {
  animation: fade-in-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
```
Replace with:
```css
.stagger-item {
  animation: fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
```

Find:
```css
.animate-fade-in-up {
  animation: fade-in-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
```
Replace with:
```css
.animate-fade-in-up {
  animation: fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1);
```

Find the `scale-in` keyframe usage:
```css
animation: scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both
```
(in assets-tab.tsx inline style)

Open `components/assets-tab.tsx` and find:
```tsx
style={{ animationDelay: `${animDelay}ms`, animation: 'scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
```

Replace:
```tsx
style={{ animationDelay: `${animDelay}ms`, animation: 'scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
```

Also update the `modal-scale-in` in globals.css if it uses the bounce easing. Find and replace any remaining `cubic-bezier(0.34` → `cubic-bezier(0.22`.

- [ ] **Step 2: Update changelog**

```ts
{ type: 'improved', text: 'Card and asset animations use smooth ease-out-expo instead of bouncy overshoot' },
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/v/hitman's library" && git add app/globals.css components/assets-tab.tsx data/changelog.ts && git commit -m "fix(M-8): replace bounce easing with ease-out-expo for content animations"
```

---

## Task 18 (M-11): Extract DesignCard into its own component file

**Files:**
- Create: `components/design-card.tsx`
- Modify: `app/page.tsx`

**Context:** `DesignCard` is defined at the bottom of `app/page.tsx` (650 lines total). Moving it to its own file enables better code splitting and cleaner HMR.

- [ ] **Step 1: Create `components/design-card.tsx`**

Copy out the `DesignCardProps` interface and `DesignCard` function from the bottom of `app/page.tsx`, plus the `getDomain` helper if it's only used by DesignCard (check: `getDomain` is also used in `page.tsx` main component, so keep a copy in both OR extract to a lib file).

Actually — `getDomain` is used in both `DesignLibrary` and `DesignCard`. Create `lib/get-domain.ts`:

```ts
export function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}
```

Then in `components/design-card.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { getDomain } from '@/lib/get-domain'

interface Design {
  id: string
  url: string
  title: string
  thumbnail_url?: string
  fallback_thumbnail?: string | null
  colors: string[]
  typography: string[]
  tags: string[]
  industry: string
  layout: string
  quality: number
  architecture: string
  addedDate: string
  designStyle?: string
  complexity?: string
  useCase?: string
}

export interface DesignCardProps {
  design: Design
  index: number
  isSelected: boolean
  onClick: () => void
  onHover: () => void
  onTagClick: (tag: string) => void
  hasAnimated: boolean
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

export function DesignCard({ design, index, isSelected, onClick, onHover, onTagClick, hasAnimated }: DesignCardProps) {
  // ... paste the full DesignCard body here including the imgSrc/imgStatus state and handleImgError
}
```

Paste the complete `DesignCard` function body from `page.tsx`.

- [ ] **Step 2: Update `app/page.tsx`**

Remove: `DesignCardProps`, `DesignCard` function, and inline `cardVariants` from `page.tsx`.

Add import at top:
```tsx
import { DesignCard } from '@/components/design-card'
```

Also import `getDomain` from the new lib:
```tsx
import { getDomain } from '@/lib/get-domain'
```

And remove the local `getDomain` definition from `page.tsx`.

- [ ] **Step 3: Type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1 | tail -5
```

- [ ] **Step 4: Commit** (internal refactor, no changelog entry)

```bash
cd "/Users/v/hitman's library" && git add app/page.tsx components/design-card.tsx lib/get-domain.ts && git commit -m "refactor(M-11): extract DesignCard to components/design-card.tsx"
```

---

## Task 19 (L-2): Fix setTimeout leak in Preloader

**Files:**
- Modify: `components/preloader.tsx`

- [ ] **Step 1: Capture the setTimeout ID and clear it on cleanup**

Find (~line 37):
```tsx
if (t < 1) {
  rafRef.current = requestAnimationFrame(tick)
} else {
  setCount(100)
  setTimeout(() => {
    setExiting(true)
    setTimeout(() => setDone(true), 550)
  }, 180)
}
```

Replace with:
```tsx
const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// ... inside tick:
if (t < 1) {
  rafRef.current = requestAnimationFrame(tick)
} else {
  setCount(100)
  exitTimerRef.current = setTimeout(() => {
    setExiting(true)
    doneTimerRef.current = setTimeout(() => setDone(true), 550)
  }, 180)
}
```

And in the cleanup return:
```tsx
return () => {
  cancelAnimationFrame(rafRef.current)
  if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
  if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
}
```

Note: The two new refs (`exitTimerRef`, `doneTimerRef`) should be declared at the component level alongside `rafRef`.

- [ ] **Step 2: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/preloader.tsx && git commit -m "fix(L-2): clear exit timers in preloader cleanup"
```

---

## Task 20 (L-3): Adapt checkerboard pattern for light mode

**Files:**
- Modify: `components/assets-tab.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add CSS variables for checkerboard in globals.css**

Inside `:root {}`:
```css
  --checkerboard-a: #d0d0d0;
  --checkerboard-b: #f0f0f0;
```

Inside `.dark {}`:
```css
  --checkerboard-a: #1a1a1a;
  --checkerboard-b: #111111;
```

- [ ] **Step 2: Update CHECKERBOARD constant in assets-tab.tsx**

Find:
```tsx
const CHECKERBOARD = {
  backgroundImage: `
    linear-gradient(45deg,#1a1a1a 25%,transparent 25%),
    linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#1a1a1a 75%),
    linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)
  `,
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px',
  backgroundColor: '#111',
}
```

Replace with:
```tsx
const CHECKERBOARD: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg,var(--checkerboard-a) 25%,transparent 25%),
    linear-gradient(-45deg,var(--checkerboard-a) 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,var(--checkerboard-a) 75%),
    linear-gradient(-45deg,transparent 75%,var(--checkerboard-a) 75%)
  `,
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px',
  backgroundColor: 'var(--checkerboard-b)',
}
```

- [ ] **Step 3: Add React import if missing** (needed for `React.CSSProperties`)

- [ ] **Step 4: Update changelog**

```ts
{ type: 'improved', text: 'Asset logo checkerboard adapts to light and dark themes' },
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/assets-tab.tsx app/globals.css data/changelog.ts && git commit -m "fix(L-3): theme-aware checkerboard in assets tab"
```

---

## Task 21 (L-5): Add lazy loading to detail panel screenshot image

**Files:**
- Modify: `components/preview-tab.tsx`

- [ ] **Step 1: Add `loading="lazy"` to the screenshot img**

Find (~line 122):
```tsx
<img
  src={activeScreenshot}
  alt="Site screenshot"
  className="w-full"
  referrerPolicy="no-referrer"
/>
```

Replace:
```tsx
<img
  src={activeScreenshot}
  alt="Site screenshot"
  className="w-full"
  loading="lazy"
  referrerPolicy="no-referrer"
/>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/preview-tab.tsx && git commit -m "fix(L-5): lazy-load screenshot image in preview tab"
```

---

## Task 22 (M-6): Increase touch targets on small icon buttons

**Files:**
- Modify: `components/site-detail-panel.tsx`
- Modify: `components/panel-tabs.tsx`

**Context:** The re-extract and close buttons are `w-7 h-7` (28px). WCAG 2.2 minimum is 24px with spacing; 44px is the practical mobile target. We'll expand to `w-8 h-8` (32px) with a `p-0.5` padding increase, and use negative margin on icon-only buttons to expand the touch hit area.

- [ ] **Step 1: Update icon button sizes in `site-detail-panel.tsx`**

Find:
```tsx
className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
```

Replace (for re-extract button):
```tsx
className="w-8 h-8 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
```

Find:
```tsx
className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
```

Replace (close button):
```tsx
className="w-8 h-8 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
```

- [ ] **Step 2: Update panel tab touch targets in `panel-tabs.tsx`**

Find:
```tsx
className={[
  'flex-shrink-0 px-3.5 py-2.5 text-xs tracking-wide transition-colors -mb-px border-b-2 flex items-center gap-1.5',
  ...
].join(' ')}
```

Update `py-2.5` to `py-3` to slightly increase the hit height:
```tsx
className={[
  'flex-shrink-0 px-3.5 py-3 text-xs tracking-wide transition-colors -mb-px border-b-2 flex items-center gap-1.5',
  ...
].join(' ')}
```

- [ ] **Step 3: Update changelog**

```ts
{ type: 'improved', text: 'Panel action buttons and tabs have larger touch targets for easier mobile interaction' },
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/v/hitman's library" && git add components/site-detail-panel.tsx components/panel-tabs.tsx data/changelog.ts && git commit -m "fix(M-6): increase touch target size on icon buttons and tabs"
```

---

## Task 23 (L-6): Update package.json name

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Change the name field**

```json
"name": "hitmans-library",
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/v/hitman's library" && git add package.json && git commit -m "chore(L-6): update package name to hitmans-library"
```

---

## Final: Deploy

- [ ] **Step 1: Full type-check**

```bash
cd "/Users/v/hitman's library" && bun run type-check 2>&1
```

Expected: 0 errors

- [ ] **Step 2: Build check**

```bash
cd "/Users/v/hitman's library" && bun run build 2>&1 | tail -20
```

Expected: successful build

- [ ] **Step 3: Push to GitHub**

```bash
cd "/Users/v/hitman's library" && git push origin main
```

- [ ] **Step 4: Deploy to Vercel**

```bash
cd "/Users/v/hitman's library" && vercel deploy --prod
```

---

## Issue-to-Task Index

| Issue | Task | Status |
|-------|------|--------|
| C-1 dead design-browser | Task 1 | `[ ]` |
| C-2 hsl/oklch mismatch | Task 2 | `[ ]` |
| C-3 card keyboard | Task 3 | `[ ]` |
| H-1 search aria-label | Task 6 | `[ ]` |
| H-2 aria-pressed filters | Task 7 | `[ ]` |
| H-3 CopyBtn label | Task 8 | `[ ]` |
| H-4 re-extract title→label | Task 9 | `[ ]` |
| H-5 dialog focus | Task 10 | `[ ]` |
| H-6 status tokens | Task 4 | `[ ]` |
| H-7 lucide→phosphor | Task 5 | `[ ]` |
| H-8 screenshot alt | Task 11 | `[ ]` |
| M-1 NodeStatus extract | Task 12 | `[ ]` |
| M-2 font dedup | Task 13 | `[ ]` |
| M-3 theme toggle label | Task 14 | `[ ]` |
| M-4 preloader aria-hidden | Task 15 | `[ ]` |
| M-5 swatch aria-label | Task 16 | `[ ]` |
| M-6 touch targets | Task 22 | `[ ]` |
| M-7 design-panel blue | Task 5 | `[ ]` |
| M-8 bounce easing | Task 17 | `[ ]` |
| M-9 N/A (component deleted) | — | `[x]` |
| M-10 figma-tab emerald | Task 4 | `[ ]` |
| M-11 extract DesignCard | Task 18 | `[ ]` |
| L-1 N/A (no change) | — | `[x]` |
| L-2 setTimeout leak | Task 19 | `[ ]` |
| L-3 checkerboard light mode | Task 20 | `[ ]` |
| L-4 typography-display green | Task 4 | `[ ]` |
| L-5 screenshot lazy load | Task 21 | `[ ]` |
| L-6 package name | Task 23 | `[ ]` |
