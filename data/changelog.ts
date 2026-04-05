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
    date: '2026-04-05',
    title: 'Figma Element Picker',
    description: 'Click any element on any page and paste it into Figma as pixel-perfect editable layers. Full-page copy still works too.',
    items: [
      { type: 'new',      text: 'Element picker — hover to highlight, click to select any element, copy directly to Figma' },
      { type: 'new',      text: 'HTML proxy — strips X-Frame-Options so any site can be displayed and interacted with inside the panel' },
      { type: 'improved', text: 'Figma tab now has Full page and Pick element modes for granular or bulk export' },
      { type: 'improved', text: 'Preview tab simplified — responsive live iframe with no desktop/mobile toggle' },
    ],
  },
  {
    date: '2026-04-05',
    title: 'Live Preview & Figma Tab',
    description: 'The panel is rethought — live site previews replace static screenshots, and Figma layers get their own dedicated tab.',
    items: [
      { type: 'new',      text: 'Live preview — desktop and mobile viewports load the actual site in an embedded frame' },
      { type: 'new',      text: 'Figma tab — dedicated panel tab with a single prominent Copy Figma Layers button' },
      { type: 'improved', text: 'Figma layers auto-captured when tab is opened — no manual trigger needed' },
      { type: 'new',      text: 'Search input in the header — search across all sites in real time' },
      { type: 'improved', text: 'Panel actions (visit, re-extract, close) moved into a compact icon row in the header' },
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
