// data/price-groups.ts
//
// Regional pricing for Pro. Group A is the full price; B and C are cheaper
// where incomes are lower (World Bank income groups, adjusted by purchasing
// power). Prices are in US cents; the payment provider charges in the
// buyer's own currency where it can. For the owner to review before launch.

export type PriceGroup = 'A' | 'B' | 'C'
export type Interval = 'month' | 'year'

export const PRICES: Record<PriceGroup, Record<Interval, number>> = {
  A: { month: 500, year: 4800 },
  B: { month: 300, year: 2900 },
  C: { month: 200, year: 1900 },
}

/** Upper-middle income, or prices well above local purchasing power. */
export const GROUP_B = [
  'AR', 'BR', 'CL', 'CO', 'CR', 'DO', 'EC', 'GT', 'JM', 'MX', 'PA', 'PE', 'PY', 'SV',
  'BG', 'HU', 'MK', 'PL', 'RO', 'RS', 'TR', 'AL', 'BA', 'ME', 'MD', 'GE', 'AM', 'AZ', 'KZ',
  'CN', 'MY', 'TH', 'MN',
  'ZA', 'BW', 'NA', 'MU',
  'JO', 'LB', 'IQ',
]

/** Lower and lower-middle income. Yearly is offered first here. */
export const GROUP_C = [
  'NG', 'GH', 'KE', 'UG', 'TZ', 'RW', 'ET', 'ZM', 'ZW', 'MW', 'MZ', 'MG', 'CM', 'SN', 'CI',
  'BJ', 'TG', 'BF', 'ML', 'NE', 'EG', 'MA', 'DZ', 'TN',
  'IN', 'PK', 'BD', 'NP', 'LK', 'MM', 'KH', 'LA', 'VN', 'PH', 'ID',
  'UA', 'UZ', 'KG', 'TJ',
  'BO', 'HN', 'NI',
]

const B = new Set(GROUP_B), C = new Set(GROUP_C)

export function priceGroup(country: string | null | undefined): PriceGroup {
  const c = (country ?? '').toUpperCase()
  return C.has(c) ? 'C' : B.has(c) ? 'B' : 'A'
}

export function priceFor(country: string | null | undefined) {
  const group = priceGroup(country)
  return { group, ...PRICES[group], defaultInterval: (group === 'C' ? 'year' : 'month') as Interval }
}
