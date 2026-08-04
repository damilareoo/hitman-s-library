# Design Language Refinement — Spec

**Date:** 2026-08-04
**Direction:** Same character, sharper execution. Keep the warm-paper/ink monochrome, Geist sans + mono, hairline borders, grain, restrained motion. Nothing new is added — every change is the existing idea executed at a higher standard.
**Scope:** Every surface — grid + filters, header, sidebar, detail panel and all four tabs, mobile sheet + mobile filters, presentation mode, changelog, empty/loading/error states, system details.
**Layout:** One approved structural change — a roomier inspector (below). All other layouts stay, refined in place.
**Motion:** Calmer and more precise. Fewer moves, one signature curve, tokenized durations.
**Typography:** Geist-only, better used. No new faces.

## Problem

The language is strong but execution has drifted: 16 ad-hoc font sizes, 11 muted-text opacities, 4 interchangeable radii, 3 spinner styles, 2 copy-feedback patterns, mixed easings/durations from 80–700ms, and per-component focus treatments. Hierarchy is improvised in each file instead of drawn from a system.

## Approach

Tokens first, then a full surface sweep (approved). Codify the language into a small set of primitives in `globals.css`, add shared UI primitives, then rework every component to conform while fixing craft details in place.

## 1. Foundation tokens (`app/globals.css`)

### Type scale (replaces all ad-hoc sizes)

| Token | Size / face | Treatment | Used for |
|---|---|---|---|
| micro | 10px mono | uppercase, tracking 0.08em | section labels, tab labels, badges, industry tags |
| meta | 11px mono | normal case, tabular-nums where numeric | domains, counts, dates, color values, sort pills |
| ui | 12px mono | normal | search input, text buttons/links |
| body | 13px sans | tracking −0.01em | card titles, body copy |
| title | 14px sans semibold | tracking −0.02em | panel title, changelog release titles (16px allowed there) |
| wordmark | 15px sans semibold | tracking −0.04em | header wordmark only |

Page-level exception: changelog `h1` stays 28px. Type specimen cascade sizes (52/38/28/16/14/13/11/10) are content, not UI — they stay.
The 7.5–9.5px dust is eliminated; nothing in the UI renders below 10px.

### Ink levels (replaces the 11 opacities)

Defined as theme colors derived from `--foreground` so they work in both modes:

- `ink` — foreground, primary text
- `ink-2` — 62% — readable secondary text
- `ink-3` — 40% — tertiary text, labels, placeholder
- `ink-4` — 24% — faint: decorative meta, disabled, watermarks

Every current `text-muted-foreground/NN` and `text-foreground/NN` maps to the nearest level. `muted-foreground` token remains for compatibility but UI text uses ink levels.

### Edges (borders)

- `edge-strong` — structural chrome (header, sidebar, panel dividers) — current `border/60–70`
- `edge` — default component borders — current `border/40–50`
- `edge-faint` — inner hairlines (card metadata divider, specimen dividers) — current `border/20–40`

### Radii

- 4px standard for all boxes: cards, controls, inputs, chips, buttons (replaces `rounded-sm`, `[3px]`, `[4px]`, `rounded-md`)
- `rounded-full` for pills, swatch dots, drag handle, timeline dots
- Mobile sheet keeps its 20px top radius (its own object)

### Motion

CSS vars + used in motion/react props:

- `--ease-sig: cubic-bezier(0.22, 1, 0.36, 1)` — the only easing (springs allowed only for the mobile sheet drag, which keeps its current spring)
- `--dur-1: 120ms` exits
- `--dur-2: 200ms` color/hover transitions
- `--dur-3: 300ms` movement (tab slides, HUD, progress)
- `--dur-4: 450ms` reveals (image fade-in, specimen entrance)

Calmer specifically means: remove the scale-pop (`scale: 0.98`) on panel content load; card entrance stays a single y+fade on the signature curve (no spring); image hover scale reduced 1.02 → 1.015 at `--dur-4`.

## 2. Shared primitives

- **Spinner** (`components/ui/spinner.tsx`): one 16px hairline ring spinner on edge/ink-3, replaces the three current variants (panel loader, infinite-scroll loader, presentation corner spinner — presentation uses same geometry with its white palette).
- **Copy feedback**: one pattern — the trigger's icon morphs to a check in place for 1.5s, fixed-width container, no layout shift, no text overlay. Used in Colors rows, Colors export buttons, Assets tiles, Logo tiles.
- **SectionLabel** (`components/ui/section-label.tsx`): micro label + tabular meta count, replaces the Assets `SectionLabel` and Colors toolbar count; also used for changelog "Latest" alignment where applicable.
- **Focus**: global `:focus-visible` ring is the single treatment; remove per-component `focus-visible:ring-*` classes (cards) in favor of the global.
- **Empty state**: `TabEmptyState` refined to micro/meta + ink levels; the desktop panel "Select a site" state uses the same treatment.

## 3. Surface sweep

### Header (`app/page.tsx`)
- Wordmark at wordmark token; keep the light-weight `'s`.
- Search: ui-token input, `/` keyboard shortcut focuses it, subtle `/` keycap hint right-aligned inside the input (hidden while typing); Escape blurs.
- Sort pills: meta token, single active treatment (filled muted, edge border), 4px radius.
- Icon buttons (presentation, sound, theme): consistent 36px cluster, edge borders, unified hover (ink-3 → ink), 4px radius.
- Count: meta token, ink-4, tabular.

### Sidebar (`app/page.tsx`)
- Row text at body token; counts at meta/ink-4 tabular; active = ink + `bg-muted/70` (kept), inactive ink-3 → hover ink-2. 4px radius.

