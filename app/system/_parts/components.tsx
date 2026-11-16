// app/system/_parts/components.tsx
//
// Every component the library uses. Where a component can render safely on
// its own (segmented controls, Refine, the spinner, the gallery card, the
// sign-in sheet), the real one is shown. Popovers that need an account or a
// site are drawn here open, from the same CARD tokens, with their source file
// named so the real one is one click away.
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { EASE, POP_OUT } from '@/lib/motion'
import {
  ArrowRight, X, Copy, Check, DownloadSimple, SignOut, Heart, FolderSimple, BookmarkSimple, EnvelopeSimple, Plus,
  SpeakerHigh, Moon, MagnifyingGlass, SlidersHorizontal, DotsThree, Key,
} from '@phosphor-icons/react'
import { BTN, CARD, INPUT, INPUT_SM, FIELD, FIELD_INPUT, ICON } from '@/components/member-card'
import { ViewSwitcher, type LibraryView } from '@/components/view-switcher'
import { PanelTabs, type PanelTab } from '@/components/panel-tabs'
import { Refine } from '@/components/refine'
import { Spinner } from '@/components/ui/spinner'
import { TabEmptyState } from '@/components/tab-empty-state'
import { DesignCard, type Design } from '@/components/design-card'
import { CompareSlider } from '@/components/compare-slider'
import { ProWord } from '@/components/pro-word'
import { openSignIn } from '@/lib/account-client'
import type { RefineQuery } from '@/lib/search/refine-params'
import { Section, Sub, Specimen, Rows, C, Rules, DoDont } from './kit'

const POP = CARD.shell + ' shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)] text-left'
const AMBER = ['#c96a1c', '#d9822b', '#e07b39', '#e8a04a', '#d4952f']

/* ── Buttons ────────────────────────────────────────────────────────────── */

export function ButtonSection() {
  const [chip, setChip] = useState<'month' | 'year'>('year')
  return (
    <Section id="buttons" n="07" title="Buttons" lede="Two sizes, three looks, plus icon and chip. One primary per surface, pushed right. Labels are verbs.">
      <Specimen name="BTN · md 32px" file="member-card.ts" code={`BTN.primary\n${BTN.primary}\n\nBTN.secondary\n${BTN.secondary}\n\nBTN.ghost\n${BTN.ghost}`}>
        <button className={BTN.primary}>Get Pro <ArrowRight className={ICON.inline} weight="bold" /></button>
        <button className={BTN.secondary}>Try again</button>
        <button className={BTN.ghost}>Revoke</button>
        <button className={BTN.primary} disabled>Opening…</button>
      </Specimen>
      <Specimen name="BTN · lg 40px" file="member-card.ts" code={`BTN.primaryLg\n${BTN.primaryLg}\n\nBTN.secondaryLg\n${BTN.secondaryLg}`}>
        <button className={BTN.primaryLg}>Request this site <ArrowRight className={ICON.inline} weight="bold" /></button>
        <button className={BTN.secondaryLg}>Continue with Google</button>
      </Specimen>
      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="BTN.icon · 32px" file="member-card.ts" code={BTN.icon}>
          <button className={BTN.icon} aria-label="Save"><BookmarkSimple className={ICON.button} weight="bold" /></button>
          <button className={BTN.icon + ' !text-ink'} aria-label="Saved"><BookmarkSimple className={ICON.button} weight="fill" /></button>
          <button className={BTN.icon} aria-label="Copy"><Copy className={ICON.button} weight="bold" /></button>
          <button className={BTN.icon} aria-label="Close"><X className={ICON.button} weight="bold" /></button>
        </Specimen>
        <Specimen name="BTN.chip(active) · 28px" file="member-card.ts" code={`BTN.chip(true)\n${BTN.chip(true)}\n\nBTN.chip(false)\n${BTN.chip(false)}`}>
          <div role="radiogroup" aria-label="Billing" className="flex gap-1.5">
            {(['month', 'year'] as const).map(i => (
              <button key={i} role="radio" aria-checked={chip === i} onClick={() => setChip(i)} className={BTN.chip(chip === i)}>{i === 'month' ? 'Monthly' : 'Yearly −20%'}</button>
            ))}
          </div>
          <button className={BTN.chip(false) + ' gap-1.5'}>Font: Inter <X className={ICON.micro + ' text-ink-4'} weight="bold" /></button>
        </Specimen>
      </div>
      <Specimen name="BTN.iconHeader · 36px" file="member-card.ts" code={BTN.iconHeader}>
        {[MagnifyingGlass, SpeakerHigh, Moon, DotsThree].map((I, i) => (
          <span key={i} className={BTN.iconHeader}><I className={ICON.button} weight="bold" /></span>
        ))}
        <span className="text-meta text-ink-4 basis-full text-center">The site header only. Use BTN.icon everywhere else.</span>
      </Specimen>
      <Rows head={['State', 'Look', 'Rule']} rows={[
        ['Hover', 'Primary opacity .9 · others tint .04–.05', 'Colour only, 200ms, ease-hover'],
        ['Press', 'scale(.97), 140ms', 'Fine pointers only. Cards opt out with data-no-press'],
        ['Focus', 'Amber 2px ring, offset 2', 'Keyboard only (focus-visible)'],
        ['Disabled', 'opacity .4, no pointer', 'Busy buttons also swap to a gerund: “Sending…”'],
      ]} />
    </Section>
  )
}

