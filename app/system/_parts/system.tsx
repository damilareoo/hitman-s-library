// app/system/_parts/system.tsx
//
// The design system page: a rail of sections on wide screens, a scrolling
// row of chips under the header on a phone, and every section rendered from
// the real tokens and components. The written rules live in DESIGN.md at the
// repo root; this page is where they can be seen.
'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from '@phosphor-icons/react'
import { Brand } from '@/components/brand'
import { BTN, ICON } from '@/components/member-card'
import { Section, Rules, Rows, C } from './kit'
import { ColourSection, TypeSection, SpacingSection, RadiusSection, ElevationSection, IconSection } from './foundations'
import { ButtonSection, InputSection, SegmentedSection, CardSection, PopoverSection, ModalSection, ContentSection, StateSection } from './components'
import { MotionSection, SoundSection } from './motion'
import { ProSection, SystemPagesSection } from './pro'

const NAV: [string, [string, string][]][] = [
  ['Foundations', [['principles', 'Principles'], ['colour', 'Colour'], ['type', 'Typography'], ['spacing', 'Spacing'], ['radius', 'Radius'], ['elevation', 'Elevation'], ['icons', 'Icons']]],
  ['Components', [['buttons', 'Buttons'], ['inputs', 'Inputs'], ['segmented', 'Segmented'], ['cards', 'Cards'], ['popovers', 'Popovers'], ['modals', 'Modals'], ['content', 'Library pieces'], ['states', 'States'], ['pro', 'Pro'], ['pages', 'System pages']]],
  ['Behaviour', [['motion', 'Motion'], ['sound', 'Sound'], ['a11y', 'Accessibility'], ['copy', 'Copy']]],
  ['Shipping', [['checklist', 'Checklist'], ['drift', 'Known drift']]],
]

const IDS = NAV.flatMap(([, items]) => items.map(([id]) => id))

