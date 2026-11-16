// app/system/_parts/pro.tsx
//
// Pro and the system pages (404, error). The Pro card and the 404 card are the
// real components in preview mode: no analytics, no checkout, no ⌘K capture.
// The AI tools card is drawn here from the same tokens, because the real one
// makes and revokes live API keys.
'use client'

import { ArrowCounterClockwise, Copy, Key } from '@phosphor-icons/react'
import { BTN, CARD, ICON } from '@/components/member-card'
import { ProCard } from '@/components/pro-card'
import { ProMark } from '@/components/pro-mark'
import { NotFoundCard } from '@/components/not-found-card'
import { Section, Sub, Specimen, Rows, C, Rules, DoDont } from './kit'

const SHEET = ' shadow-[0_28px_70px_-28px_rgba(0,0,0,0.35)]'

export function ProSection() {
  return (
    <Section id="pro" n="15" title="Pro" lede="Pro speaks in the same card as everything else. What sets it apart is the mark: the word built from real library colours. Amber marks Pro and nothing else.">
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <Specimen name="Pro card · real" file="pro-card.tsx" stage="stretch">
          <div className="w-full flex justify-center"><ProCard preview /></div>
        </Specimen>
        <Rows head={['Part', 'Spec', 'Rule']} rows={[
          ['Shell', 'CARD.shell · 380 max · Sheet shadow', 'Centred; fills the first screen on /pro'],
          ['Head', 'Membership · “Cancel any time”', 'Becomes an Active pill for members'],
          ['Mark', '<ProMark />', 'The visual slot. No Pro pill beside it'],
          ['Title', '20 / 630 · text-balance', 'One promise, one line'],
          ['Features', '13.5 · ink-2 · no icons', 'Plain lines; the words carry it'],
          ['Price', '26 / 640 + 13 ink-3', 'One price, US dollars'],
          ['Billing', 'BTN.chip radiogroup', 'Monthly / Yearly −N%'],
          ['Foot', 'Refund · Terms left, BTN.primary right', 'Opening… / Finishing up… while busy'],
          ['Below', '12.5 ink-4 line + CaretDown link', 'Says there is more under the fold'],
        ]} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Pro mark · real" file="pro-mark.tsx" stage="stretch">
          <div className={CARD.shell + ' w-full max-w-[340px] mx-auto'}><ProMark /></div>
        </Specimen>
        <Specimen name="Pro mark · word=&quot;404&quot;" file="pro-mark.tsx" stage="stretch">
          <div className={CARD.shell + ' w-full max-w-[340px] mx-auto'}><ProMark word="404" /></div>
        </Specimen>
      </div>
      <Rows head={['Behaviour', 'Spec', 'Note']} rows={[
        ['Squares', '3px on a 4px pitch', 'Each one a real colour from a real site'],
        ['Entrance', 'Gather as noise, sort in one left-to-right sweep, rest', 'Hue across, light to dark down each column'],
        ['Hover', 'Fisheye lens names the square at its centre', 'Fine pointers'],
        ['Egg', 'Drag a square out to copy its colour', 'A near-hue colour fills the gap'],
        ['Replay', 'Ghost icon button, top right, on hover', 'Rotates in from 30°'],
        ['Reduced motion', 'Shows the sorted word at rest', '—'],
        [<C key="a">word</C>, '“Pro” (default) or “404”', 'Use for system moments only, never decoration'],
      ]} />

      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <Specimen name="AI tools card" file="ai-tools-card.tsx" stage="stretch">
          <section className={CARD.shell + ' w-full text-left'}>
            <div className={CARD.head}><span>Your AI tools</span><span className="text-ink-4">Claude, Cursor and more</span></div>
            <div className={CARD.pad + ' py-4'}>
              <p className={CARD.title}>Build with the library</p>
              <p className={CARD.body + ' mt-1'}>Ask your AI tool for a site’s type and colours, and it pulls the real values from here.</p>
              <div className="mt-4 flex gap-1.5">
                {['Claude Code', 'Cursor', 'Other'].map((t, i) => <span key={t} className={BTN.chip(i === 0)}>{t}</span>)}
              </div>
              <div className="mt-2.5 relative rounded-[10px] border border-edge bg-foreground/[0.025]">
                <pre className="p-3 pr-11 text-[12px] leading-[1.5] text-ink-2 whitespace-pre-wrap break-all font-mono">claude mcp add --transport http hitmans-library …</pre>
                <span className={BTN.icon + ' absolute top-1 right-1'}><Copy className={ICON.button} weight="bold" /></span>
              </div>
              <div className="mt-4 flex items-center gap-2.5 h-10 border-t border-edge-faint">
                <Key className={ICON.inline + ' text-ink-4 shrink-0'} weight="bold" />
                <span className="font-mono text-[12.5px] text-ink">hl_3f9a…</span>
                <span className={CARD.meta + ' truncate'}>made Nov 12 · used never</span>
                <span className={BTN.ghost + ' ml-auto !h-7'}>Revoke</span>
              </div>
            </div>
            <div className={CARD.foot + ' pl-4 pr-2'}>
              <span className={CARD.meta}>Read-only. Revoke a key any time.</span>
              <span className={BTN.primary + ' ml-auto'}>New key</span>
            </div>
          </section>
        </Specimen>
        <Specimen name="Sample card (what you get)" file="pro-extras.tsx" stage="stretch">
          <section className={CARD.shell + ' w-full text-left'}>
            <div className={CARD.head}><span>Trends this month</span><span className="text-ink-4">Pro</span></div>
            <div className={CARD.pad + ' py-4'}>
              <ul className="space-y-2">
                {['Serif display type up across product sites.', 'Warm off-whites replacing pure white grounds.'].map(t => <li key={t} className="text-[13.5px] leading-[1.45] text-ink-2">{t}</li>)}
              </ul>
            </div>
            <div className={CARD.foot + ' pl-4 pr-2'}>
              <span className={CARD.meta}>Emailed to you each month.</span>
              <span className={CARD.footBtn + ' ml-auto'}>See the page</span>
            </div>
          </section>
        </Specimen>
      </div>

      <Rules items={[
        <>Amber (<C>text-pro</C>, <C>bg-[rgba(var(--pro-rgb),.14)]</C>, <C>text-pro-ink</C>) means Pro or keyboard focus. Never decoration.</>,
        'One Pro signal per surface: the mark, a Pro pill, or the PRO tag. Never two.',
        'Pro, not yet: a small card saying what it does and how to get it. Never a blurred, locked or dead control.',
        'Sample cards show real library data, labelled “Pro” in the head in ink-4, not amber.',
        'No glow, no gradient, no sparkle. The colours come from the library.',
      ]} />
    </Section>
  )
}