/* ── Inputs ─────────────────────────────────────────────────────────────── */

export function InputSection() {
  return (
    <Section id="inputs" n="08" title="Inputs" lede="One look: a firm hairline on a transparent ground, corner 10. The border is the focus state; inputs carry no ring.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="INPUT · 40px" file="member-card.ts" stage="stretch" code={INPUT}>
          <div className="w-full">
            <label htmlFor="sys-font" className={CARD.label}>Font</label>
            <input id="sys-font" className={INPUT + ' mt-2'} placeholder="Inter, Instrument Serif…" />
          </div>
        </Specimen>
        <Specimen name="INPUT_SM · 32px" file="member-card.ts" stage="stretch" code={INPUT_SM}>
          <div className="w-full flex items-center gap-1">
            <input aria-label="New set name" className={INPUT_SM + ' flex-1'} placeholder="New set" />
            <button className={CARD.footBtn + ' text-ink font-[600]'}>Add <span className={CARD.kbd}>↵</span></button>
          </div>
        </Specimen>
      </div>
      <Specimen name="FIELD + FIELD_INPUT + BTN.inField" file="member-card.ts" stage="stretch" code={`FIELD\n${FIELD}\n\nFIELD_INPUT\n${FIELD_INPUT}\n\nBTN.inField\n${BTN.inField}`}>
        <div className={FIELD + ' w-full max-w-[344px]'}>
          <input aria-label="Email" className={FIELD_INPUT} placeholder="you@studio.com" />
          <button className={BTN.inField}>Email link <ArrowRight className={ICON.micro} weight="bold" /></button>
        </div>
      </Specimen>
      <Specimen name="Palette picker" file="refine.tsx" stage="start">
        <div className="flex flex-wrap items-center gap-1.5">
          {['#111111', '#e8e4dc', '#d9412b', '#7a4fd6'].map(c => (
            <span key={c} className="w-7 h-7 rounded-[6px] ring-1 ring-inset ring-foreground/10" style={{ background: c }} />
          ))}
          <span className="w-7 h-7 grid place-items-center rounded-[6px] border border-dashed border-edge-strong text-ink-4"><Plus className={ICON.micro} weight="bold" /></span>
        </div>
      </Specimen>
      <Rules items={[
        <>Hover firms the border to <C>foreground/30</C>, focus to <C>foreground/50</C>.</>,
        <>Labels sit above in <C>CARD.label</C>, or are <C>sr-only</C> when the context makes them obvious.</>,
        <>Placeholders are an example, not an instruction: “you@studio.com”.</>,
        <>An action that belongs to the field goes inside it (<C>BTN.inField</C>), not beside it.</>,
      ]} />
    </Section>
  )
}

/* ── Segmented controls ─────────────────────────────────────────────────── */

