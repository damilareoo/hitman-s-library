# Hitman's Library design system

The rules every surface on hitmanslibrary.xyz follows, as of 16 November 2026.
Read this before building anything new. The live reference, with every token
and component rendered from the real code, is at `/system` (hidden, noindex).

The Figma library (variables, text and effect styles, icons, components, and a
capture of `/system`): https://www.figma.com/design/EXmkCniW1fwaw1cVQYhX9q
Type there is set in Inter standing in for BDO Grotesk, and colour tokens sit in
`light/` and `dark/` groups because the plan allows one mode per collection.

If something you need is not here, extend the system in `components/member-card.ts`
or `lib/motion.ts` first, then use it. Never hand-roll a one-off.

---

## 1. Principles

1. **Refine, don't add.** "Better" means subtraction and polish: spacing,
   hierarchy, quieter accents. Do not add modules, stats or badges unless asked.
2. **One idea per card.** A card shows a title, one key value or visual, and
   one muted line. Nothing stacked, nothing repeated.
3. **Monochrome first, one accent.** Ink on paper. Amber (`--pro`, `#E8A04A`) is the
   only UI accent and it means Pro or focus. Colour otherwise comes from the
   library's own sites.
4. **Fast and quiet motion.** Strong ease-out, no bounce in everyday UI, exits
   faster than entrances, nothing over 300 ms in everyday UI. No animation on
   keyboard or very frequent actions.
5. **Same controls at every width.** Phones get their own layout, not a shrunk
   desktop, but a button is the same button everywhere.
6. **Plain words.** Short, concrete, one line per idea.

---

## 2. Source of truth

| What | Where |
| --- | --- |
| Colour, ink, edge, motion CSS variables | `app/globals.css` (`:root`, `.dark`) |
| Type scale utilities | `app/globals.css` (`@utility text-*`) |
| Radius ladder `R`, buttons `BTN`, inputs `INPUT` `INPUT_SM` `FIELD` `FIELD_INPUT`, icon sizes `ICON`, card anatomy `CARD` | `components/member-card.ts` |
| Motion constants `EASE` `MOVE_EASE` `HOVER_EASE` `DUR` `POP_IN` `POP_OUT` `MENU` | `lib/motion.ts` |
| Sounds | `contexts/sounds-context.tsx` |
| The one spinner | `components/ui/spinner.tsx` |
| Segmented controls | `components/view-switcher.tsx`, `components/panel-tabs.tsx` |

`components/ui/*` other than `spinner.tsx` are shadcn leftovers. Nothing
imports them. Do not use them.

---

## 3. Colour

### Surfaces

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `#ffffff` | `#101010` | Page ground |
| `--card` | `#ffffff` | `#151515` | Gallery cards, sheets |
| `--popover` | `#ffffff` | `#181818` | Every floating card (`CARD.shell`) |
| `--muted` / `--secondary` | `#efefec` | `#1b1b1b` / `#1d1d1d` | Image wells, skeletons, active sort |
| `--foreground` / `--primary` | `#111111` | `#e8e4dc` | Ink, primary button fill |
| `--primary-foreground` | `#f7f7f5` | `#101010` | Text on a primary fill |
| `--border` | `#e2e2de` | `#2c2c2c` | Base for every edge |

Dark is a neutral ladder (`#101010` page, `#151515` card, `#181818` popover)
with warm ink (`#e8e4dc`), never pure white.

**Tints over solids.** Hover, active and header fills are the foreground at a
low alpha, so they work in both themes:

| Fill | Use |
| --- | --- |
| `bg-foreground/[0.025]` | Card header and footer strips, selected gallery card |
| `bg-foreground/[0.04]` | Secondary button hover, action row hover |
| `bg-foreground/[0.045]` | Menu row hover |
| `bg-foreground/[0.05]` | Ghost / icon button hover, segmented track (light) |
| `bg-foreground/[0.07]` | Pressed, active list row, segmented track (dark), key cap |

### Ink (text)

All muted text is the foreground at a fixed alpha. Every level clears 4.5:1
in both themes, because every one of them carries 11–15 px text.

| Token | Value | Use |
| --- | --- | --- |
| `text-ink` | 100% | Titles, values, active labels |
| `text-ink-2` | 80% | Body copy, list items |
| `text-ink-3` | 68% | Card body, quiet controls, header strip text |
| `text-ink-4` | 58% | Meta, labels, placeholders, idle icons. The floor. |

