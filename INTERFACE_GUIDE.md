# Design Library - Interface Overview

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DESIGN LIBRARY HEADER                        │
│  [Large Title] "Design Library"                                     │
│  [Subtitle] "Curate, extract, and reference high-quality design"    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│         ADD DESIGN SECTION               │
│  [URL Input Field] [Add Button]          │
│  [Import Excel Button] [Info Text]       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│         FILTER SECTION                   │
│  [All] [SaaS] [E-commerce] [FinTech]...  │
│  [Search Field - "Search by name..."]    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┬─────────────────────────┐
│                                          │                         │
│          GALLERY GRID (3 columns)        │    DETAIL PANEL         │
│                                          │    (Right Slide-In)     │
│  ┌──────────┐  ┌──────────┐              │                         │
│  │ Design 1 │  │ Design 2 │  ┌──────┐   │  URL                   │
│  │ SaaS     │  │ SaaS     │  │ Des. │   │  Industry              │
│  │ ⭐8/10   │  │ ⭐9/10   │  │ 3    │   │  Quality: ─────── 9/10 │
│  └──────────┘  └──────────┘  └──────┘   │                         │
│                                          │  COLORS                 │
│  ┌──────────┐  ┌──────────┐              │  ■ #000000             │
│  │ Design 4 │  │ Design 5 │              │  ■ #FFFFFF             │
│  │ E-comm   │  │ Design   │              │  ■ #3B82F6             │
│  │ ⭐7/10   │  │ ⭐8/10   │              │                         │
│  └──────────┘  └──────────┘              │  TYPOGRAPHY            │
│                                          │  Inter                  │
│  [More designs...]                       │  Helvetica             │
│                                          │                         │
│                                          │  LAYOUT                 │
│                                          │  Grid-based responsive  │
│                                          │                         │
│                                          │  [Copy Prompt Button]   │
│                                          │                         │
└──────────────────────────────────────────┴─────────────────────────┘
```

## Component Breakdown

### 1. Header
```
DESIGN LIBRARY
Curate, extract, and reference high-quality design systems
```
- Left-aligned, bold monotype
- Sets context and purpose

### 2. Add Design Zone
```
[Paste design URL...]                    [Add]
[Import Excel]    Excel: columns should be URL, Title, Industry
```
- Input field for URL
- "Add" button triggers extraction
- Excel import with format guidance

### 3. Filter Bar
```
[All] [SaaS] [E-commerce] [FinTech] [HealthTech] [Media] [Design] [Agency]
[Search by name or tag...]
```
- Toggle filters (active = solid bg)
- Real-time search below
- Shows filtered count

### 4. Gallery Cards
Each card shows:
```
┌──────────────────┐
│   [Thumbnail]    │
│   Site Name      │
│   SaaS           │
│   ■ ■ ■ ⭐ 8/10  │
└──────────────────┘
```
- Optional thumbnail
- Title (bold)
- Industry (small, muted)
- Color swatches + quality rating
- Hover effect: border highlights

### 5. Detail Panel (Right)
Opens on card click, slides in from right:

```
┌─────────────────────────────┐
│ DETAILS                   [×]│
├─────────────────────────────┤
│                             │
│ URL                         │
│ https://example.com/...     │
│                             │
│ INDUSTRY                    │
│ SaaS                        │
│                             │
│ QUALITY SCORE               │
│ ─────────── 9/10           │
│                             │
│ COLOR PALETTE               │
│ ■ #000000  (click to copy)  │
│ ■ #FFFFFF                   │
│ ■ #3B82F6                   │
│                             │
│ TYPOGRAPHY                  │
│ Inter      (click to copy)   │
│ Helvetica                   │
│                             │
│ LAYOUT                      │
│ Grid-based responsive...    │
│                             │
│ ARCHITECTURE                │
│ Card components • Modals    │
│                             │
│ TAGS                        │
│ [responsive] [modern]       │
│                             │
│ [Copy Prompt - Full Width] │
│                             │
└─────────────────────────────┘
```

- Sticky header with close button
- All metadata organized vertically
- Color swatches clickable (copies hex)
- Typography clickable (copies font name)
- Copy Prompt button at bottom

## States & Interactions

### Empty State
```
No designs added yet. Start by pasting a URL or importing an Excel sheet.
```
- Centered text
- Encourages first action

### Loading State
```
[URL Input] [Analyzing...]
```
- Button text changes to "Analyzing..."
- Input disabled
- Visual feedback

### Search/Filter Results
```
5 designs
[Gallery with filtered cards only]
```
- Counter shows filtered count
- Gallery updates in real-time

### Detail Panel Open
```
[Gallery Dimmed]  [Panel Highlighted]
```
- Panel slides in from right
- Gallery remains visible for context

## Color Scheme

### Light Mode
- Background: #FFFFFF
- Foreground: #000000
- Border: #E5E5E5
- Muted text: #666666
- Muted background: #F5F5F5

### Typography
- All text: **IBM Plex Mono**
- Headers: Bold (700)
- UI elements: Regular (400-500)
- Consistent monospace aesthetic

## Responsive Design

### Desktop (1024px+)
- 3-column gallery grid
- Detail panel: 384px wide
- Full feature set visible

### Tablet (768px-1023px)
- 2-column gallery grid
- Detail panel: Same width, stack below on smaller
- Touch-friendly spacing

### Mobile (< 768px)
- 1-column gallery grid
- Detail panel: Full width, overlays gallery
- Tab-based navigation if needed

## Interactions

### Add Design
1. User pastes URL
2. Clicks "Add" or presses Enter
3. Button shows "Analyzing..."
4. API extracts design details
5. New card appears at top of gallery
6. Input cleared

### Import Excel
1. User clicks "Import Excel"
2. File picker opens
3. Select .csv or .xlsx file
4. Processing starts
5. Alert shows "Imported X designs"
6. All designs appear in gallery

### View Details
1. User clicks design card
2. Panel slides in from right
3. All metadata displayed
4. Clickable elements (colors, fonts) highlighted

### Copy Details
1. Click color swatch → hex copied
2. Click font name → font copied
3. Click "Copy Prompt" → full design brief copied
4. Visual feedback (subtle highlight)

### Search/Filter
1. Type in search input
2. Gallery updates instantly
3. Shows filtered count
4. No results message if empty

---

## Swiss Design Principles Applied

1. **Grid-Based Layout** - Monotype font creates typographic grid
2. **Whitespace** - Generous padding and margins
3. **Hierarchy** - Font weight and size variations only
4. **Minimal Color** - Black, white, grays only (plus extracted colors)
5. **Order** - Logical flow: input → filters → content → details
6. **Clarity** - Clear labels, no decorative elements
7. **Technical** - Monotype font emphasizes precision
8. **Balance** - Symmetric layout, centered content