export function SegmentedSection() {
  const [view, setView] = useState<LibraryView>('grid')
  const [tab, setTab] = useState<PanelTab>('colors')
  return (
    <Section id="segmented" n="09" title="Segmented controls" lede="One track, one thumb. The thumb slides on transform; a change made from the keyboard jumps without animating.">
      <Specimen name="ViewSwitcher · real" file="view-switcher.tsx">
        <ViewSwitcher view={view} onChange={setView} />
      </Specimen>
      <Specimen name="PanelTabs · real" file="panel-tabs.tsx" stage="stretch">
        <div className="w-full max-w-[560px] mx-auto -mx-4"><PanelTabs active={tab} onChange={setTab} colorsCount={8} typeCount={3} /></div>
      </Specimen>
      <Rows head={['Part', 'Spec', 'Note']} rows={[
        ['Track', 'foreground/.05 (dark .07) · radius 10 · pad 3', 'h 32 (switcher) or 38 (tabs)'],
        ['Thumb', 'bg-card · radius 7 · inset shadow', 'Measured from the active button'],
        ['Label', '12–12.5px · 500 idle, 600 active', 'Icon fills when active; count in ink-4'],
        ['Move', 'transform · 200ms · ease-sig / move', 'No animation on keyboard changes'],
      ]} />
    </Section>
  )
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

export function CardSection() {
  return (
    <Section id="cards" n="10" title="Cards" lede="The standing anatomy for every card, popover, sheet and panel: a quiet tinted header, a white body with one idea, a tinted footer with the actions.">
      <div className="grid sm:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-6 items-start">
        <div className={CARD.shell}>
          <div className={CARD.head}><span>Short title</span><span className="text-ink-4">quiet detail</span></div>
          <div className={CARD.pad + ' py-4'}>
            <p className={CARD.label}>Label</p>
            <p className={CARD.title + ' mt-2'}>One idea, as a title</p>
            <p className={CARD.body + ' mt-1'}>One key value or one visual, then one muted line that says what it means.</p>
          </div>
          <div className={CARD.foot + ' pl-4 pr-2'}>
            <span className={CARD.meta}>Meta line</span>
            <button className={CARD.footBtn + ' ml-auto'}>Action</button>
            <button className={CARD.footBtn + ' text-ink font-[600]'}>Primary <span className={CARD.kbd}>↵</span></button>
          </div>
        </div>
        <Rows head={['Token', 'Spec', 'Rule']} rows={[
          [<C key="a">CARD.shell</C>, 'popover · edge-strong · 16', 'overflow hidden; popover shadow when floating'],
          [<C key="a">CARD.head</C>, 'h 40 · tint .025 · 12.5/500', 'Title left; one detail, count or pill right'],
          [<C key="a">CARD.pad</C>, 'px 16', 'Body: one idea'],
          [<C key="a">CARD.foot</C>, 'h 44 · tint .025', 'Actions right with ml-auto; meta left'],
          [<C key="a">CARD.footBtn</C>, '32 · 13/500 · ink-3', 'Same as BTN.ghost; icon + label'],
          [<C key="a">CARD.kbd</C>, '20 · radius 5 · 10.5/600', '↵, esc, counts'],
          [<C key="a">CARD.pill</C>, '24 · full · 11.5/600', 'Neutral status'],
          [<C key="a">CARD.proPill</C>, 'amber 14% · amber ink', 'Pro, Active'],
        ]} />
      </div>
      <DoDont
        good={<>One title, one value, one line. If a visual already says Pro, leave the Pro pill out. Two to three type sizes.</>}
        bad={<>Stacked bordered rows, a badge on every line, a second accent, a stat strip added “for richness”.</>}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Link card" file="pro-extras.tsx" stage="stretch">
          <a href="#cards" className={CARD.shell + ' block w-full hover:border-foreground/30 transition-colors'}>
            <span className={CARD.pad + ' py-3.5 flex items-center gap-3'}>
              <span className="flex-1 min-w-0"><span className={CARD.title + ' block'}>This month’s trends</span><span className={CARD.meta}>Typefaces, colours and kinds on the rise.</span></span>
              <ArrowRight className={ICON.button + ' text-ink-4 shrink-0'} weight="bold" />
            </span>
          </a>
        </Specimen>
        <Specimen name="Key row" file="ai-tools-card.tsx" stage="stretch">
          <div className="w-full flex items-center gap-2.5 h-10 border-t border-b border-edge-faint">
            <Key className={ICON.inline + ' text-ink-4 shrink-0'} weight="bold" />
            <span className="font-mono text-[12.5px] text-ink">hl_3f9a…</span>
            <span className={CARD.meta + ' truncate'}>made Nov 12 · used never</span>
            <span className={BTN.ghost + ' ml-auto !h-7'}>Revoke</span>
          </div>
        </Specimen>
      </div>
    </Section>
  )
}

/* ── Popovers & menus ───────────────────────────────────────────────────── */

function MenuRow({ icon, label, count, on }: { icon: React.ReactNode; label: string; count: number; on?: boolean }) {
  return (
    <div className={'h-9 px-2.5 flex items-center justify-between gap-3 rounded-[10px] text-[13.5px] font-[500] text-ink ' + (on ? 'bg-foreground/[0.045]' : '')}>
      <span className="flex items-center gap-2.5 min-w-0">{icon}<span className="truncate">{label}</span></span>
      <span className={CARD.kbd}>{count}</span>
    </div>
  )
}

export function PopoverSection() {
  const [refine, setRefine] = useState<RefineQuery>({ palette: [], font: '', readable: '' })
  return (
    <Section id="popovers" n="11" title="Popovers and menus" lede="Anchored cards that drop from their trigger. All of them use CARD.shell, the popover shadow and MENU motion, with transformOrigin set to the trigger’s corner.">
      <Specimen name="Refine · real, click it" file="refine.tsx" stage="start" className="min-h-[120px]">
        <Refine value={refine} onApply={setRefine} fonts={['Inter', 'Söhne', 'Instrument Serif']} />
        <span className="text-meta text-ink-4 self-center">Opens the real Pro search card. Applying here only changes this page.</span>
      </Specimen>

      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Account card · 300" file="account-button.tsx">
          <div className={POP + ' w-full max-w-[300px]'}>
            <div className={CARD.head}><span>No. 0042</span><span className="text-ink-4">Member since Nov 2026</span></div>
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grid place-items-center bg-foreground text-background text-[17px] font-[640] shrink-0">D</span>
                <div className="min-w-0"><p className={CARD.title + ' truncate'}>Your name</p><p className={CARD.meta + ' mt-0.5 flex items-center gap-1.5'}><EnvelopeSimple className={ICON.micro} weight="bold" />you@studio.com</p></div>
              </div>
              <dl className="mt-4 pt-4 border-t border-edge grid grid-cols-3">
                {[['Hearts', '24'], ['Sets', '3'], ['Plan', 'Free']].map(([k, v], i) => (
                  <div key={k} className={'flex flex-col-reverse ' + (i ? 'pl-3 border-l border-edge' : '')}>
                    <dt className="mt-1.5 text-[11.5px] text-ink-4">{k}</dt><dd className="text-[16px] font-[620] tracking-[-0.02em] leading-none text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={CARD.foot}>
              <span className={CARD.footBtn}><DownloadSimple className={ICON.inline} weight="bold" /> Your data</span>
              <span className={CARD.footBtn}><SignOut className={ICON.inline} weight="bold" /> Sign out</span>
              <span className={CARD.footBtn + ' ml-auto text-ink font-[600]'}>Go Pro</span>
            </div>
          </div>
        </Specimen>

        <Specimen name="Saved · 264" file="saved-menu.tsx">
          <div className={POP + ' w-full max-w-[264px]'}>
            <div className={CARD.head}><span>Saved</span><span className="text-ink-4">2 sets</span></div>
            <div className="p-1.5">
              <MenuRow on icon={<Heart className={ICON.inline + ' text-[var(--color-error)]'} weight="fill" />} label="Hearts" count={24} />
              <p className={CARD.label + ' px-2.5 pt-3 pb-1.5'}>Sets</p>
              <MenuRow icon={<FolderSimple className={ICON.inline + ' text-ink-3'} weight="bold" />} label="Type I like" count={8} />
              <MenuRow icon={<FolderSimple className={ICON.inline + ' text-ink-3'} weight="bold" />} label="Pricing pages" count={5} />
            </div>
            <div className={CARD.foot + ' px-4'}><span className={CARD.meta}>Add to a set with the bookmark on any site.</span></div>
          </div>
        </Specimen>

        <Specimen name="Save to set · 260" file="site-detail-panel.tsx">
          <div className={POP + ' w-full max-w-[260px]'}>
            <div className={CARD.head}><span>Save to a set</span><span className="text-ink-4">2 sets</span></div>
            <div className="p-1.5">
              {[['Type I like', 8, true], ['Pricing pages', 5, false]].map(([n, c, on]) => (
                <div key={String(n)} className="h-9 px-2.5 flex items-center gap-2.5 rounded-[10px] text-[13.5px] font-[500] text-ink">
                  <span className={'w-4 h-4 shrink-0 grid place-items-center rounded-[5px] border ' + (on ? 'bg-foreground border-foreground text-background' : 'border-edge-strong')}>{on && <Check className="w-2.5 h-2.5" weight="bold" />}</span>
                  <span className="flex-1 truncate">{n}</span><span className={CARD.kbd}>{c as number}</span>
                </div>
              ))}
            </div>
            <div className={CARD.foot + ' px-2'}>
              <input aria-label="New set name" className={INPUT_SM + ' min-w-0 flex-1 bg-popover'} placeholder="New set" />
              <span className={CARD.footBtn + ' text-ink font-[600]'}>Add <span className={CARD.kbd}>↵</span></span>
            </div>
          </div>
        </Specimen>

        <Specimen name="Watch upsell · 280" file="watch-button.tsx">
          <div className={POP + ' w-full max-w-[280px]'}>
            <div className={CARD.head}><span>Watch</span><span className={CARD.proPill}>Pro</span></div>
            <div className={CARD.pad + ' py-3.5'}>
              <p className={CARD.title}>Know when it redesigns</p>
              <p className={CARD.body + ' mt-1'}>We re-check watched sites every week and email you a before and after: capture, colours and type.</p>
            </div>
            <div className={CARD.foot + ' justify-end'}><span className={BTN.primary}>Get Pro</span></div>
          </div>
        </Specimen>

        <Specimen name="Digest · 340" file="gallery.tsx">
          <div className={POP + ' w-full max-w-[340px]'}>
            <div className={CARD.head}><span>Weekly digest</span><span className={BTN.icon + ' -mr-2'}><X className={ICON.inline} weight="bold" /></span></div>
            <div className={CARD.pad + ' py-4'}>
              <p className={CARD.title}>New sites, once a week</p>
              <p className={CARD.body + ' mt-1'}>Picked from what you heart.</p>
              <div className={FIELD + ' mt-3'}><input aria-label="Email" className={FIELD_INPUT} placeholder="you@studio.com" /><span className={BTN.inField}>Subscribe</span></div>
            </div>
            <div className={CARD.foot + ' px-4'}><span className={CARD.meta}>Unsubscribe any time.</span><span className={CARD.footBtn + ' ml-auto -mr-2'}>Close <span className={CARD.kbd}>esc</span></span></div>
          </div>
        </Specimen>

        <Specimen name="More · 232" file="gallery.tsx">
          <div className={POP + ' w-full max-w-[232px]'}>
            <div className={CARD.head}><span>More</span></div>
            <div className="p-1.5">
              {[[BookmarkSimple, 'Saved'], [EnvelopeSimple, 'Digest'], [Plus, 'Submit'], [SpeakerHigh, 'Mute sounds'], [Moon, 'Dark mode']].map(([I, l]) => {
                const Ic = I as typeof Plus
                return <div key={l as string} className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] text-[13.5px] font-[500] text-ink"><Ic className={ICON.inline + ' text-ink-3'} weight="bold" />{l as string}</div>
              })}
            </div>
          </div>
        </Specimen>
      </div>

      <Rules items={[
        <>Trigger toggles and carries <C>aria-expanded</C> and <C>aria-haspopup</C>.</>,
        <>Outside <C>mousedown</C> closes. <C>Escape</C> closes. Choosing a row closes.</>,
        <>Under 640 a popover becomes <C>fixed inset-x-3</C> at a fixed top: full width, same card.</>,
        <>Menu rows: 36px, radius 10, 13.5/500, 14px icon, count in a key cap, hover tint .045.</>,
      ]} />
    </Section>
  )
}

/* ── Modals & sheets ────────────────────────────────────────────────────── */

export function ModalSection() {
  const [toast, setToast] = useState(false)
  return (
    <Section id="modals" n="12" title="Modals, sheets and toasts" lede="Few, and only when the task needs the whole screen. Destructive actions are never a modal.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Sign-in sheet · 344" file="sign-in-sheet.tsx">
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => openSignIn('join')} className={BTN.primaryLg}>Open the real sheet</button>
            <span className="text-meta text-ink-4 text-center">Centred card; a bottom sheet under 640. Focus in, trapped, returned. Esc closes.</span>
          </div>
        </Specimen>
        <Specimen name="Toast" file="sign-in-sheet.tsx">
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => { setToast(true); setTimeout(() => setToast(false), 2400) }} className={BTN.secondaryLg}>Show a toast</button>
            <span className="text-meta text-ink-4 text-center">Bottom centre, one line, 2.4s, no close button.</span>
          </div>
          <AnimatePresence>
            {toast && (
              <div className="fixed bottom-5 inset-x-0 z-[82] flex justify-center pointer-events-none">
                <motion.div
                  role="status"
                  initial={{ opacity: 0, transform: 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }}
                  exit={{ opacity: 0, transform: 'translateY(4px)', transition: POP_OUT }} transition={{ duration: 0.2, ease: EASE }}
                  className="px-3.5 h-9 grid place-items-center rounded-[10px] bg-foreground text-background text-[13px] font-[600] tracking-[-0.01em]"
                >
                  Signed in
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </Specimen>
      </div>

      <Specimen name="Browse layer · ⌘K or /" file="browse-panel.tsx" stage="stretch">
        <div className="w-full max-w-[560px] mx-auto rounded-[16px] border border-edge-strong bg-popover shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden text-left">
          <div className="flex items-center gap-2.5 h-12 px-4 bg-foreground/[0.025] border-b border-edge">
            <MagnifyingGlass className={ICON.inline + ' text-ink-3'} weight="bold" />
            <span className="flex-1 text-[16px] tracking-[-0.005em] text-ink-4">Search sites, kinds, sets…</span>
            <kbd className={CARD.kbd}>esc</kbd>
          </div>
          <div className="p-1.5">
            <div className="px-2.5 pt-2 pb-1.5 text-micro text-ink-4">Kinds</div>
            <div className="flex flex-wrap gap-1.5 px-2.5 pb-3 mb-1 border-b border-edge">
              {[['All', 412], ['Portfolio', 96], ['Product', 141], ['Studio', 58]].map(([k, n]) => <span key={k} className={BTN.chip(false) + ' gap-1'}>{k} <span className="text-ink-4 tabular-nums">{n}</span></span>)}
            </div>
            {[['Linear', 'linear.app', 'Product', true], ['plastic.audio', 'plastic.audio', 'Portfolio', false]].map(([t, d, k, on]) => (
              <div key={String(t)} className={'w-full flex items-center gap-3 py-2 px-2.5 rounded-[10px] ' + (on ? 'bg-foreground/[0.07]' : '')}>
                <span className="w-[52px] h-8 rounded-[5px] border border-edge bg-muted shrink-0" />
                <span className="flex-1 min-w-0 text-bodytext text-ink truncate">{t as string}</span>
                <span className="text-meta text-ink-4 max-sm:hidden">{d as string}</span>
                <span className="text-meta text-ink-4">{k as string}</span>
              </div>
            ))}
          </div>
        </div>
      </Specimen>

      <Rows head={['Surface', 'Geometry', 'Behaviour']} rows={[
        ['Sign-in sheet', '344 wide · radius 16 · bottom sheet < 640', 'Scrim z-80; focus trap; Esc; returns focus'],
        ['Browse layer', '824 wide · 12vh down · max 70vh', 'Opens instantly (keyboard). Arrows move the active row'],
        ['Site panel ≥ 1280', 'Fixed column, span 4 (3 at 1920)', 'Crossfades 120ms when the site changes'],
        ['Site sheet 640–1279', '10px inset · radius 14 · max 636 wide', 'Spring from the right; scrim; focus trap'],
        ['Site sheet < 640', 'Full page · no radius, no shadow', 'Same content, its own layout'],
        ['Toast', '36 tall · radius 10 · ink fill', 'z-82, 2.4s, role="status"'],
      ]} />

      <Specimen name="Destructive: two-step inline confirm" file="delete-account.tsx" stage="start">
        <div className="flex items-center gap-3 text-meta">
          <span className="font-[600] text-error-ink underline underline-offset-4">Delete everything, for good</span>
          <span className="text-ink-4">Keep it</span>
        </div>
        <span className="basis-full text-meta text-ink-4">The first tap arms it. The second only counts after 600ms, so a double click can never delete.</span>
      </Specimen>
    </Section>
  )
}

/* ── Gallery card & content pieces ──────────────────────────────────────── */

const SAMPLE: Design = {
  id: 'sample', url: 'https://hitmanslibrary.xyz', title: "Hitman's Library", kind: 'Library',
  thumbnail_url: '/og-2026-09.png', colors: ['#101010', '#e8e4dc', '#E8A04A', '#2c2c2c'], typography: ['BDO Grotesk'],
  layout: '', quality: 0, tags: ['Monochrome'], architecture: '', addedDate: '2026-11-16',
}

export function ContentSection() {
  const [sel, setSel] = useState(false)
  const [fav, setFav] = useState(false)
  return (
    <Section id="content" n="13" title="Library pieces" lede="The components that carry the library’s own content: the gallery card, the Pro word, before and after.">
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <Specimen name="Gallery card · real" file="design-card.tsx" stage="stretch">
          <div className="w-full max-w-[320px] mx-auto">
            <DesignCard design={SAMPLE} index={0} isSelected={sel} onClick={() => setSel(v => !v)} onHover={() => {}} onTagClick={() => {}} hasAnimated isFavorite={fav} onToggleFavorite={() => setFav(v => !v)} />
          </div>
        </Specimen>
        <Rows head={['Part', 'Spec', 'Rule']} rows={[
          ['Shell', 'radius 12 · border-edge', 'Hover firms the border; selected tints and halos'],
          ['Capture', '16:10 on muted', 'Zooms 1.015 on hover, fine pointers only'],
          ['Caption', 'px 14 · pt 10 · pb 12', 'Over an edge-faint rule'],
          ['Title', 'bodytext · 500', 'One line'],
          ['Swatches', '16px circles · 3px gap', 'Grow 1.25 on hover; open a colour view'],
          ['Kind / tag', 'text-micro · ink-4', 'Tag filters the grid'],
          ['Press', 'Border to foreground/30', 'Cards never scale'],
          ['Focus', 'Amber ring, offset 3', 'From any control inside'],
        ]} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Pro word · real" file="pro-word.tsx">
          <ProWord colors={AMBER} />
          <span className="basis-full text-center text-meta text-ink-4">Colours wash across once, then rest. Nothing on hover.</span>
        </Specimen>
        <Specimen name="Refine button states" file="refine.tsx">
          <span className="relative h-8 px-3 flex items-center gap-1.5 rounded-[10px] text-[13px] font-[500] border border-edge-strong text-ink-3"><SlidersHorizontal className={ICON.inline} weight="bold" />Refine<span className="text-[10.5px] font-[600] tracking-[0.06em] text-pro">PRO</span></span>
          <span className="relative h-8 px-3 flex items-center gap-1.5 rounded-[10px] text-[13px] font-[500] bg-foreground text-background border border-foreground"><SlidersHorizontal className={ICON.inline} weight="bold" />Refine<span className="text-[10.5px] font-[600] tracking-[0.06em] text-background/70">PRO</span></span>
          <span className="relative w-8 h-8 grid place-items-center rounded-[10px] border border-edge-strong text-ink-3"><SlidersHorizontal className={ICON.inline} weight="bold" /><span className="absolute top-[5px] right-[5px] w-1.5 h-1.5 rounded-full bg-pro" /></span>
          <span className="basis-full text-center text-meta text-ink-4">Idle · active · phone (an amber dot stands in for PRO)</span>
        </Specimen>
      </div>
      <Specimen name="Before and after · real" file="compare-slider.tsx" stage="stretch">
        <div className="w-full max-w-[480px] mx-auto"><CompareSlider before="/pro/ai-before.webp" after="/pro/ai-after.webp" alt="A pricing section" ratio="1200 / 720" /></div>
      </Specimen>
      <Specimen name="Colour trail and chips" file="gallery.tsx" stage="start">
        {['#e90865', '#dce700'].map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-micro text-ink-4">→</span>}
            <span className="inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-edge bg-card text-[11.5px] font-medium tracking-[0.01em] text-ink-3"><span className="w-3 h-3 rounded-full border border-black/[0.06] dark:border-white/[0.22]" style={{ background: c }} />{c}</span>
          </span>
        ))}
        <span className="text-micro text-ink-4">→</span>
        <span className="inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-edge-strong bg-card text-[11.5px] font-medium text-ink"><span className="w-3 h-3 rounded-full border border-black/[0.06]" style={{ background: '#2b6cd9' }} />#2b6cd9</span>
      </Specimen>
    </Section>
  )
}

/* ── States ─────────────────────────────────────────────────────────────── */

export function StateSection() {
  const [copied, setCopied] = useState(false)
  return (
    <Section id="states" n="14" title="States" lede="Loading, empty, error, busy and done. Every one says what is true and what to do next.">
      <div className="grid sm:grid-cols-3 gap-4">
        <Specimen name="Spinner · real" file="ui/spinner.tsx"><Spinner /></Specimen>
        <Specimen name="Skeleton" file="gallery.tsx · SkeletonCard" stage="stretch">
          <div className="w-full flex flex-col border border-edge rounded-[12px] overflow-hidden animate-pulse">
            <div className="aspect-[16/10] bg-muted" />
            <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-2 border-t border-edge-faint">
              <div className="h-[13px] bg-muted rounded-[4px] w-3/4" /><div className="h-[11px] bg-muted rounded-[4px] w-1/2" />
              <div className="flex gap-[3px]">{[0, 1, 2, 3].map(i => <div key={i} className="w-4 h-4 rounded-full bg-muted" />)}</div>
            </div>
          </div>
        </Specimen>
        <Specimen name="Copied" file="lib/use-copied.ts">
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }} className={BTN.icon} aria-label="Copy">
            {copied ? <Check className={ICON.button} weight="bold" /> : <Copy className={ICON.button} weight="bold" />}
          </button>
        </Specimen>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Tab error · real" file="tab-empty-state.tsx" stage="stretch">
          <div className="w-full flex"><TabEmptyState message="No colours yet" extractionError="net::ERR_NAME_NOT_RESOLVED at https://example.invalid" /></div>
        </Specimen>
        <Specimen name="Empty" file="gallery.tsx" stage="stretch">
          <div className="w-full flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-bodytext text-ink-3">No sites match.</p>
            <p className="text-reading text-ink-2 max-w-[280px]">Want <span className="text-ink">arc.net</span> in the library?</p>
            <span className={BTN.primaryLg}>Request it <ArrowRight className={ICON.inline} weight="bold" /></span>
          </div>
        </Specimen>
      </div>
      <Rows head={['State', 'Pattern', 'Where']} rows={[
        ['Short wait', 'The spinner, 16px', 'History, infinite scroll'],
        ['Layout known', 'Skeleton in the real shape, pulse', 'Grid, swatches'],
        ['Refetching', 'Old results stay, dim to .55 (aria-busy)', 'Grid'],
        ['Busy button', 'Disabled + gerund label', '“Sending…”, “Opening…”, “Making…”'],
        ['Empty', 'One ink-3 line + one next step', 'Grid, browse, sets'],
        ['Error, inline', '12.5–13px error red, role="status"', 'Sign-in, checkout'],
        ['Error, tab', 'Icon + micro label, plain reason, details folded', 'Colors, Type, Assets'],
        ['Pro, not yet', 'A small card saying what it does and how to get it', 'Watch, Refine'],
      ]} />
      <DoDont good={<>“That link has expired. Send yourself a new one.”</>} bad={<>A blurred or disabled Pro control with no explanation, or “Oops! Something went wrong.”</>} />
    </Section>
  )
}