Never go lighter than `ink-4` for text. Never use `text-muted-foreground` in
new work; use an ink level.

### Edges (borders)

| Token | Alpha of `--border` | Use |
| --- | --- | --- |
| `border-edge-strong` | 0.7 | Card shells, inputs, buttons, header rule |
| `border-edge` | 0.5 | Header/footer hairlines inside cards, gallery cards |
| `border-edge-faint` | 0.3 | Rows inside a card body, card caption rule |

Interactive borders firm up with the foreground: `hover:border-foreground/30`,
`focus:border-foreground/50`.

### Accent and status

| Token | Value | Use |
| --- | --- | --- |
| `--pro` · `text-pro` `bg-pro` `ring-pro` `outline-pro` | `#E8A04A` | Pro (pill, PRO tag, dot, avatar ring, Pro word), focus ring. Nothing else. |
| `--pro-rgb` | `232, 160, 74` | Alpha uses: `bg-[rgba(var(--pro-rgb),0.14)]` |
| `--pro-ink` · `text-pro-ink` | `#A8611A` light, `#F0B36A` dark | Text on the 14% amber pill |
| `--color-success` | `#15803d` / `#22c55e` | Done states |
| `--color-error` | `#dc2626` / `#f87171` | Heart fill, errors |
| `--color-running` | `#2563eb` / `#60a5fa` | In-progress |
| `--error-ink` · `text-error-ink` | `#c8382f` / `#ff8a80` | Inline error lines, destructive confirm |

Library colours (swatches, the Pro word, the colour strip) are content, not UI.
Swatches get a `border-black/[0.06] dark:border-white/[0.22]` hairline so pale
and dark colours hold an edge.

**Colour syntax.** Use `rgba(var(--x-rgb), a)` or Tailwind alpha (`/[0.05]`).
Never relative-colour or bare `color-mix()`: older Safari drops the rule.

---

## 4. Typography

**Face.** BDO Grotesk variable (300–900), self-hosted in `public/fonts`. It
carries the whole UI, sans and "mono" alike: `--font-mono` points at it too.
There is no monospace in the UI except code snippets (`<pre>` in the AI tools card).
Use `tabular-nums` for counts that update.

### Scale (the utilities)

| Utility | Size / weight / tracking / leading | Use |
| --- | --- | --- |
| `text-display` | clamp(26–32px) / 600 / -0.03em / 1.02 | Page titles: About, Changelog, Submit, Trends |
| `text-heading` | 20px / 600 / -0.025em / 1.15 | Section headings, release titles |
| `text-reading` | 16px / 400 / -0.005em / 1.55 | Prose: release notes, About, legal |
| `text-bodytext` | 14px / 400 / -0.01em | UI body, list rows, empty-state lines |
| `text-titletext` | 14px / 600 / -0.02em | Small titles in dense rows |
| `text-meta` | 12px / 400 / 0 | Metadata, counts, quiet links |
| `text-micro` | 12px / uppercase / 0.08em / 1 | Kind labels, section labels in lists |


### Card type (inside `CARD` surfaces)

| Token | Spec | Use |
| --- | --- | --- |
| Card hero title | 20px / 630 / -0.025em | One per sheet or offer card (sign-in, Pro) |
| `CARD.title` | 15px / 620 / -0.02em | Card title |
| Panel title | 17px / 640 / -0.025em | Site detail panel header |
| `CARD.body` | 13.5px / 1.45 / ink-3 | Card body |
| `CARD.meta` | 12px / 1.4 / ink-4 | Footer line, legend |
| `CARD.head` | 12.5px / 500 / ink-3 | Header strip text |
| `CARD.label` | 11px / 600 / 0.12em / uppercase / ink-4 | Section labels inside a card |
| Big number | 16px / 620 (stats), 26px / 640 (price) | One key value |

**Rules.** At most 2–3 sizes in one card. Weight does the hierarchy before
size does. Display and headings use `text-balance`; body uses `text-pretty`.
Nothing under 11px; metadata floor is 12px.

---

## 5. Spacing and layout

**Base unit 4px.** Tailwind steps only (`1` = 4px). Half steps (`1.5`, `2.5`,
`3.5`) are allowed for optical fixes inside controls.

