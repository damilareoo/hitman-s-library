// lib/mcp/guide.ts
// The design brief that travels with the library into AI tools. It is the
// standard this site holds itself to, written for a model that is about to
// design something: decisions over decoration, and the habits that make
// generated interfaces look generated, named so they can be avoided.

/** One line each; sent as the server's instructions. */
export const GUIDE_SHORT = [
  'Borrow decisions, not looks: type scale, weight, leading, spacing rhythm, density, how colour is rationed. Never copy logos, wording, images or layouts.',
  'A type scale with a clear ratio (about 1.25), at most two families; display at a medium weight (500–600) with tight leading (1.0–1.1); body 15–17px at 1.5.',
  'Balance headings and wrap paragraphs so no line ends on a lone word: no widows.',
  'Tinted neutrals and one accent, used once or twice per screen for the thing that matters most. No gradient blobs, no default indigo, no emoji as icons.',
  'Spacing on a 4/8 grid; concentric corner radii (outer = inner + gap); hairlines before shadows.',
  'Hierarchy from size, weight and space, not from boxes around everything. Left-align by default; centre only short, single ideas.',
  'Motion fast and quiet: ease-out, under 300ms, nothing on actions repeated many times a day.',
  'Body text at AA contrast or better; tabular numerals for prices and data.',
]

/** The full brief, for get_design_guide. */
export const GUIDE_FULL = `# Design brief (Hitman's Library)

Use the library's sites as references for decisions, then design something of the user's own.

## Borrow decisions, not looks
- Read what a reference decided: its type scale, display weight and leading, body size, spacing rhythm, density, and how sparingly it uses colour. Apply those decisions to the user's content and brand.
- Combine more than one reference. Never reproduce a site's logo, wording, imagery or layout.
- Fonts: say which are paid. Offer a free, openly licensed alternative close in proportion and tone.

## Type
- One scale with a steady ratio (about 1.2–1.25). Two families at most: one sans (or serif) and, if needed, a mono for numbers and labels.
- Display: medium weight (500–600), tight leading (1.0–1.1), slightly negative tracking. Heavy 800 headlines are a default, not a decision.
- Body: 15–17px at 1.5 line height, 45–75 characters a line.
- Headings balanced (text-wrap: balance), paragraphs pretty (text-wrap: pretty): no line ends on a lone word.
- Tabular numerals for prices, stats and anything that lines up.

## Colour
- Tinted neutrals do most of the work. One accent, used for the single most important action or state on the screen.
- Check contrast: body text at AA (4.5:1) or better.
- Avoid: purple-to-pink gradients, glowing blobs, default indigo/violet, a different colour on every element.

## Space and structure
- Spacing on a 4/8 grid. Group by proximity; separate by space before lines, lines before boxes, boxes before shadows.
- Corner radii from one ladder and concentric: an inner corner = outer corner − the gap between them.
- Prefer structure that compares: aligned columns and hairlines over identical floating cards.
- Left-align by default. Centre only a short, single idea.

## Components
- One primary button per view; the rest secondary or text.
- Lists without a checkmark on every line; say what changes between options ("Everything in Free, plus…").
- Real content, never lorem ipsum. Labels short and specific.

## Motion
- Ease-out, 150–250ms for UI; exits faster than entrances; no animation on actions repeated many times a day; respect reduced motion.

## Signs of generated design to avoid
- Centred hero + three identical cards + a "Most popular" badge with a gradient.
- Emoji or random icons as decoration; everything in a rounded card with a drop shadow.
- Every element a different colour; weights of 800 everywhere; lorem ipsum.
`
