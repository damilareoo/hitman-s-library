export type ChangeType = 'new' | 'improved' | 'fixed'

export interface ChangeItem {
  type: ChangeType
  text: string
}

export interface ChangelogRelease {
  date: string        // ISO date, e.g. "2026-04-02"
  title: string       // short release name, e.g. "Mobile Screenshots"
  description?: string
  items: ChangeItem[]
}

// To add a new release: prepend an entry to this array.
// Dates are displayed as "Apr 2, 2026".
// Types: "new" (green) | "improved" (blue) | "fixed" (muted)
const changelog: ChangelogRelease[] = [
  {
    date: '2026-05-11',
    title: 'Accessibility, Polish & Code Health',
    description: 'Keyboard navigation, screen-reader labels, design-token alignment, and bundle cleanup from a full quality audit.',
    items: [
      { type: 'improved', text: 'Removed unused DesignBrowser component — eliminates dead code and reduces bundle' },
      { type: 'fixed', text: 'Type specimen sample text and glyphs now render at correct opacity — was using hsl() around an oklch token which browsers silently ignored' },
      { type: 'fixed', text: 'Design cards are now keyboard-navigable — Tab to reach, Enter or Space to open the detail panel' },
      { type: 'improved', text: 'Status colors (success, error, loading) now use design tokens — consistent across nodes, type specimens, figma tab, and changelog' },
      { type: 'improved', text: 'Consolidated to single icon library (@phosphor-icons) — removed lucide-react dependency' },
      { type: 'fixed', text: 'Search inputs now have accessible labels for screen readers via aria-label' },
      { type: 'fixed', text: 'Filter and sort buttons now announce their active/inactive state to screen readers via aria-pressed' },
    ],
  },
  {
    date: '2026-05-11',
    title: 'Figma Native Paste, Thumbnail Fix & UI Polish',
    description: 'Copy any screenshot directly to your clipboard and paste into Figma without any plugin. All 177 site cards now show their own captured screenshots reliably.',
    items: [
      { type: 'new',      text: 'Figma tab — copy Desktop or Mobile screenshot as a PNG image, paste directly into Figma with ⌘V — no html.to.design plugin required' },
      { type: 'new',      text: 'Sort pills in header — New / Old / A–Z / Top (quality)' },
      { type: 'new',      text: 'Multi-select industry filters — hold multiple categories at once' },
      { type: 'new',      text: 'Card hover reveals a visit ↗ button without opening the detail panel' },
      { type: 'new',      text: 'Tags shown on gallery cards and in the detail panel header' },
      { type: 'new',      text: 'Detail panel hostname is now a direct link to the site' },
      { type: 'improved', text: 'All 177 thumbnails now use captured blob screenshots — eliminates blank cards from rate-limited external screenshot services' },
      { type: 'improved', text: 'Sidebar category counts now match exactly what the gallery shows' },
      { type: 'fixed',    text: 'Font 404 errors — removed dead @font-face declarations for missing SuisseIntl files' },
      { type: 'fixed',    text: 'Extraction error UI in Preview tab was never visible due to an impossible condition' },
      { type: 'fixed',    text: 'Re-extract could crash Colors/Type/Assets tabs by not normalizing null arrays' },
      { type: 'fixed',    text: 'Quality sort silently fell back to "newest" — now correctly sorts by extracted quality score' },
      { type: 'fixed',    text: 'SVG assets tab had an XSS vector from inline rendering of raw DB content' },
    ],
  },
  {
    date: '2026-04-06',
    title: 'Breakpoints, Full-Page Copy & Bug Fixes',
    description: 'Figma tab now lets you simulate any breakpoint and copy the full page. Stability fixes eliminate the client-side crash and missing site cards.',
    items: [
      { type: 'new',      text: 'Breakpoint selector in Figma tab — switch between Auto / 390 / 768 / 1440px and see the site respond live' },
      { type: 'new',      text: 'Full-page copy — one click captures the entire page as Figma layers, not just a single element' },
      { type: 'fixed',    text: 'Client-side exception on some sites — API error responses now handled gracefully, no more crash on load' },
      { type: 'fixed',    text: 'Site cards not visible — gallery query was referencing non-existent DB columns, now uses safe correlated subqueries' },
      { type: 'fixed',    text: 'Retina screenshots — desktop now captured at 2× DPR, mobile at 3×, with lazy-image scroll-through before capture' },
      { type: 'improved', text: 'Card image hover — CSS transition replaces motion.img for better performance and no layout shift' },
    ],
  },
  {
    date: '2026-04-05',
    title: 'Figma Element Picker & Live Preview',
    description: 'The Figma tab now shows the live site — hover to inspect, click any element to copy it to Figma instantly. Full-page copy is pre-loaded so it\'s immediate too.',
    items: [
      { type: 'new',      text: 'Element picker — hover any element to highlight it, click to copy directly to Figma' },
      { type: 'new',      text: 'Full-page Figma layers pre-loaded on tab open — copy is instant, no wait' },
      { type: 'new',      text: 'HTML proxy — loads any site inside the panel regardless of X-Frame-Options restrictions' },
      { type: 'new',      text: 'Live preview — embedded iframe replaces static screenshots entirely' },
      { type: 'new',      text: 'Figma tab — dedicated panel tab with auto-capture on first open' },
      { type: 'new',      text: 'Search input in header — search across all sites in real time' },
      { type: 'improved', text: 'Panel header redesigned — compact icon row for visit, re-extract, and close' },
      { type: 'improved', text: 'Preview simplified — responsive iframe with no desktop/mobile toggle needed' },
      { type: 'fixed',    text: 'Filter effect dep used JSON.stringify on every render — replaced with stable primitives' },
    ],
  },
  {
    date: '2026-04-02',
    title: 'Copy to Figma, Mobile Views & More',
    description: 'A batch of tools that make the library more actionable — export designs, capture mobile layouts, and send layers directly to Figma.',
    items: [
      { type: 'new',      text: 'Copy to Figma — paste any captured site as editable layers directly into Figma' },
      { type: 'new',      text: 'Mobile screenshots alongside desktop — captured at 390×844 during extraction' },
      { type: 'new',      text: 'Desktop / Mobile toggle in the preview tab' },
      { type: 'new',      text: 'Palette export — copy colors as CSS custom properties or Tailwind config in one click' },
      { type: 'new',      text: 'Bulk add — paste multiple URLs at once and watch them process in a live queue' },
      { type: 'new',      text: 'Preloader — 000→100 counter on first visit' },
      { type: 'improved', text: 'HEX and OKLCH values are now separately copyable from the colors tab' },
    ],
  },
  {
    date: '2026-04-01',
    title: 'UI Redesign & Sound',
    description: 'The whole interface got a quiet, high-contrast overhaul. Sound feedback added for copy and success actions.',
    items: [
      { type: 'improved', text: 'Full gallery layout redesign — cleaner grid, tighter type, better dark mode' },
      { type: 'new',      text: 'Subtle sound effects on copy and successful extraction' },
      { type: 'improved', text: 'Admin CMS — passcode protection and one-click duplicate removal' },
      { type: 'fixed',    text: 'Admin page was unscrollable due to a global overflow:hidden — resolved' },
    ],
  },
  {
    date: '2026-03-17',
    title: 'Performance, Polish & Mobile',
    description: 'Faster perceived load, better mobile interactions, and more color control.',
    items: [
      { type: 'new',      text: 'Skeleton loading on first page load and category filtering' },
      { type: 'new',      text: 'HEX / OKLCH format toggle on the colors tab' },
      { type: 'improved', text: 'Dark / light theme toggle — instant, no flash of wrong theme' },
      { type: 'improved', text: 'Category labels rewritten to better reflect actual design context' },
      { type: 'improved', text: 'Mobile sheet — safe-area insets and 44px touch targets throughout' },
      { type: 'fixed',    text: 'Prevented scroll chaining between preview panel and page body on mobile' },
      { type: 'fixed',    text: 'Edge case: achromatic and scientific-notation OKLCH values now parse correctly' },
    ],
  },
  {
    date: '2026-03-04',
    title: 'Real Screenshots',
    description: 'Cards now show actual screenshots of the captured site instead of color blocks.',
    items: [
      { type: 'new',      text: 'Live website screenshots displayed on every design card' },
      { type: 'improved', text: 'Switched to a reliable headless screenshot pipeline after testing multiple providers' },
    ],
  },
  {
    date: '2026-02-24',
    title: 'Copy Feedback & Social',
    description: 'Small interactions that make copying feel right.',
    items: [
      { type: 'new',      text: 'Copy feedback on color swatches — animated toast on click' },
      { type: 'new',      text: 'OG image and social meta for sharing the library' },
      { type: 'improved', text: 'Microinteractions across the UI following Emil Kowalski\'s principles' },
    ],
  },
  {
    date: '2026-02-23',
    title: 'Initial Launch',
    description: 'Hitman\'s Library ships. Extract, browse, and reference design systems from any URL.',
    items: [
      { type: 'new', text: 'Color palette extraction — brand colors with OKLCH values' },
      { type: 'new', text: 'Typography extraction — font families, roles, and Google Fonts links' },
      { type: 'new', text: 'Asset catalog — logos, icons, images discovered per site' },
      { type: 'new', text: 'Industry categorization for every captured site' },
      { type: 'new', text: 'Browse and search across your entire design library' },
      { type: 'new', text: 'Excel import for bulk seeding the library' },
    ],
  },
]

export default changelog