| Context | Value |
| --- | --- |
| Card side padding | 16px (`px-4`, `CARD.pad`) |
| Card body vertical | 14–16px (`py-3.5` small cards, `py-4` larger) |
| Card header strip | 40px tall (`h-10`), 16px sides |
| Card footer strip | 44px tall (`h-11`), 8px sides (buttons carry their own padding) |
| Menu list inset | 6px (`p-1.5`), rows 36px (`h-9`) with 10px sides |
| Gap between stacked cards | 16px (`gap-4`) |
| Site header | 56px (`h-14`), 20px sides (12px under 640) |
| Secondary page nav | 48px (`h-12`), content `max-w-[640px] px-6` |
| Secondary page body | `pt-14 pb-32`, sections `mb-14` |
| Gallery grid | `gap-4`, `gap-5` from xl, `p-5` / `p-6` from xl |
| Pro column | `max-w-[380px]` |

**Breakpoints.** Check every new surface at 320, 375, 768 and 1440, in both
themes. The layout steps at 640 (`sm`, phone to tablet), 768 (`md`, search
field and Refine move into the header), 1024 (`lg`, secondary actions unfold),
1280 (`xl`, three-pane split with a fixed panel), 1440 (3 grid columns),
1920 (4 grid columns, wider panel).

**Phones are their own layout.** Under 640 the site panel is the full page,
popovers go full width (`fixed inset-x-3`), header actions fold into the More
menu, labels collapse to icons with `sr-only` text.

**Touch targets.** Draw controls at 32–36px, then extend the hit area to 44px
with an `after:` overlay (see `BTN.iconHeader`, the Sign in link, sort pills).

---

## 6. Radius

One ladder, concentric: an inner corner is the outer corner minus the gap.

| Token | Value | Use |
| --- | --- | --- |
| `R.card` | 16px | Card shells, sheets, browse layer |
| `R.inset` / `R.control` | 10px | Buttons, inputs, menu rows, segmented tracks |
| `R.nested` | 6px | A button 4px inside a 40px field; palette swatches |
| Segmented thumb | 7px | Thumb 3px inside a 10px track |
| `R.key` | 5px | Key caps, checkboxes, thumbnails in lists |
| `R.chip` | full | Chips, pills, avatars, swatches |

Gallery cards are 12px and the tablet sheet is 14px; these are the two
legacy exceptions. Do not add more.

---

## 7. Elevation and layers

Elevation is a border plus one soft, low shadow. Never glow, never a gradient.

| Level | Shadow | Use |
| --- | --- | --- |
| Inset thumb | `0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)` (dark `0 1px 2px rgba(0,0,0,.4)`) | Segmented control thumb |
| Small menu | `0 12px 32px -8px rgba(0,0,0,.28)` | Brand menu, origin peek |
| Popover | `0 24px 56px -20px rgba(0,0,0,.35)` | Every `CARD` popover |
| Layer | `0 24px 64px -16px rgba(0,0,0,.35)` | Browse layer (⌘K) |
| Sheet | `0 28px 70px -24px rgba(0,0,0,.4)` | Sign-in sheet, Pro card |
| Side sheet | `0 24px 80px -20px rgba(0,0,0,.45)` | Site panel below 1280 |

**Scrims.** `bg-background/60 backdrop-blur-[3px]` (sign-in),
`bg-background/55 backdrop-blur-[2px]` (browse), `bg-black/20 backdrop-blur-[2px]` (site sheet).

**z-index ladder.**

| z | Layer |
| --- | --- |
| 10 | Controls lifted above a card's full-size click target |
| 30 | Floating page links (bottom left) |
| 40 | Sticky detail panel, site sheet scrim |
| 50 | Sticky header, site sheet, popovers |
| 60 | Header popovers (More, Digest), skip link |
| 70 / 71 | Browse layer scrim / layer |
| 80 / 81 | Sign-in scrim / sheet |
| 82 | Toast |

---

## 8. Icons

- **One set:** Phosphor (`@phosphor-icons/react`).
- **One weight:** `bold` everywhere, so strokes match 500–600 type.
  `fill` only for an "on" state: hearted, saved, watching, active tab.
- **Three sizes (`ICON`):** 16px in an icon button (`ICON.button`), 14px beside
  text (`ICON.inline`), 12px in a chip or small label (`ICON.micro`).