function useActive() {
  const [active, setActive] = useState<string>(IDS[0])
  useEffect(() => {
    const els = IDS.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-20% 0px -70% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  // Keep the active chip in view in the phone row.
  useEffect(() => {
    document.querySelector(`[data-chip="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])
  return active
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'
  return (
    <button onClick={() => setTheme(dark ? 'light' : 'dark')} className={BTN.icon} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title="Theme">
      {dark ? <Sun className={ICON.button} weight="bold" /> : <Moon className={ICON.button} weight="bold" />}
    </button>
  )
}

export function SystemPage() {
  const active = useActive()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-edge bg-background/90 backdrop-blur-md">
        <div className="max-w-[1120px] mx-auto px-6 max-sm:px-4 h-12 flex items-center justify-between gap-4">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="text-meta text-ink-4">Design system</span>
            <ThemeToggle />
          </div>
        </div>
        {/* On a phone the rail becomes one scrolling row of chips. */}
        <div className="lg:hidden border-t border-edge-faint">
          <div className="flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
            {NAV.flatMap(([, items]) => items).map(([id, label]) => (
              <a key={id} href={`#${id}`} data-chip={id} className={BTN.chip(active === id) + ' shrink-0'}>{label}</a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-[1120px] mx-auto px-6 max-sm:px-4 lg:grid lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-14">
        <aside className="max-lg:hidden">
          <div className="sticky top-12 pt-14 pb-10 max-h-[calc(100vh-48px)] overflow-y-auto no-scrollbar">
            {NAV.map(([group, items]) => (
              <div key={group} className="mb-6">
                <p className="text-micro text-ink-4 mb-2">{group}</p>
                <ul className="flex flex-col">
                  {items.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`} aria-current={active === id ? 'true' : undefined}
                        className={'relative block py-1 pl-3 text-[13px] transition-colors ' + (active === id ? 'text-ink font-[600]' : 'text-ink-3 hover:text-ink')}>
                        <span aria-hidden className={'absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-full transition-colors ' + (active === id ? 'bg-foreground' : 'bg-transparent')} />
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 pt-14 max-sm:pt-8 pb-32">
          <header className="max-w-[640px]">
            <p className="text-micro text-ink-4">Hitman’s Library</p>
            <h1 className="mt-3 text-display text-ink">Design system</h1>
            <p className="mt-3 text-reading text-ink-2 text-pretty">Every token, component, pop-up, motion and sound the library uses, rendered from the real code. Build new work from these pieces and it won’t look out of place.</p>
            <p className="mt-4 text-meta text-ink-4">As of 16 Nov 2026 · Rules in <C>DESIGN.md</C> · Tokens in <C>member-card.ts</C>, <C>lib/motion.ts</C>, <C>globals.css</C></p>
          </header>

          <Section id="principles" n="00" title="Principles" lede="Six rules that decide the cases this page doesn’t cover.">
            <div className="grid sm:grid-cols-2 gap-x-8">
              {([
                ['Refine, don’t add', 'Better means subtraction and polish: spacing, hierarchy, quieter accents. No new modules, stats or badges unless asked.'],
                ['One idea per card', 'A title, one key value or visual, one muted line. Nothing stacked, nothing repeated.'],
                ['Monochrome, one accent', 'Ink on paper. Amber means Pro or focus. Every other colour comes from the library’s sites.'],
                ['Fast and quiet motion', 'Strong ease-out, no bounce, exits faster than entrances, under 300ms. Nothing animates on the keyboard.'],
                ['Same controls everywhere', 'Phones get their own layout, not a shrunk desktop. A button is the same button at every width.'],
                ['Plain words', 'Short and concrete. One line per idea. Say what it does and stop.'],
              ] as const).map(([t, d], i) => (
                <div key={t} className="py-4 border-t border-edge-faint">
                  <p className="text-[15px] font-[620] tracking-[-0.02em] text-ink"><span className="text-ink-4 mr-2">{i + 1}</span>{t}</p>
                  <p className="mt-1 text-[13.5px] leading-[1.5] text-ink-3 text-pretty">{d}</p>
                </div>
              ))}
            </div>
          </Section>

          <ColourSection />
          <TypeSection />
          <SpacingSection />
          <RadiusSection />
          <ElevationSection />
          <IconSection />
          <ButtonSection />
          <InputSection />
          <SegmentedSection />
          <CardSection />
          <PopoverSection />
          <ModalSection />
          <ContentSection />
          <StateSection />
          <ProSection />
          <SystemPagesSection />
          <MotionSection />
          <SoundSection />

          <Section id="a11y" n="19" title="Accessibility" lede="Built in, not checked at the end.">
            <Rows head={['Area', 'Rule', 'How']} rows={[
              ['Focus', 'Amber ring for keyboard focus', <C key="a">outline-2 outline-offset-2 outline-pro</C>],
              ['Inputs', 'The border is the focus state', 'foreground/50 on focus, no ring'],
              ['Contrast', 'Text never lighter than ink-4', '4.5:1 in both themes'],
              ['Targets', '44px hit area', <C key="a">after:</C>],
              ['Menus', 'role="menu" and menuitem rows', 'aria-expanded, aria-haspopup on the trigger'],
              ['Dialogs', 'role="dialog", aria-modal for sheets', 'Focus in, trapped, returned; Esc closes'],
              ['Toggles', 'aria-pressed', 'Heart, watch, sounds, view'],
              ['Groups', 'tablist/tab or radiogroup/radio', 'Panel tabs, billing, readable text'],
              ['Live counts', 'aria-live="polite"', 'Result totals, busy states'],
              ['Icons', 'aria-label on icon-only buttons', 'sr-only text where an icon replaces a label'],
              ['Motion', 'prefers-reduced-motion honoured', 'Feedback stays, movement goes'],
            ]} />
          </Section>

          <Section id="copy" n="20" title="Copy" lede="The interface speaks the way the changelog does.">
            <Rules items={[
              'One line per idea. Say what it does and stop.',
              'Sentence case. No exclamation marks, no “Oops”.',
              'Buttons are verbs: “Show sites”, “Email link”, “Make a key”.',
              'Busy labels are gerunds: “Sending…”, “Opening…”.',
              'Errors say what happened and what to do: “That link has expired. Send yourself a new one.”',
              'Empty states say what is true and offer one next step.',
              'British spelling in prose (colour); product names stay as they are (Colors tab).',
              'Changelog items run 8–16 words, noun first, an em dash for the qualifier.',
            ]} />
          </Section>

          <Section id="checklist" n="21" title="Checklist for anything new" lede="Run this before you ship a new surface.">
            <ul className="flex flex-col">
              {[
                <>Built from <C>BTN</C>, <C>INPUT</C> / <C>FIELD</C>, <C>CARD</C>, <C>R</C>, <C>ICON</C>; no hand-rolled sizes</>,
                'Card anatomy: tinted head, one-idea body, tinted foot with actions on the right',
                'Two to three type sizes, ink levels only, amber only for Pro or focus',
                'Radius from the ladder, concentric',
                <>Popover uses <C>MENU</C> with the right <C>transformOrigin</C> and the dismissal contract</>,
                'Motion: transform and opacity, under 300ms, exits faster, reduced motion handled',
                'Phosphor bold at 16, 14 or 12; fill only for on states',
                'Focus ring, 44px targets, labels on icon buttons',
                'Checked at 320, 375, 768 and 1440, light and dark',
                'Copy is short and plain',
                <>A changelog entry in <C>data/changelog.ts</C> if a visitor can see it</>,
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3 py-2.5 border-t border-edge-faint first:border-t-0 text-[13.5px] leading-[1.5] text-ink-2">
                  <span aria-hidden className="mt-[3px] w-4 h-4 shrink-0 rounded-[5px] border border-edge-strong" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="drift" n="22" title="Known drift" lede="What’s left after the 16 Nov clean-up. Everything else on this page matches the code.">
            <Rows head={['Where', 'What', 'Fix']} rows={[
              ['design-card.tsx, gallery.tsx', 'Radius 12 (gallery card) and 14 (tablet sheet) sit off the ladder', 'Leave; don’t add more'],
              ['lib/email/*, auth callback', 'Hex colours inline (#E8A04A, #A8611A)', 'Correct: email and bare HTML can’t read CSS variables'],
            ]} />
          </Section>
        </main>
      </div>
    </div>
  )
}
