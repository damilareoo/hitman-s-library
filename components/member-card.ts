// components/member-card.ts
// The site's one scale for cards, buttons and corners, so type, spacing,
// actions and radii match everywhere.
//
// Radius: one ladder, kept concentric. A nested corner is the outer corner
// minus the gap between them, so curves run parallel:
//   card 16 → rows in a 6px inset 10 → controls 10 → a button 4px inside a
//   field 6 → key caps 5. Chips and toggles are fully round.
export const R = {
  card: 'rounded-[16px]',
  inset: 'rounded-[10px]',   // rows and plates inside a card's 6px inset
  control: 'rounded-[10px]', // buttons, inputs, field groups
  nested: 'rounded-[6px]',   // a button sitting 4px inside a control
  key: 'rounded-[5px]',
  chip: 'rounded-full',
}

const btnBase = 'inline-flex items-center justify-center gap-1.5 shrink-0 font-[600] tracking-[-0.01em] whitespace-nowrap transition disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A]'

/** Buttons: two sizes, three looks. md is 32px (cards, toolbars), lg is 40px (forms, full-width). */
export const BTN = {
  primary: `${btnBase} h-8 px-3 ${R.control} text-[13px] bg-foreground text-background hover:opacity-90 active:scale-[0.98]`,
  secondary: `${btnBase} h-8 px-3 ${R.control} text-[13px] border border-edge-strong text-ink hover:bg-foreground/[0.04] active:bg-foreground/[0.07]`,
  ghost: `${btnBase} h-8 px-2.5 ${R.control} text-[13px] font-[500] text-ink-3 hover:text-ink hover:bg-foreground/[0.05]`,
  primaryLg: `${btnBase} h-10 px-4 ${R.control} text-[13.5px] bg-foreground text-background hover:opacity-90 active:scale-[0.99]`,
  secondaryLg: `${btnBase} h-10 px-4 ${R.control} text-[13.5px] border border-edge-strong text-ink hover:bg-foreground/[0.04] active:bg-foreground/[0.07]`,
  /** A button inside a 40px field, 4px from its edge: 32px tall, corner 10 − 4 = 6. */
  inField: `${btnBase} h-8 px-3 ${R.nested} text-[12.5px] bg-foreground text-background hover:opacity-90 active:scale-[0.98]`,
  /** Square icon buttons (close, etc). */
  icon: `inline-grid place-items-center shrink-0 w-8 h-8 ${R.control} text-ink-4 hover:text-ink hover:bg-foreground/[0.06] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A04A]`,
  /** Toggle chips; pass the active state through `chip(active)`. */
  chip: (active: boolean) => `${btnBase} h-7 px-3 ${R.chip} border text-[12px] ${active ? 'border-foreground bg-foreground text-background' : 'border-edge text-ink-3 hover:text-ink'}`,
}

/**
 * Every text input on the site. One look: 40px tall, corner 10, a firm hairline
 * on a transparent ground, 14px text; the border strengthens on hover and focus.
 */
export const INPUT = `w-full h-10 px-3 ${R.control} border border-edge-strong bg-transparent text-[14px] tracking-[-0.01em] text-ink placeholder:text-ink-4 outline-none hover:border-foreground/30 focus:border-foreground/50 transition-colors`
/** The compact input for inline spots (32px), same look. */
export const INPUT_SM = INPUT.replace('h-10 px-3', 'h-8 px-2.5').replace('text-[14px]', 'text-[13px]')
/** A 40px field that can hold a BTN.inField on its right; same look as INPUT. */
export const FIELD = `flex items-center gap-1 h-10 pl-3 pr-1 ${R.control} border border-edge-strong hover:border-foreground/30 focus-within:border-foreground/50 transition-colors`
/** The bare input that sits inside a FIELD. */
export const FIELD_INPUT = 'flex-1 min-w-0 h-full bg-transparent outline-none text-[14px] tracking-[-0.01em] text-ink placeholder:text-ink-4'
/**
 * Icons: one set (Phosphor), one weight. Bold everywhere so strokes match the
 * 500–600 weight of the type beside them; fill only for an "on" state
 * (watching, saved, the active tab, a heart). Three sizes, by place:
 * 16px in an icon button, 14px beside text, 12px inside a chip or small label.
 */
export const ICON = {
  button: 'w-4 h-4',
  inline: 'w-3.5 h-3.5',
  micro: 'w-3 h-3',
} as const

export const CARD = {
  shell: 'bg-popover text-popover-foreground border border-edge-strong rounded-[16px] overflow-hidden', // R.card
  pad: 'px-4',
  label: 'text-[11px] leading-none font-[600] tracking-[0.12em] uppercase text-ink-4',
  number: 'text-[11px] leading-none font-[600] tracking-[0.06em] text-[#E8A04A] whitespace-nowrap',
  body: 'text-[13.5px] leading-[1.45] text-ink-3',
  meta: 'text-[12px] leading-[1.4] text-ink-4',
  // The anatomy every small card shares: a quiet tinted header with a short
  // title, a white body with one idea, a tinted footer for the actions.
  head: 'h-10 px-4 flex items-center justify-between gap-3 bg-foreground/[0.025] border-b border-edge text-[12.5px] font-[500] text-ink-3',
  foot: 'h-11 px-2 flex items-center gap-1 bg-foreground/[0.025] border-t border-edge',
  footBtn: 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] text-[13px] font-[500] text-ink-3 hover:text-ink hover:bg-foreground/[0.05] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A04A]', // = BTN.ghost
  title: 'text-[15px] font-[620] tracking-[-0.02em] leading-tight text-ink',
  pill: 'h-6 px-2 inline-flex items-center rounded-full border border-edge text-[11.5px] font-[600] text-ink-3',
  proPill: 'h-6 px-2 inline-flex items-center gap-1 rounded-full bg-[#E8A04A]/[0.14] text-[11.5px] font-[650] text-[#A8611A] dark:text-[#F0B36A]',
  kbd: 'h-5 min-w-5 px-1 inline-grid place-items-center rounded-[5px] bg-foreground/[0.07] text-[10.5px] font-[600] text-ink-3',
  action: 'flex items-center gap-2 h-10 text-[13.5px] font-[600] tracking-[-0.01em] text-ink hover:bg-foreground/[0.04] active:bg-foreground/[0.07] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]',
}