### Cards (`components/design-card.tsx`)
- Single selected treatment: 1px ink border via `border-foreground/60` (drop the extra top bar and shadow-ring stack).
- Hover: edge → `edge-strong`-equivalent border, scrim kept, image scale 1.015 over `--dur-4` on signature curve.
- Metadata: title body token, domain meta/ink-4, industry/tag micro/ink-4; swatches unchanged (16px circles).
- Visit chip: 4px radius, meta type, ink-3 → ink hover; backdrop kept.
- Skeleton card matches real card metrics exactly (same paddings, same 16/10 image, title/domain bars at their real heights).
- Entrance: y+fade with `--dur-3`/signature curve, stagger kept at 30ms; exit fade `--dur-1`.

### Layout: roomier inspector (`app/page.tsx`)
- Desktop column split changes from sidebar 2 / gallery 7 / panel 3 to **sidebar 2 / gallery 6 / panel 4**. The panel is always present (stable layout, no card reflow on open/close); empty state fills it when nothing is selected.
- Gallery grid inside the 6 columns: 1-col base, 2-col from `sm`, **2-col at `xl`, 3-col at `2xl`** — cards get wider than today on typical desktop widths, so screenshots gain legibility rather than lose it.
- The wider panel is what makes the tab content work: 52px specimens fit, color rows breathe, asset grids go one column wider (icons 5-col, illustrations/images 3-col at panel width).
- Mobile is unaffected (sheet remains the inspector).

### Detail panel (`components/site-detail-panel.tsx`, `components/panel-tabs.tsx`)
- Header: hostname at title token; meta line micro/ink-4; icon buttons 32px, 4px radius, ink-3 → ink hover.
- Tabs: labels at micro token (up from 9px), icons kept 16px with fill-when-active; **sliding active underline** via motion shared layout (`layoutId`), `--dur-3` signature curve; inactive ink-4 → hover ink-3.
- Content: loading = shared Spinner; entrance fade + y (no scale-pop); tab switches y±4 fade at `--dur-1`/`--dur-3`.
- Error state ("Failed to load") on meta/ink-3 with a retry text button.

### Colors tab (`components/colors-tab.tsx`)
- Toolbar: format toggle micro token; export buttons fixed-width with in-place ✓ morph (no layout shift); count via SectionLabel-style meta.
- Rows: swatch 32px at 4px radius; value meta token ink-2; copy icon morphs to check in place.

### Type tab (`components/type-specimen-card.tsx`)
- Footer labels up to micro token (from 8px); weight at meta/ink-4 tabular.
- free/paid badge: micro token at 4px radius, success tint for free kept, ink-4 treatment for paid; source name meta/ink-3; single external-link icon (drop the duplicate Google Fonts icon when source already links there).
- Specimen entrance at `--dur-4` signature curve, 70ms stagger kept.

### Assets tab (`components/assets-tab.tsx`)
- Section headers via shared SectionLabel.
- Tiles: 4px radius, edge borders, hover edge-strong; copy feedback = in-place check morph (replaces "copied" text overlay); image-type tiles get a hover ↗ affordance instead of copy icon.

### Preview tab (`components/preview-tab.tsx`)
- Loading: domain at meta/ink-3 + shared Spinner (replaces the three pulsing dots).
- Failure state: domain meta/ink-2, "Live preview unavailable" micro/ink-4, button ui token at 4px radius.

### Mobile (`app/page.tsx`)
- Own compact layout kept (not squished desktop).
- Filter pills: return to library materials — mono meta labels with tabular counts, active = filled foreground (kept), inactive muted with edge border, radius stays full (pill object).
- Search matches desktop treatment.
- Sheet: spring kept for drag/dismiss; content bottom padding respects `--safe-bottom`; drag handle kept.

### Presentation mode (`components/presentation-mode.tsx`)
- Always-dark palette kept, mapped to consistent white-alpha steps mirroring ink levels (white, /62, /40, /24) and edges (/12, /8).
- HUD: domain meta token, industry micro, counter meta tabular ink-4.
- Keycap hints: subtle `←` `→` `esc` micro/white-24 hints in the HUD right side, hidden on touch devices.
- Progress bar animates at `--dur-3` signature curve; corner spinner = shared geometry.
- Nav caret buttons 4px radius, white-alpha steps.

### Changelog (`app/changelog/page.tsx`)
- Dates meta/ink-3; "Latest" badge micro token (up from 8px) at 4px radius; item type labels micro; body copy body token ink-2; timeline dots/line kept; footer stamp meta/ink-4.

### System details
- `viewport.themeColor` matched to real tokens: light `#f7f7f5`, dark `#0e0e0e` (`app/layout.tsx`).
- One global `:focus-visible`; scrollbar, selection, grain, circle-reveal theme switch all kept as-is.
- Audit `components/theme-toggle.tsx` and `components/typography-display.tsx`; if unreferenced, delete.

## 4. Error handling / edge cases

- All existing extraction-error states keep their classification logic; only presentation (type/ink/edges) changes.
- Copy actions keep their try/catch clipboard guards; feedback only fires on success.
- Reduced-motion: existing global override stays and covers new animations (all CSS/motion durations collapse).

## 5. Testing & verification

- `pnpm type-check` and `pnpm build` pass.
- Visual QA in dev: light + dark, desktop + 390px mobile viewport, across grid, panel (all 4 tabs), sheet, presentation mode, changelog, and empty/error states (no-results filter, failed preview).
- Keyboard pass: `/` search focus, arrows in tabs, P for presentation, Esc dismissals, focus-visible rings.

## 6. Process requirements

- Prepend an entry to `data/changelog.ts` (house rule: never ship without it).
- No emojis anywhere. No live URLs touched.
- Commit history in small logical steps: tokens → primitives → surfaces.
