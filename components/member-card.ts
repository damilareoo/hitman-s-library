// components/member-card.ts
// One scale for the two member cards (the sign-in sheet and the account card),
// so type, spacing and actions match exactly.
export const CARD = {
  shell: 'bg-popover text-popover-foreground border border-edge-strong rounded-[16px] overflow-hidden',
  pad: 'px-5',
  label: 'text-[11px] leading-none font-[600] tracking-[0.12em] uppercase text-ink-4',
  number: 'text-[11px] leading-none font-[600] tabular-nums tracking-[0.06em] text-[#E8A04A] whitespace-nowrap',
  body: 'text-[13.5px] leading-[1.45] text-ink-3',
  meta: 'text-[12px] leading-[1.4] text-ink-4',
  action: 'flex items-center gap-2 h-11 text-[13.5px] font-[600] tracking-[-0.01em] text-ink hover:bg-foreground/[0.04] active:bg-foreground/[0.07] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]',
}