- Icons inherit colour. Idle `text-ink-4`, hover `text-ink`. The heart is
  `--color-error` when filled.
- Icon-only buttons always carry `aria-label` and usually `title`.

**In use:** AppWindow (Preview), DeviceMobile (Mobile), Palette (Colors),
TextAa (Type), ClockCounterClockwise (History), Heart (favourite),
BookmarkSimple (save, saved), FolderSimple (set),
MagnifyingGlass (search), SlidersHorizontal (Refine), ImageSquare (from image),
EnvelopeSimple (digest, email), Plus, Minus, X (close, remove), Check,
Copy, DownloadSimple, ArrowRight (forward action), ArrowUpRight (external),
ArrowLeft, CaretDown / CaretUp / CaretRight, DotsThree (More), Sun / Moon (theme),
SpeakerHigh / SpeakerSlash (sounds), SignIn / SignOut, Key, Globe, Users, Trash,
ArrowClockwise / ArrowCounterClockwise, CircleNotch, and the error set
ShieldWarning, LockSimple, Clock, FileDashed, WifiSlash, Warning.

Pick from this list before adding a new glyph. Brand marks (Google, the
library mark, the Pro word) are their own components, not Phosphor.

---

## 9. Components

Always compose from the tokens. Copy the class strings from
`components/member-card.ts`, never from another component's markup.

### Buttons (`BTN`)

| Variant | Size | Look |
| --- | --- | --- |
| `primary` | 32px, 13px/600 | Ink fill, `hover:opacity-90`, press `scale(.98)` |
| `secondary` | 32px | `edge-strong` hairline, tint on hover |
| `ghost` | 32px, 13px/500 | No border, `ink-3` to `ink` |
| `primaryLg` / `secondaryLg` | 40px, 13.5px | Forms and full-width actions |
| `inField` | 32px, radius 6 | The button inside a `FIELD` |
| `icon` | 32×32 | Square icon button (close, save) |
| `iconHeader` | 32×32, no ground | The site header's icon buttons only |
| `chip(active)` | 28px, full radius, 12px | Toggles and filters; active = ink fill |

One primary per surface, pushed right. Disabled is `opacity-40`, no pointer.
Button labels are verbs: "Get Pro", "Show sites", "Make a key". A forward
action may carry `ArrowRight` (14px) after the label.

`BTN.iconHeader` (32px, no ground, 44×40 hit area) is the one header-only
variant; use `BTN.icon` everywhere else. Every header control (Digest, Pro, the avatar, sound, theme) shares its 32px
height and quiet register. Saved opens from the avatar card (Hearts, Sets); signed
out, its bookmark shows only once something is saved.

### Inputs

- `INPUT`: 40px, radius 10, `edge-strong` hairline on transparent, 14px text,
  border firms on hover (`/30`) and focus (`/50`). No focus ring on inputs:
  the border is the focus state.
- `INPUT_SM`: 32px, 13px. Inline spots (new set name).
- `FIELD` + `FIELD_INPUT` + `BTN.inField`: an input with its action inside it
  (email link).
- Labels: `CARD.label` above, or `sr-only` when the placeholder and context
  make it obvious.
- Placeholders are an example, not an instruction: "you@studio.com".

### Segmented controls

One track, one thumb: track `bg-foreground/[0.05]` (dark `/[0.07]`), radius 10,
3px padding; thumb `bg-card`, radius 7, inset shadow; thumb slides with
`transform` over `--dur-2` and `--ease-sig`. `ViewSwitcher` (Grid / Index,
equal halves) and `PanelTabs` (measured thumb, icon fills when active, counts
in `ink-4`). Keyboard changes jump without animating.

### Cards (`CARD`): the standing anatomy

Every card, popover, menu, sheet and panel follows this:

```
┌──────────────────────────────────────────┐
│ Short title                  quiet detail│  CARD.head   h-10, tint 0.025, hairline under
├──────────────────────────────────────────┤
│ Title                                    │  CARD.title
│ One key value, one visual                │
│ One muted line                           │  CARD.body / CARD.meta
├──────────────────────────────────────────┤
│ Meta line           Action   Primary  ↵  │  CARD.foot   h-11, tint 0.025, hairline over
└──────────────────────────────────────────┘
  CARD.shell: popover ground, edge-strong, radius 16, overflow hidden
```

