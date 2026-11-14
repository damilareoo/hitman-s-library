import { describe, expect, test } from 'bun:test'
import { buildSearchIndex, searchIndex, parseSearchQuery } from './search'

const DESIGNS = [
  { id: '1', colors: ['#ffffff', '#111111', '#ff5526'], typography: ['Inter', 'DM Mono'] },        // orange accent, high contrast
  { id: '2', colors: ['#f7f4ee', '#9a9a9a', '#2b6cff'], typography: ['Instrument Serif'] },         // blue, low text contrast
  { id: '3', colors: ['#0a0a0a', '#ffffff', '#ff6a00'], typography: ['Uncut Sans'] },               // dark, orange
  { id: '4', colors: ['true', '', '#00ff00'], typography: ['true'] },                               // junk rows survive
]
const INDEX = buildSearchIndex(DESIGNS)

describe('buildSearchIndex', () => {
  test('keeps only real hex colours and real font names', () => {
    const e = INDEX.find(e => e.id === 4)!
    expect({ ...e, labs: undefined }).toEqual({ id: 4, colors: ['#00ff00'], fonts: [], contrast: null, labs: undefined })
  })
  test('OKLab is worked out once, at build, and search uses it', () => {
    expect(INDEX[0].labs?.length).toBe(3)
    // A doctored entry: its stored OKLab says pure orange whatever its hex says.
    const orange = buildSearchIndex([{ id: 9, colors: ['#ff5526'], typography: [] }])[0]
    const doctored = { ...orange, id: 10, colors: ['#0000ff'] }
    expect(searchIndex([doctored], parseSearchQuery(new URLSearchParams('palette=ff5526')))).toEqual([10])
  })
  test('records text-on-background contrast', () => {
    expect(INDEX.find(e => e.id === 1)!.contrast).toBeGreaterThan(15)
    expect(INDEX.find(e => e.id === 2)!.contrast).toBeLessThan(4.5)
  })
})

describe('parseSearchQuery', () => {
  test('caps the palette at 6 and drops non-hex', () => {
    const q = parseSearchQuery(new URLSearchParams('palette=ff5526,zzz,#0000ff,1,2,3,4,5,6,7&font=  Inter  &contrast=AA'))
    expect(q.palette).toEqual(['#ff5526', '#0000ff'])
    expect(q.font).toBe('inter')
    expect(q.contrast).toBe('AA')
  })
  test('ignores an unknown contrast level and an over-long font', () => {
    const q = parseSearchQuery(new URLSearchParams(`contrast=ZZ&font=${'a'.repeat(80)}`))
    expect(q.contrast).toBeNull()
    expect(q.font).toBe('')
  })
  test('an empty query is reported as empty', () => expect(parseSearchQuery(new URLSearchParams('')).empty).toBe(true))
})

describe('searchIndex', () => {
  test('palette ranks the closest sites first and drops far ones', () => {
    expect(searchIndex(INDEX, { palette: ['#ff6000'], font: '', contrast: null, empty: false })).toEqual([3, 1])
  })
  test('font matches a substring, case-insensitive', () => {
    expect(searchIndex(INDEX, { palette: [], font: 'serif', contrast: null, empty: false })).toEqual([2])
  })
  test('AA keeps 4.5:1 and up; AAA keeps 7:1 and up', () => {
    expect(searchIndex(INDEX, { palette: [], font: '', contrast: 'AA', empty: false })).toEqual([1, 3])
  })
  test('facets combine', () => {
    expect(searchIndex(INDEX, { palette: ['#ff6000'], font: 'inter', contrast: 'AAA', empty: false })).toEqual([1])
  })
})

describe('font kinds', () => {
  const idx = buildSearchIndex([
    { id: 1, colors: ['#ffffff'], typography: ['Instrument Serif', 'Inter'] },
    { id: 2, colors: ['#ffffff'], typography: ['Inter', 'sans-serif'] },
    { id: 3, colors: ['#ffffff'], typography: ['Geist Mono', 'Geist'] },
  ])
  const q = (font: string) => searchIndex(idx, parseSearchQuery(new URLSearchParams({ font })))
  test('"serif" means a serif typeface, not the sans-serif fallback', () => expect(q('serif')).toEqual([1]))
  test('"mono" means a monospaced typeface', () => expect(q('mono')).toEqual([3]))
  test('"sans" means a sans typeface', () => expect(q('sans').sort()).toEqual([1, 2, 3]))
  test('generic fallbacks are not fonts', () => expect(idx.find(e => e.id === 2)!.fonts).toEqual(['Inter']))
})
