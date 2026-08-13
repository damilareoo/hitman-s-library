// Motion constants for motion/react — mirrors --ease-* / --dur-* in globals.css.
//
// One curve cannot serve every job. EASE is the signature curve for things
// entering and leaving. Movement across the screen wants symmetric
// acceleration, and hover/press wants something plainer that never overshoots.
export const EASE = [0.22, 1, 0.36, 1] as const
export const MOVE_EASE = [0.65, 0, 0.35, 1] as const
export const HOVER_EASE = [0.4, 0, 0.2, 1] as const

export const DUR = {
  press: 0.14,
  exit: 0.12,
  color: 0.2,
  move: 0.3,
  reveal: 0.45,
} as const