export function SystemPagesSection() {
  return (
    <Section id="pages" n="16" title="System pages" lede="Not found and error use the Pro card’s frame: the secondary nav, one card centred, a head that names what happened, two ways out.">
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <Specimen name="404 · real" file="app/not-found.tsx · not-found-card.tsx" stage="stretch">
          <div className="w-full flex justify-center"><NotFoundCard preview /></div>
        </Specimen>
        <Specimen name="Error" file="app/error.tsx" stage="stretch">
          <section className={CARD.shell + SHEET + ' w-full max-w-[380px] mx-auto text-left'}>
            <div className={CARD.head}><span>Something went wrong</span><span className="text-ink-4">a1b2c3d4</span></div>
            <div className="px-4 pt-4 pb-4">
              <p className="text-[20px] font-[630] tracking-[-0.025em] leading-[1.2] text-ink">This page didn&apos;t load.</p>
              <p className={CARD.body + ' mt-1'}>Try again, or head back to the library.</p>
            </div>
            <div className={CARD.foot + ' pr-2'}>
              <span className={CARD.footBtn}>Back to the library</span>
              <span className={BTN.primary + ' ml-auto'}><ArrowCounterClockwise className={ICON.inline} weight="bold" /> Try again</span>
            </div>
          </section>
        </Specimen>
      </div>
      <Rows head={['Part', '404', 'Error']} rows={[
        ['Head', 'Not found · the missing path', 'Something went wrong · error id'],
        ['Visual', 'Pro mark spelling 404', 'None: a failed page fetches nothing'],
        ['Line', 'This page isn’t in the library.', 'This page didn’t load.'],
        ['Quiet action', 'Search ⌘K → /?browse=1', 'Back to the library'],
        ['Primary', 'Back to the library →', 'Try again (reset)'],
        ['Keys', '⌘K and / open search', '—'],
      ]} />
      <DoDont good={<>Say what happened in one line and give a way back.</>} bad={<>Jokes, illustrations, “Oops!”, or a page with no way out.</>} />
    </Section>
  )
}

