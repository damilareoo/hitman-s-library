import { expect, test } from 'bun:test'
import { parseId } from './parse-id'

test('whole positive integers parse', () => {
  expect(parseId('798')).toBe(798)
})
test('partial numbers, signs, decimals and blanks are rejected', () => {
  for (const raw of ['12abc', '-1', '1.5', '', ' 7', '0x1f', '1e3']) expect(parseId(raw)).toBeNull()
})
test('ids beyond a safe integer are rejected', () => {
  expect(parseId('99999999999999999999')).toBeNull()
})
