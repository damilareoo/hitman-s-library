// Motion constants for motion/react — mirrors --ease-* / --dur-* in globals.css.
//
// Fast and quiet: strong ease-out for anything entering or leaving, no
// overshoot in everyday UI, exits quicker than entrances. Transforms are
// written as full strings so motion hands them to the compositor; the x/y/scale
// shorthands run on the main thread and drop frames while a panel loads.
export const EASE = [0.23, 1, 0.32, 1] as const
export const MOVE_EASE = [0.77, 0, 0.175, 1] as const
export const HOVER_EASE = [0.4, 0, 0.2, 1] as const

export const DUR = {
  press: 0.14,
  exit: 0.12,
  color: 0.2,
  move: 0.3,
  reveal: 0.45,
} as const

/** Popovers, menus and modals: 180ms in, 120ms out, no bounce. */
export const POP_IN = { duration: 0.18, ease: EASE } as const
export const POP_OUT = { duration: 0.12, ease: EASE } as const

/** A menu or popover dropping from its trigger (set transformOrigin to the trigger's corner). */
export const MENU = {
  initial: { opacity: 0, transform: 'translateY(-4px) scale(0.98)' },
  animate: { opacity: 1, transform: 'translateY(0px) scale(1)' },
  exit: { opacity: 0, transform: 'translateY(-2px) scale(0.99)', transition: POP_OUT },
  transition: POP_IN,
} as const
