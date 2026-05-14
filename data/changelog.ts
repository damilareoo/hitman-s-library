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
    date: '2026-05-14',
    title: 'Designed States — No More Screenshot Crutches',
    description: 'Every "loading" and "blocked" state is now a proper designed UI — honest, intentional, and consistent with the design language. Screenshots are no longer used as automatic fallbacks when a live preview fails.',
    items: [
      { type: 'improved', text: 'Preview tab loading state: clean domain name + three staggered pulsing dots — no screenshot background while the iframe loads. What you see while loading matches what you\'ll see when it\'s ready' },
      { type: 'improved', text: 'Preview tab proxy-failed state: domain name + "Live preview unavailable" label + "Open site ↗" CTA. Honest about what\'s happening instead of silently showing a static screenshot as if it were live' },
      { type: 'improved', text: 'Presentation mode proxy-failed state: subtle dot-grid background, large domain name, industry label, color palette swatches, and a "Visit site ↗" link. Blocked sites now feel like reference cards, not broken frames' },
      { type: 'improved', text: 'Design card selected state: top accent line (2px) appears when a card is active — stronger visual signal that pairs with the brighter border' },
      { type: 'improved', text: 'Design card color swatches are slightly larger (14px) for better readability at a glance' },
      { type: 'improved', text: 'Empty panel state: "Select a site" now shows the list of available tabs (preview · colors · type · assets · figma) as a quiet visual hint of what\'s inside' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Figma Layers — Copy Any Site as Editable Layers',
    description: 'New "Layers" button in the Figma tab copies the full site as real Figma layers — text, shapes, and structure — not a flat screenshot. No plugin required.',
    items: [
      { type: 'new', text: 'Layers button in the Figma tab — opens the site in a capture window using Figma\'s own publicly-hosted capture.js script (the same tool that powers their AI integrations). Click "Copy to clipboard" in the toolbar that appears, then ⌘V in Figma to get fully editable text, shapes, and layout — not a rasterized PNG' },
      { type: 'new', text: 'Element selection in capture mode — the capture toolbar lets you select any component (nav, card, pricing section) instead of capturing the full page, so you can pull only what you need into Figma' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Performance & Design Polish',
    description: 'Faster perceived load across preview and presentation mode. Sharper visual hierarchy in the sidebar and detail panel.',
    items: [
      { type: 'improved', text: 'Presentation mode shows the site thumbnail immediately while the proxy iframe loads — navigating between sites now feels instant instead of flashing to black' },
      { type: 'improved', text: 'Presentation mode: added always-visible prev/next buttons to the bottom HUD — arrows are now immediately discoverable instead of requiring hover over the preview area' },
      { type: 'improved', text: 'Sidebar active category now has a left border accent — clearer visual signal for which filter is selected, especially when multiple industries are active' },
      { type: 'improved', text: 'Panel tabs: active tab label is now font-medium — stronger differentiation from inactive tabs at a glance' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Critical: App Crash on Site Preview',
    description: 'Fixed a root-cause bug that crashed the entire app when previewing certain sites.',
    items: [
      { type: 'fixed', text: 'Added sandbox attribute to all proxy iframes — the root cause of "Application error" crashes. The proxy serves external sites at the hitmanslibrary.xyz origin, so their JavaScript ran same-origin, letting any unhandled JS error in those sites fire window.onerror on the parent and trigger the Next.js error page. Sandboxing the iframes without allow-same-origin isolates errors to the iframe while keeping postMessage (used for proxy-failed signals and the Figma picker) fully functional.' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Presentation Mode Redesign & Touch Targets',
    description: 'Presentation mode rebuilt from the ground up with a minimal overlay HUD. Touch targets increased to 44px+ across the entire UI.',
    items: [
      { type: 'improved', text: 'Presentation mode: minimal overlay HUD — controls float at top-right and fade in after a beat so the first thing you see is the site, not chrome' },
      { type: 'improved', text: 'Presentation mode: nav arrows appear only on hover over the preview area, keeping the experience immersive when you\'re just watching' },
      { type: 'improved', text: 'Presentation mode: thin animated progress bar at the very top shows your position across the full collection at a glance' },
      { type: 'improved', text: 'Presentation mode: bottom HUD shows domain, industry, counter, and color palette in one compact row instead of two separate top/bottom bars' },
      { type: 'improved', text: 'Presentation mode: info row slides in the direction of navigation — left when going back, right when going forward — giving a physical sense of movement' },
      { type: 'new', text: 'Presentation mode: swipe left/right to navigate on touch devices — works on any phone or tablet without tapping arrows' },
      { type: 'improved', text: 'Header icon buttons increased from 32px to 36px — easier to tap accurately on touch screens' },
      { type: 'improved', text: 'Mobile category filter pills increased from 28px to 40px height — were consistently too small to tap without mis-tapping adjacent pill' },
      { type: 'improved', text: 'Sidebar filter rows increased to 36px — matches minimum recommended touch target for dense lists' },
      { type: 'improved', text: 'Detail panel action buttons (re-extract, close) increased from 32px to 36px' },
      { type: 'improved', text: 'Panel tabs increased from 40px to 44px height — meets Apple HIG minimum touch target recommendation' },
      { type: 'improved', text: 'Color copy button expanded to 28px minimum — was previously a 12px hit target from a 4px padding box' },
      { type: 'improved', text: 'Type specimen action icons (copy, Google Fonts link) increased from 24px to 32px' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Performance, Bug Fixes & Figma Tab',
    description: 'Fixed site-wide performance regression, wired the missing Figma tab, and patched several data display bugs.',
    items: [
      { type: 'fixed', text: 'Figma tab now appears in the detail panel — it was fully implemented but never wired into the panel tabs' },
      { type: 'improved', text: 'Replaced transition-all on all buttons and links with transition-colors — eliminates browser compositing cost across all CSS properties on every click target' },
      { type: 'fixed', text: 'Sidebar and mobile filter "All" count now shows the real total (e.g. 177) instead of the current page load (32)' },
      { type: 'fixed', text: 'Removed invalid workflow key from next.config.mjs that was generating startup warnings on every dev server boot' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'TypeScript Bug Fixes',
    description: 'Full type-error sweep — zero TS errors across the entire codebase.',
    items: [
      { type: 'fixed', text: 'Created missing UI components: Label, Select, Badge, Tabs, ScrollArea, Textarea, Slider — many node and panel components were importing these non-existent files' },
      { type: 'fixed', text: 'Created missing lib/node-utils module — all node components importing getStatusColor() were silently broken at runtime' },
      { type: 'fixed', text: 'Node components now use correct @xyflow/react v12 NodeProps generic — NodeProps<FlowNode<DataType>> instead of NodeProps<DataType>' },
      { type: 'fixed', text: 'fetch() timeout option removed — not part of RequestInit; replaced with AbortController signal for proper 8s timeout on URL extraction' },
      { type: 'fixed', text: 'motion/react Variants type — spring transition type is now a string literal (as const) so it satisfies AnimationGeneratorType' },
      { type: 'fixed', text: 'unknown → ReactNode errors in 6 node files — output conditions now use !! to guarantee boolean before &&' },
      { type: 'fixed', text: 'Missing CheckCircle import in excel-parser node' },
      { type: 'fixed', text: 'prompt-node onFocus handler accepts SyntheticEvent instead of MouseEvent' },
      { type: 'fixed', text: 'Implicit any on Slider onValueChange callbacks — destructured value now typed as number[]' },
      { type: 'fixed', text: 'Implicit any on forEach callbacks in browser-extraction.ts — all font string arrays now typed explicitly' },
    ],
  },
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
      { type: 'fixed', text: 'Color swatch copy button now announces its action and value to screen readers' },
      { type: 'fixed', text: 'Re-extract button uses aria-label instead of title — now accessible to screen readers and keyboard users' },
      { type: 'fixed', text: 'Mobile detail sheet upgraded to native <dialog> with showModal() — gains proper focus trapping, Escape to close, and system backdrop' },
      { type: 'fixed', text: 'Presentation mode screenshot alt text now describes the site by name, not just domain' },
      { type: 'improved', text: 'Extracted shared NodeStatus component — eliminates duplicated status icon logic across all node components' },
      { type: 'fixed', text: 'Google Fonts stylesheet now only injected once per URL — prevents duplicate network requests when multiple type specimens share a font' },
      { type: 'fixed', text: 'Theme toggle button now announces the destination mode ("Switch to dark mode") rather than just "Toggle theme"' },
      { type: 'fixed', text: 'Preloader is now hidden from screen readers via aria-hidden — decorative counter is not meaningful content' },
      { type: 'fixed', text: 'Preloader setTimeout calls now properly cleaned up on unmount — eliminates potential state updates after component is removed' },
      { type: 'fixed', text: 'Color swatches on gallery cards now have role="img" and aria-label with the hex value for screen readers' },
      { type: 'improved', text: 'Replaced all spring/bounce easing (0.34,1.56,0.64,1) with ease-out-expo (0.22,1,0.36,1) — animations feel faster and more intentional' },
      { type: 'improved', text: 'Extracted DesignCard component and getDomain helper to their own files — reduces page.tsx by ~130 lines' },
      { type: 'improved', text: 'Assets tab checkerboard background now uses design tokens — adapts correctly to light and dark mode' },
      { type: 'improved', text: 'Preview tab screenshot image now uses loading="lazy" — deferred until the panel is actually viewed' },
      { type: 'improved', text: 'Re-extract and close icon buttons in the detail panel increased from 28px to 32px for easier touch activation' },
      { type: 'improved', text: 'Package name corrected from "ai-agent-builder" to "hitmans-library"' },
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