- **Header:** short title left; one quiet detail, count or pill right. A close
  `BTN.icon` may sit at the right with `-mr-2`.
- **Body:** one idea. `CARD.label` for sections when there are several.
- **Footer:** text actions (`CARD.footBtn`, icon + label), primary pushed right
  with `ml-auto`, key caps (`CARD.kbd`: ↵, esc) where a key works. A meta line
  may sit left.
- No stacked bordered rows. No repeated badges: if the visual already says Pro,
  don't add a Pro pill.
- Pills: `CARD.pill` (neutral), `CARD.proPill` (amber). One per header at most.

### Popovers and menus

All anchored floating cards use `CARD.shell`, the popover shadow, `{...MENU}`
from `lib/motion` and `transformOrigin` set to the corner nearest the trigger.

| Surface | Width | Anchor | File |
| --- | --- | --- | --- |
| Account card | 300 | top right of avatar | `account-button.tsx` |
| Saved | 264 | top right | `saved-menu.tsx` |
| Save to set (with the Pro watch row) | 260 | under the bookmark | `site-detail-panel.tsx`, `watch-button.tsx` |
| Refine (Pro search) | 320 | top left | `refine.tsx` |
| Digest | 340 | fixed top right | `gallery.tsx` |
| More (header, under 1024) | 232 | top right | `gallery.tsx` |

**Dismissal contract:** outside `mousedown` closes; `Escape` closes; the
trigger toggles and carries `aria-expanded` and `aria-haspopup`.
Under 640, popovers become `fixed inset-x-3` at a fixed top, full width.

Menu rows: 36px, radius 10, 13.5px/500, icon 14px, count in a `CARD.kbd` on the
right, `hover:bg-foreground/[0.045]`.

### Modals and sheets

| Surface | Behaviour |
| --- | --- |
| **Sign-in sheet** | Centred card 344 wide; bottom sheet under 640 (no bottom radius, safe-area padding). Scrim z-80. Focus moves in, is trapped, and returns to the opener. Esc closes. `aria-modal`. |
| **Browse layer (⌘K, /)** | 824 wide, 12vh from top, max 70vh. Search row 48px with a 16px input. Opens and closes instantly (keyboard-triggered). Arrow keys move an active row (`data-active` fill 0.07). |
| **Site panel** | From 1280: a fixed column at the right (span 4, 3 at 1920). 640–1279: a side sheet 10px inset, radius 14, spring in from the right. Under 640: the full page, no radius, no shadow. |
| **Toast** | Bottom centre, 36px, radius 10, ink fill, 13px/600. One line, 2.4s, no close button. |

Destructive actions are never a modal. Use the two-step inline confirm
(`delete-account.tsx`): the first tap arms, the second only counts after 600 ms,
"Keep it" is beside it.

### Gallery card

Radius 12, `border-edge`, 16:10 capture on `bg-muted`, caption `px-3.5 pt-2.5 pb-3`
over an `edge-faint` rule. Title `text-bodytext` 500, meta `text-meta ink-4`,
swatches 16px circles, kind `text-micro`. The whole card is one click target
(a `::after` on the title button); heart and visit sit above it at `z-10`.
Hover: border to `edge-strong`, image `scale(1.015)` (fine pointers only).
Selected: header tint, `border-foreground/25`, a 3px `outline-foreground/[0.07]`
halo. Cards never scale on press: the border answers instead.

### States

| State | Pattern |
| --- | --- |
| Loading, short | The spinner: 16px, `border-edge` with `border-t-ink-3` |
| Loading, layout known | Skeleton in the real shape: `bg-muted` blocks, `animate-pulse` |
| Refetching | Old results stay and step back: `aria-busy:opacity-55` |
| Busy button | Label becomes the gerund: "Sending…", "Opening…", "Making…"; disabled |
| Empty | Centred `text-meta ink-3` line; one next step if there is one |
| Error in a tab | `TabEmptyState`: icon + `text-micro` label, a plain explanation, technical details folded |
| Inline error | 12.5–13px in the error red, `role="status"` |
| Copied | Icon swaps Copy to Check; copy sound |
| Pro, not yet | A small card saying what it does and how to get it, never a dead or blurred control |

### Pro

Pro uses the same card as everything else; the mark is what sets it apart.

