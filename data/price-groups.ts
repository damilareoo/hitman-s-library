// data/price-groups.ts
//
// Pro pricing: one price everywhere, in US cents. The payment provider shows
// it in the buyer's own currency where it supports one. (Regional pricing
// was tried and dropped on 2026-11-13: one honest price for everyone.)

export type Interval = 'month' | 'year'

export const PRICES: Record<Interval, number> = { month: 500, year: 4800 }

export const DEFAULT_INTERVAL: Interval = 'month'
