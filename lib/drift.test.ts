import { describe, expect, test } from 'bun:test'

import { isConfirmedRedesign } from './drift'
describe('isConfirmedRedesign (alerts)', () => {
  const d = (o: Partial<{ paletteTurnover: number; screenshotChanged: boolean | null; family: boolean }>) => ({
    appeared: [], vanished: [], redesigned: true,
    paletteTurnover: o.paletteTurnover ?? 0,
    screenshotChanged: o.screenshotChanged ?? null,
    typoChanges: o.family ? [{ role: 'heading', beforeFamily: 'A', afterFamily: 'B', beforeWeight: 400, afterWeight: 400, familyChanged: true, weightChanged: false }] : [],
  })
  test('a heading font flip alone, same capture, is not a redesign', () => expect(isConfirmedRedesign(d({ family: true, paletteTurnover: 0.1, screenshotChanged: false }))).toBe(false))
  test('a changed capture with new colours is', () => expect(isConfirmedRedesign(d({ screenshotChanged: true, paletteTurnover: 0.4 }))).toBe(true))
  test('a changed capture with a new typeface is', () => expect(isConfirmedRedesign(d({ screenshotChanged: true, family: true }))).toBe(true))
  test('a changed capture alone (a carousel, a new photo) is not', () => expect(isConfirmedRedesign(d({ screenshotChanged: true, paletteTurnover: 0.05 }))).toBe(false))
  test('no capture to compare: needs big colour turnover and a new typeface', () => {
    expect(isConfirmedRedesign(d({ paletteTurnover: 0.6, family: true }))).toBe(true)
    expect(isConfirmedRedesign(d({ paletteTurnover: 0.6 }))).toBe(false)
  })
})