| Part | Spec |
| --- | --- |
| Pro card (`pro-card.tsx`) | `CARD.shell`, 380 max, Sheet shadow. Head "Membership" / "Cancel any time" (an Active pill for members). `<ProMark />` in the visual slot. 20/630 promise, plain feature lines (13.5, ink-2, no icons), 26/640 price, Monthly/Yearly `BTN.chip` radiogroup, foot with refund + Terms left and `BTN.primary` right |
| Pro mark (`pro-mark.tsx`) | A word in 3px squares on a 4px pitch, each a real library colour. Gathers, sorts in one sweep, rests. Hover lens, drag a square to copy it, replay on hover. `word` prop: "Pro" (default) or "404" |
| Pro word (`pro-word.tsx`) | The header's Pro: the word in BDO Grotesk 760, washed with library colours once (900ms), then still |
| AI tools card (`ai-tools-card.tsx`) | Tool chips, the snippet in a tinted 10px well with a copy `BTN.icon`, key rows on `edge-faint` hairlines, "New key" primary |
| Sample cards (`pro-extras.tsx`) | `CARD` with "Pro" in the head in ink-4 (not amber), real library data in the body |
| Watch upsell (`watch-button.tsx`) | The "Pro, not yet" pattern: what it does, how to get it |

Rules: one Pro signal per surface (the mark, a pill, or the PRO tag, never two).
No blurred, locked or dead controls. No glow, gradient or sparkle.

### System pages

`app/not-found.tsx` and `app/error.tsx` use the Pro card's frame: the
secondary nav, one card centred, a head naming what happened, two ways out.

| | 404 | Error |
| --- | --- | --- |
| Head | Not found · the missing path | Something went wrong · error id |
| Visual | `<ProMark word="404" />` | None (a failed page fetches nothing) |
| Line | This page isn't in the library. | This page didn't load. |
| Quiet action | Search ⌘K (to `/?browse=1`) | Back to the library |
| Primary | Back to the library → | Try again |

`/?browse=1` opens the gallery with the browse layer open. On the 404, ⌘K and
/ go there too.

---

## 10. Motion

### Tokens

| CSS | JS (`lib/motion`) | Value | Use |
| --- | --- | --- | --- |
| `--ease-sig` | `EASE` | `cubic-bezier(.23, 1, .32, 1)` | Anything entering or leaving |
| `--ease-move` | `MOVE_EASE` | `cubic-bezier(.77, 0, .175, 1)` | On-screen movement (tab thumb) |
| `--ease-hover` | `HOVER_EASE` | `cubic-bezier(.4, 0, .2, 1)` | Hover, colour, press |
| `--dur-press` | `DUR.press` | 140ms | Press scale |
| `--dur-1` | `DUR.exit` | 120ms | Exits, card border hover |
| `--dur-2` | `DUR.color` | 200ms | Colour changes, segmented thumb |
| `--dur-3` | `DUR.move` | 300ms | Card entrance |
| `--dur-4` | `DUR.reveal` | 450ms | Rare reveals only |
| | `POP_IN` / `POP_OUT` | 180ms / 120ms | Popovers in / out |

### The patterns

| Pattern | Spec |
| --- | --- |
| Press | `scale(.97)` on every button and link, fine pointers only. Opt out with `data-no-press` |
| Popover (`MENU`) | In: opacity 0 to 1, `translateY(-4px) scale(.98)` to rest, 180ms. Out: `translateY(-2px) scale(.99)`, 120ms |
| Sheet | In: `translateY(16px) scale(.98)`, 220ms `EASE`. Out: 120ms |
| Side sheet | Spring: damping 38, stiffness 420, mass .8, from `translateX(24px)`. Out 160ms |
| Scrim | Opacity, 180–220ms |
| Toast | `translateY(8px)` up, 200ms; out 120ms |
| Grid first paint | CSS `.card-enter`: `translateY(12px)` rise, 300ms, 30ms stagger, capped at 32 cards |
| Grid result swap | Old set dims to .55; new cards crossfade with `translateY(6px)`, 200ms |
| Panel tab change | Content fades in 150ms, old content leaves at 0ms |
| Site switch | Panel crossfade 120ms |
| Theme switch | View transition: new theme as a circle from the click point, 360ms `EASE` |
| Pro word | Colour wash across once, 900ms, then still. No hover motion |
| Pro mark | Squares gather, sort in one sweep, then rest; hover lens; replay on hover |

