import { describe, expect, test } from 'bun:test'
import { refineFromParams, refineToParams, refineApiQuery, refineActive } from './refine-params'

describe('refine params', () => {
  test('round-trips through the URL', () => {
    const p = new URLSearchParams('site=4')
    refineToParams({ palette: ['#ff5526', '#111111'], font: ' Inter ', readable: 'AA' }, p)
    expect(p.toString()).toBe('site=4&pal=ff5526%2C111111&font=Inter&readable=AA')
    expect(refineFromParams(p)).toEqual({ palette: ['#ff5526', '#111111'], font: 'Inter', readable: 'AA' })
  })
  test('drops junk, duplicates and anything past six colours', () => {
    const q = refineFromParams(new URLSearchParams('pal=zz,FF5526,ff5526,1,2,3,4,5,6,7,aaaaaa&readable=ZZ'))
    expect(q.palette).toEqual(['#ff5526', '#aaaaaa'])
    expect(q.readable).toBe('')
  })
  test('the API query uses the server names', () => {
    expect(refineApiQuery({ palette: ['#ff5526'], font: 'Inter', readable: 'AAA' })).toBe('palette=%23ff5526&font=Inter&contrast=AAA')
  })
  test('empty is inactive', () => expect(refineActive({ palette: [], font: ' ', readable: '' })).toBe(false))
})
