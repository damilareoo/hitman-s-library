// components/member-card.ts
// One scale for the two member cards (the sign-in sheet and the account card),
// so type, spacing and actions match exactly.
export const CARD = {
  shell: 'bg-popover text-popover-foreground border border-edge-strong rounded-[16px] overflow-hidden',
  pad: 'px-4',
  label: 'text-[11px] leading-none font-[600] tracking-[0.12em] uppercase text-ink-4',
  number: 'text-[11px] leading-none font-[600] tracking-[0.06em] text-[#E8A04A] whitespace-nowrap',
  body: 'text-[13.5px] leading-[1.45] text-ink-3',
  meta: 'text-[12px] leading-[1.4] text-ink-4',
  // The anatomy every small card shares: a quiet tinted header with a short
  // title, a white body with one idea, a tinted footer for the actions.
  head: 'h-10 px-4 flex items-center justify-between gap-3 bg-foreground/[0.025] border-b border-edge text-[12.5px] font-[500] text-ink-3',
  foot: 'h-11 px-2 flex items-center gap-1 bg-foreground/[0.025] border-t border-edge',
  footBtn: 'h-8 px-2 flex items-center gap-1.5 rounded-[8px] text-[12.5px] font-[500] text-ink-3 hover:text-ink hover:bg-foreground/[0.05] transition-colors focus-visible:outline-2 focus-visible:outline-[#E8A04A]',
  title: 'text-[15px] font-[620] tracking-[-0.02em] leading-tight text-ink',
  pill: 'h-6 px-2 inline-flex items-center rounded-full border border-edge text-[11.5px] font-[600] text-ink-3',
  proPill: 'h-6 px-2 inline-flex items-center gap-1 rounded-full bg-[#E8A04A]/[0.14] text-[11.5px] font-[650] text-[#A8611A] dark:text-[#F0B36A]',
  kbd: 'h-5 min-w-5 px-1 inline-grid place-items-center rounded-[5px] bg-foreground/[0.07] text-[10.5px] font-[600] text-ink-3',
  action: 'flex items-center gap-2 h-10 text-[13.5px] font-[600] tracking-[-0.01em] text-ink hover:bg-foreground/[0.04] active:bg-foreground/[0.07] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8A04A]',
}
