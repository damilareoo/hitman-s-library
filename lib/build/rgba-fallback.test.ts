import { describe, expect, test } from 'bun:test'
import postcss from 'postcss'
import rgbaFallback from './rgba-fallback.mjs'

const run = async (css: string) => (await postcss([rgbaFallback()]).process(css, { from: undefined })).css

describe('rgbaFallback', () => {
  test('a tint that needs color-mix gets an rgba twin every browser reads, ahead of the @supports block', async () => {
    const out = await run('.a{background-color:var(--foreground)}@supports (color:color-mix(in lab, red, red)){.a{background-color:color-mix(in oklab,var(--foreground)5%,transparent)}}')
    expect(out).toContain('.a{background-color:rgba(var(--foreground-rgb), 0.05)}@supports')
  })
  test('white and black become literal rgba', async () => {
    const out = await run('@supports (color:color-mix(in lab, red, red)){.b{border-color:color-mix(in oklab,var(--color-white) 14%,transparent)}}')
    expect(out).toContain('.b{border-color:rgba(255, 255, 255, 0.14)}')
  })
  test('colours without an rgb twin are left alone', async () => {
    const css = '@supports (color:color-mix(in lab, red, red)){.c{color:color-mix(in oklab,var(--destructive) 50%,transparent)}}'
    expect(await run(css)).toBe(css)
  })
})

describe('rgbaFallback nesting', () => {
  test('a hover tint keeps its media query', async () => {
    const out = await run('@supports (color:color-mix(in lab, red, red)){@media (hover:hover){.d:hover{background-color:color-mix(in oklab,var(--foreground)7%,transparent)}}}')
    expect(out).toContain('@media (hover:hover){.d:hover{background-color:rgba(var(--foreground-rgb), 0.07)}}@supports')
  })
})