### Rules

1. Animate `transform` and `opacity` only. Write transforms as full strings
   (`'translateY(4px)'`), not motion's `x`/`y`/`scale`, so they stay on the compositor.
2. Exits are faster than entrances (120ms vs 180–220ms).
3. Nothing in everyday UI over 300ms. 450ms is for rare reveals.
4. No overshoot or bounce in everyday UI. The one spring (side sheet) is
   critically damped.
5. No animation on keyboard-triggered or very frequent actions: ⌘K opens
   instantly, arrow-key tab changes jump.
6. Hover motion only on `(hover: hover) and (pointer: fine)`.
7. Reduced motion keeps feedback and removes movement: colour and opacity
   still transition at `--dur-1`; transforms and keyframes stop. Every animated
   component must honour this.
8. Popovers grow from their trigger: set `transformOrigin` to its corner.

---

## 11. Sound

Synthesised in Web Audio, very quiet, off until the visitor has interacted,
toggled in the header (or the More menu). Each sound has one job.

| Sound | Trigger | Shape |
| --- | --- | --- |
| `playHover` | Card hover | A5 to G4 triangle, 40ms, barely there |
| `playSelect` | Open a site | G4 + D5 pluck, 120ms |
| `playFilterClick` | Sort, filter, chip | A5 sine tick, 30ms |
| `playTabChange` | Panel tab | E4 to G4 glide, 80ms |
| `playCopy` | Copy a value | C6 then E6, 70ms |
| `playClose` | Close a panel | A4 to E4, 100ms |
| `playPanelOpen` | Panel opens | E3 + B3 + E4 sine chord |
| `playThemeToggle` | Theme switch | E5 then A5 chime |
| `playSuccess` | Something finished | C5 E5 G5 arpeggio |

New sounds reuse these. Never add a sound to an action that fires many times
a second.

---

## 12. Accessibility

- **Focus:** keyboard focus is the amber ring, `outline-2 outline-offset-2
  outline-pro`. The global fallback is a 2px ring in `--ring`. Inputs
  show focus through their border instead.
- **Contrast:** text never lighter than `ink-4` (4.5:1 in both themes).
- **Targets:** 44px hit area via `after:` overlays on small controls.
- **Roles:** menus `role="menu"` with `menuitem` rows; Refine and Watch
  `role="dialog"`; segmented controls `tablist`/`tab` or `radiogroup`/`radio`;
  toggles `aria-pressed`; live counts `aria-live="polite"`.
- **Modals:** focus in, trapped, returned to the opener; Esc closes.
- **Skip link** to `#gallery`; `sr-only` text where an icon carries the label.

---

## 13. Copy

- One line per idea. Say what it does and stop.
- Sentence case everywhere. No exclamation marks.
- Buttons are verbs ("Show sites", "Email link"); empty states say what's true
  and the next step.
- Errors say what happened and what to do: "That link has expired. Send
  yourself a new one."
- British spelling in prose (colour), "Colors" only where it is a product name.

---

## 14. Checklist for anything new

- [ ] Built from `BTN`, `INPUT`/`FIELD`, `CARD`, `R`, `ICON`; no hand-rolled sizes
- [ ] Card anatomy: tinted head, one-idea body, tinted foot with actions right
- [ ] 2–3 type sizes, ink levels only, amber only for Pro or focus
- [ ] Radius from the ladder, concentric
- [ ] Popover uses `MENU` with the right `transformOrigin`; dismissal contract
- [ ] Motion: transform/opacity, under 300ms, exits faster, reduced motion handled
- [ ] Phosphor bold at 16/14/12, `fill` only for on states
- [ ] Focus ring, 44px targets, labels on icon buttons
- [ ] Checked at 320, 375, 768, 1440, light and dark
- [ ] Copy is short and plain
- [ ] Changelog entry in `data/changelog.ts` if a visitor can see it

---

## 15. Known drift

Cleaned up on 16 Nov 2026. What's left on purpose:

- Gallery card radius 12 and tablet sheet radius 14 sit off the ladder. Leave them; don't add more.
- Emails (`lib/email/*`) and the bare-HTML auth callback use hex colours inline, because they can't read CSS variables.
