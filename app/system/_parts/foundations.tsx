// app/system/_parts/foundations.tsx
//
// Colour, type, spacing, radius, elevation and icons. Values are read from
// the live CSS and the token modules, so this can't drift from the site.
'use client'

import {
  AppWindow, DeviceMobile, Palette, TextAa, ClockCounterClockwise, Heart, BookmarkSimple, FolderSimple, Eye,
  MagnifyingGlass, SlidersHorizontal, ImageSquare, EnvelopeSimple, Plus, Minus, X, Check, Copy, DownloadSimple,
  ArrowRight, ArrowUpRight, ArrowLeft, CaretDown, CaretUp, CaretRight, DotsThree, Sun, Moon, SpeakerHigh, SpeakerSlash,
  SignIn, SignOut, Key, Globe, Users, Trash, ArrowClockwise, ArrowCounterClockwise, CircleNotch,
  ShieldWarning, LockSimple, Clock, FileDashed, WifiSlash, Warning, type Icon,
} from '@phosphor-icons/react'
import { CARD, ICON, R, BTN } from '@/components/member-card'
import { Section, Sub, Specimen, Rows, C, Rules, DoDont, useCssVar } from './kit'

/* ── Colour ─────────────────────────────────────────────────────────────── */

function Swatch({ v, name, use, ring = false }: { v: string; name: string; use: string; ring?: boolean }) {
  const value = useCssVar(v)
  return (
    <div className="min-w-0">
      <div className={'h-16 rounded-[10px] border ' + (ring ? 'border-edge-strong' : 'border-black/[0.06] dark:border-white/[0.12]')} style={{ background: `var(${v})` }} />
      <p className="mt-2 text-[13px] font-[600] text-ink truncate">{name}</p>
      <p className="text-meta text-ink-4 truncate">{value || '…'}</p>
      <p className="mt-0.5 text-meta text-ink-3 leading-[1.4]">{use}</p>
    </div>
  )
}

function InkRow({ cls, name, alpha, use }: { cls: string; name: string; alpha: string; use: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-3 border-t border-edge-faint first:border-t-0">
      <span className="text-[13px] font-[600] text-ink">{name} <span className="font-[400] text-ink-4">{alpha}</span></span>
      <span className={cls + ' text-[15px] font-[500] tracking-[-0.01em] max-sm:col-span-2 max-sm:row-start-2'}>Every style in the library</span>
      <span className="text-meta text-ink-3 max-sm:row-start-1 max-sm:col-start-2 text-right sm:text-left">{use}</span>
    </div>
  )
}

const TINTS = [
  ['0.025', 'Header and footer strips, selected card'],
  ['0.04', 'Secondary button hover, action rows'],
  ['0.045', 'Menu row hover'],
  ['0.05', 'Ghost and icon hover, segmented track'],
  ['0.07', 'Pressed, active row, key cap'],
] as const

export function ColourSection() {
  return (
    <Section id="colour" n="01" title="Colour" lede="Ink on paper, one accent. Every grey is the foreground at a fixed alpha, so the same class works in both themes. Toggle the theme in the header to see the dark values.">
      <Sub title="Surfaces" note="globals.css · :root / .dark">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
          <Swatch v="--background" name="background" use="Page ground" ring />
          <Swatch v="--card" name="card" use="Gallery cards, sheets" ring />
          <Swatch v="--popover" name="popover" use="Every floating card" ring />
          <Swatch v="--muted" name="muted" use="Image wells, skeletons" />
          <Swatch v="--foreground" name="foreground" use="Ink, primary fill" />
          <Swatch v="--primary-foreground" name="primary-foreground" use="Text on a primary fill" ring />
          <Swatch v="--border" name="border" use="Base for every edge" />
          <Swatch v="--secondary" name="secondary" use="Quiet fills" />
        </div>
      </Sub>

      <Sub title="Ink" note="Text never lighter than ink-4">
        <div>
          <InkRow cls="text-ink" name="ink" alpha="100%" use="Titles, values, active labels" />
          <InkRow cls="text-ink-2" name="ink-2" alpha="80%" use="Body copy, list items" />
          <InkRow cls="text-ink-3" name="ink-3" alpha="68%" use="Card body, quiet controls" />
          <InkRow cls="text-ink-4" name="ink-4" alpha="58%" use="Meta, labels, placeholders" />
        </div>
        <p className="mt-3 text-meta text-ink-4">Every level clears 4.5:1 on its ground in both themes, because every one carries 11 to 15 px text.</p>
      </Sub>

      <Sub title="Edges" note="Alpha of --border">
        <div className="grid sm:grid-cols-3 gap-3">
          {([['border-edge-strong', 'edge-strong', '0.7', 'Card shells, inputs, buttons'], ['border-edge', 'edge', '0.5', 'Card head and foot hairlines'], ['border-edge-faint', 'edge-faint', '0.3', 'Rows inside a body']] as const).map(([cls, n, a, u]) => (
            <div key={n} className={'rounded-[10px] border-2 p-3.5 ' + cls}>
              <p className="text-[13px] font-[600] text-ink">{n} <span className="font-[400] text-ink-4">{a}</span></p>
              <p className="mt-1 text-meta text-ink-3">{u}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-meta text-ink-4">Interactive borders firm up with the foreground: <C>hover:border-foreground/30</C>, <C>focus:border-foreground/50</C>.</p>
      </Sub>

      <Sub title="Tints" note="bg-foreground/[α]">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TINTS.map(([a, u]) => (
            <div key={a}>
              <div className="h-14 rounded-[10px] border border-edge" style={{ background: `rgba(var(--foreground-rgb), ${a})` }} />
              <p className="mt-2 text-[13px] font-[600] text-ink">{a}</p>
              <p className="text-meta text-ink-3 leading-[1.4]">{u}</p>
            </div>
          ))}
        </div>
      </Sub>

      <Sub title="Accent and status" note="Amber means Pro or focus. Nothing else.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
          <Swatch v="--pro" name="pro" use="Pro pill, PRO tag, focus ring" />
          <Swatch v="--pro-ink" name="pro-ink" use="Text on the Pro wash" />
          <Swatch v="--error-ink" name="error-ink" use="Inline error copy" />
          <Swatch v="--color-success" name="success" use="Done" />
          <Swatch v="--color-error" name="error" use="Heart fill, errors" />
          <Swatch v="--color-running" name="running" use="In progress" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className={CARD.proPill}>Pro</span>
          <span className={CARD.pill}>Neutral pill</span>
          <span className="text-[12.5px] text-error-ink">That link has expired. Send yourself a new one.</span>
        </div>
      </Sub>

      <DoDont
        good={<>Use <C>rgba(var(--foreground-rgb), .05)</C> or Tailwind alpha <C>/[0.05]</C> for every tint.</>}
        bad={<>Relative colour or bare <C>color-mix()</C>: older Safari drops the whole rule. And no new accent colours.</>}
      />
    </Section>
  )
}

/* ── Typography ─────────────────────────────────────────────────────────── */

const SCALE = [
  ['text-display', 'clamp(26–32px) · 600 · −0.03em · 1.02', 'Page titles', 'Changelog'],
  ['text-heading', '20px · 600 · −0.025em · 1.15', 'Section headings, releases', 'A Mark'],
  ['text-reading', '16px · 400 · −0.005em · 1.55', 'Prose: notes, About, legal', 'A curated library of the web’s best-designed sites.'],
  ['text-bodytext', '14px · 400 · −0.01em', 'UI body, rows, empty states', 'Search is unavailable right now.'],
  ['text-titletext', '14px · 600 · −0.02em', 'Small titles in dense rows', 'plastic.audio'],
  ['text-meta', '12px · 400', 'Metadata, counts, quiet links', 'plastic.audio · Portfolio · 12 hearts'],
  ['text-micro', '12px · caps · 0.08em', 'Kind labels, list sections', 'Kinds'],
] as const

const CARD_TYPE = [
  ['Card hero', 'text-[20px] font-[630] tracking-[-0.025em] leading-tight', '20 · 630', 'Welcome back'],
  ['Panel title', 'text-[17px] font-[640] tracking-[-0.025em] leading-tight', '17 · 640', 'Linear'],
  ['CARD.title', CARD.title, '15 · 620', 'Know when it redesigns'],
  ['CARD.body', CARD.body, '13.5 · 1.45', 'We re-check watched sites every week.'],
  ['CARD.head', 'text-[12.5px] font-[500] text-ink-3', '12.5 · 500', 'Membership'],
  ['CARD.meta', CARD.meta, '12 · 1.4', 'Billed in US dollars.'],
  ['CARD.label', CARD.label, '11 · 600 · caps', 'Palette'],
] as const

export function TypeSection() {
  return (
    <Section id="type" n="02" title="Typography" lede="BDO Grotesk, variable 300 to 900, carries the whole interface. There is no monospace in the UI; counts use tabular figures. Weight does the hierarchy before size does.">
      <Sub title="The face" note="public/fonts/BDOGrotesk-VF.woff2">
        <div className="grid sm:grid-cols-[auto_minmax(0,1fr)] gap-6 items-end">
          <p className="text-[88px] max-sm:text-[64px] font-[620] tracking-[-0.045em] leading-[0.9] text-ink">Aa</p>
          <div className="flex flex-col gap-1.5">
            {[400, 500, 600, 640, 760].map(w => (
              <p key={w} className="flex items-baseline gap-3 text-[15px] text-ink" style={{ fontWeight: w }}>
                <span className="w-9 text-meta text-ink-4" style={{ fontWeight: 400 }}>{w}</span>Hitman’s Library 0123456789
              </p>
            ))}
          </div>
        </div>
        <p className="mt-4 text-meta text-ink-4">In use: 400 body · 500 controls · 600 buttons and labels · 620–640 titles · 760 the Pro word.</p>
      </Sub>

      <Sub title="Scale" note="globals.css · @utility">
        <div>
          {SCALE.map(([cls, spec, use, sample]) => (
            <div key={cls} className="grid sm:grid-cols-[210px_minmax(0,1fr)] gap-x-6 gap-y-2 py-4 border-t border-edge-faint first:border-t-0">
              <div>
                <p className="text-[13px] font-[600] text-ink">{cls}</p>
                <p className="mt-0.5 text-meta text-ink-4">{spec}</p>
                <p className="text-meta text-ink-3">{use}</p>
              </div>
              <p className={cls + ' text-ink min-w-0 truncate'}>{sample}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-meta text-ink-4">Metadata floor is 12px; nothing under 11px.</p>
      </Sub>

      <Sub title="Inside cards" note="member-card.ts · CARD">
        <div>
          {CARD_TYPE.map(([n, cls, spec, sample]) => (
            <div key={n} className="grid grid-cols-[110px_minmax(0,1fr)] sm:grid-cols-[150px_90px_minmax(0,1fr)] items-baseline gap-x-4 py-3 border-t border-edge-faint first:border-t-0">
              <span className="text-[13px] font-[600] text-ink">{n}</span>
              <span className="text-meta text-ink-4 max-sm:hidden">{spec}</span>
              <span className={cls + ' min-w-0 truncate'}>{sample}</span>
            </div>
          ))}
        </div>
      </Sub>

      <Sub title="Hierarchy" note="Two to three sizes per card">
        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <div className="rounded-[16px] border border-edge-strong p-6">
            <p className="text-micro text-ink-4">Page</p>
            <p className="mt-3 text-display text-ink">Changelog</p>
            <p className="mt-2 text-reading text-ink-2">What changed in the library, newest first.</p>
            <p className="mt-6 text-heading text-ink">Navigation</p>
            <p className="mt-1.5 text-reading text-ink-2">Live link moved into the panel header, beside the domain.</p>
            <p className="mt-3 text-meta text-ink-4">14 Nov 2026 · Damilare</p>
          </div>
          <div className={CARD.shell}>
            <div className={CARD.head}><span>Watch</span><span className={CARD.proPill}>Pro</span></div>
            <div className={CARD.pad + ' py-3.5'}>
              <p className={CARD.title}>Know when it redesigns</p>
              <p className={CARD.body + ' mt-1'}>We re-check watched sites every week and email you a before and after.</p>
            </div>
            <div className={CARD.foot + ' pl-4 pr-2'}>
              <span className={CARD.meta}>Cancel any time</span>
              <span className={BTN.primary + ' ml-auto'}>Get Pro</span>
            </div>
          </div>
        </div>
      </Sub>

      <Rules items={[
        <>Display and headings use <C>text-balance</C>; body uses <C>text-pretty</C>.</>,
        <>Sentence case everywhere. Uppercase only through <C>text-micro</C> or <C>CARD.label</C>.</>,
        <>Counts that change use <C>tabular-nums</C>, so rows don’t shift.</>,
        <>Never set text in an arbitrary size that isn’t listed here. If you need one, add it to the scale first.</>,
      ]} />
    </Section>
  )
}

/* ── Spacing & layout ───────────────────────────────────────────────────── */

const STEPS = [4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 56, 80, 128]

export function SpacingSection() {
  return (
    <Section id="spacing" n="03" title="Spacing and layout" lede="A 4px base, Tailwind steps only. Half steps are allowed inside controls for optical fixes.">
      <Sub title="Steps" note="1 = 4px">
        <div className="flex flex-col gap-1.5">
          {STEPS.map(s => (
            <div key={s} className="grid grid-cols-[44px_56px_minmax(0,1fr)] items-center gap-3">
              <span className="text-meta text-ink-4">{s}px</span>
              <span className="text-meta text-ink-3">{s / 4 % 1 ? (s / 4).toFixed(1) : s / 4}</span>
              <span className="h-3 max-w-full rounded-[3px] bg-foreground/[0.14]" style={{ width: s * 2 }} />
            </div>
          ))}
        </div>
      </Sub>

      <Sub title="Card anatomy, measured" note="CARD.head · body · CARD.foot">
        <div className="grid sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start">
          <div className={CARD.shell + ' relative'}>
            <div className={CARD.head + ' outline-1 outline-dashed outline-[rgba(var(--pro-rgb),0.6)] -outline-offset-1'}><span>Saved</span><span className="text-ink-4">3 sets</span></div>
            <div className="p-1.5 outline-1 outline-dashed outline-[rgba(var(--pro-rgb),0.6)] -outline-offset-1">
              {['Hearts', 'Type I like', 'Pricing pages'].map((r, i) => (
                <div key={r} className="h-9 px-2.5 flex items-center justify-between rounded-[10px] text-[13.5px] font-[500] text-ink" style={i === 0 ? { background: 'rgba(var(--foreground-rgb), .045)' } : undefined}>
                  <span>{r}</span><span className={CARD.kbd}>{[12, 4, 7][i]}</span>
                </div>
              ))}
            </div>
            <div className={CARD.foot + ' px-4 outline-1 outline-dashed outline-[rgba(var(--pro-rgb),0.6)] -outline-offset-1'}><span className={CARD.meta}>Add to a set with the bookmark.</span></div>
          </div>
          <Rows head={['Part', 'Size', 'Rule']} rows={[
            ['Header', '40px · px 16', 'Tint 0.025, edge hairline under, title left, one detail right'],
            ['Menu list', 'inset 6 · rows 36', 'Rows radius 10, 13.5/500, count in a key cap'],
            ['Body', 'px 16 · py 14–16', 'One idea'],
            ['Footer', '44px · px 8', 'Tint 0.025, hairline over, actions right'],
            ['Stacked cards', 'gap 16', 'Never nest bordered rows inside'],
          ]} />
        </div>
      </Sub>

      <Sub title="Page frames">
        <Rows head={['Frame', 'Value', 'Where']} rows={[
          ['Site header', 'h 56 · px 20 (12 < 640)', 'Gallery'],
          ['Secondary nav', 'h 48 · max-w 640 · px 24', 'About, Changelog, Pro, Trends, Submit, legal'],
          ['Secondary body', 'pt 56 · pb 128 · sections mb 56', 'Same pages'],
          ['Pro column', 'max-w 380 · gap 16', '/pro'],
          ['Gallery grid', 'gap 16 → 20 at xl · p 20 → 24', 'Home'],
          ['Detail panel', 'span 4 of 12 → 3 at 1920', 'Home ≥ 1280'],
        ]} />
      </Sub>

      <Sub title="Breakpoints" note="Check 320 · 375 · 768 · 1440, both themes">
        <Rows head={['Width', 'Tailwind', 'What changes']} rows={[
          ['< 640', 'max-sm', 'Panel is the page. Popovers go full width. Labels fold to icons.'],
          ['640', 'sm', 'Panel becomes a side sheet; header shows the Pro word right.'],
          ['768', 'md', 'Search field and Refine move into the header.'],
          ['1024', 'lg', 'Digest, sounds and Submit unfold from More.'],
          ['1280', 'xl', 'Three-pane split: grid and a fixed panel column.'],
          ['1440', '.gallery-grid', 'Three grid columns.'],
          ['1920', '.gallery-grid', 'Four grid columns; panel gives up a column.'],
        ]} />
        <p className="mt-3 text-meta text-ink-4">Phones get their own layout, not a shrunk desktop. Controls stay the same component at every width.</p>
      </Sub>

      <Sub title="Touch targets" note="Draw small, hit at 44">
        <div className="flex flex-wrap items-center gap-8">
          <div className="relative w-8 h-8 grid place-items-center rounded-[10px] text-ink-3 bg-foreground/[0.05]">
            <BookmarkSimple className={ICON.button} weight="bold" />
            <span className="absolute -inset-1.5 rounded-[12px] border border-dashed border-pro" />
          </div>
          <p className="text-meta text-ink-3 max-w-[420px]">Controls are drawn at 32–36px. An <C>after:</C> overlay takes the hit area to 44px; between neighbours it stops at 42 so it doesn’t steal the next one’s edge.</p>
        </div>
      </Sub>
    </Section>
  )
}

/* ── Radius ─────────────────────────────────────────────────────────────── */

export function RadiusSection() {
  return (
    <Section id="radius" n="04" title="Radius" lede="One ladder, kept concentric: an inner corner is the outer corner minus the gap between them, so curves run parallel.">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-center">
        <div className={'border border-edge-strong p-1.5 ' + R.card}>
          <div className={'border border-edge p-1 ' + R.inset}>
            <div className={'h-10 pl-3 pr-1 flex items-center justify-between border border-edge-strong ' + R.control}>
              <span className="text-[14px] text-ink-4">you@studio.com</span>
              <span className={BTN.inField}>Email link</span>
            </div>
          </div>
          <p className="px-2.5 pt-2.5 pb-1 text-meta text-ink-4">16 → 10 (6px in) → 6 (4px in)</p>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-5">
          {([['card', 16], ['control', 10], ['thumb', 7], ['nested', 6], ['key', 5], ['chip', 999]] as const).map(([n, r]) => (
            <div key={n} className="flex flex-col items-center">
              <div className="w-14 h-14 border-2 border-foreground/40 bg-foreground/[0.03]" style={{ borderRadius: r }} />
              <p className="mt-2 text-[13px] font-[600] text-ink">{n}</p>
              <p className="text-meta text-ink-4">{r === 999 ? 'full' : `${r}px`}</p>
            </div>
          ))}
        </div>
      </div>
      <Rows rows={[
        [<C key="a">R.card</C>, '16px', 'Card shells, sheets, browse layer'],
        [<C key="a">R.control</C>, '10px', 'Buttons, inputs, menu rows, segmented tracks'],
        ['Segmented thumb', '7px', 'Thumb 3px inside a 10px track'],
        [<C key="a">R.nested</C>, '6px', 'A button 4px inside a field; palette swatches'],
        [<C key="a">R.key</C>, '5px', 'Key caps, checkboxes, list thumbnails'],
        [<C key="a">R.chip</C>, 'full', 'Chips, pills, avatars, colour dots'],
      ]} />
      <p className="text-meta text-ink-4">Two legacy exceptions: gallery cards (12) and the tablet sheet (14). Don’t add more.</p>
    </Section>
  )
}

/* ── Elevation ──────────────────────────────────────────────────────────── */

const SHADOWS = [
  ['Thumb', 'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]', 'Segmented thumb'],
  ['Small menu', 'shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]', 'Brand menu, origin peek'],
  ['Popover', 'shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]', 'Every CARD popover'],
  ['Layer', 'shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)]', 'Browse layer'],
  ['Sheet', 'shadow-[0_28px_70px_-24px_rgba(0,0,0,0.4)]', 'Sign-in, Pro card'],
  ['Side sheet', 'shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)]', 'Site panel < 1280'],
] as const

export function ElevationSection() {
  return (
    <Section id="elevation" n="05" title="Elevation and layers" lede="A border plus one soft, low shadow. Never a glow, never a gradient.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-8 p-6 max-sm:p-4 rounded-[16px] bg-foreground/[0.025] border border-edge">
        {SHADOWS.map(([n, cls, u]) => (
          <div key={n}>
            <div className={'h-20 rounded-[16px] bg-popover border border-edge-strong ' + cls} />
            <p className="mt-3 text-[13px] font-[600] text-ink">{n}</p>
            <p className="text-meta text-ink-3">{u}</p>
          </div>
        ))}
      </div>
      <Sub title="Scrims">
        <Rows head={['Surface', 'Scrim', 'z']} rows={[
          ['Sign-in sheet', 'background/60 · blur 3', '80'],
          ['Browse layer', 'background/55 · blur 2', '70'],
          ['Site sheet', 'black/20 · blur 2', '40'],
        ]} />
      </Sub>
      <Sub title="z-index ladder" note="Pick a rung; never invent one">
        <div className="flex flex-col-reverse">
          {([['10', 'Controls above a card’s full-size click target'], ['30', 'Floating page links'], ['40', 'Sticky detail panel, site sheet scrim'], ['50', 'Sticky header, site sheet, popovers'], ['60', 'Header popovers (More, Digest, Watch), skip link'], ['70 / 71', 'Browse scrim / layer'], ['80 / 81', 'Sign-in scrim / sheet'], ['82', 'Toast']] as const).map(([z, u], i) => (
            <div key={z} className="flex items-center gap-4 py-2 border-t border-edge-faint">
              <span className="w-16 text-[13px] font-[600] text-ink">{z}</span>
              <span className="h-2 rounded-full bg-foreground/[0.12]" style={{ width: 16 + i * 14 }} />
              <span className="text-meta text-ink-3">{u}</span>
            </div>
          ))}
        </div>
      </Sub>
    </Section>
  )
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

const ICONS: [Icon, string, string][] = [
  [AppWindow, 'AppWindow', 'Preview tab'], [DeviceMobile, 'DeviceMobile', 'Mobile tab'], [Palette, 'Palette', 'Colors tab'],
  [TextAa, 'TextAa', 'Type tab'], [ClockCounterClockwise, 'ClockCounterClockwise', 'History tab'], [Heart, 'Heart', 'Favourite'],
  [BookmarkSimple, 'BookmarkSimple', 'Save, Saved'], [FolderSimple, 'FolderSimple', 'A set'], [Eye, 'Eye', 'Watch'],
  [MagnifyingGlass, 'MagnifyingGlass', 'Search'], [SlidersHorizontal, 'SlidersHorizontal', 'Refine'], [ImageSquare, 'ImageSquare', 'From an image'],
  [EnvelopeSimple, 'EnvelopeSimple', 'Digest, email'], [Plus, 'Plus', 'Add'], [Minus, 'Minus', 'Remove'],
  [X, 'X', 'Close, clear'], [Check, 'Check', 'Done, copied'], [Copy, 'Copy', 'Copy'],
  [DownloadSimple, 'DownloadSimple', 'Download'], [ArrowRight, 'ArrowRight', 'Forward action'], [ArrowUpRight, 'ArrowUpRight', 'External link'],
  [ArrowLeft, 'ArrowLeft', 'Back'], [CaretDown, 'CaretDown', 'Expand, more below'], [CaretUp, 'CaretUp', 'Collapse'],
  [CaretRight, 'CaretRight', 'Drill in'], [DotsThree, 'DotsThree', 'More'], [Sun, 'Sun', 'Light theme'],
  [Moon, 'Moon', 'Dark theme'], [SpeakerHigh, 'SpeakerHigh', 'Sounds on'], [SpeakerSlash, 'SpeakerSlash', 'Sounds off'],
  [SignIn, 'SignIn', 'Sign in'], [SignOut, 'SignOut', 'Sign out'], [Key, 'Key', 'API key'],
  [Globe, 'Globe', 'Website'], [Users, 'Users', 'People'], [Trash, 'Trash', 'Delete'],
  [ArrowClockwise, 'ArrowClockwise', 'Retry'], [ArrowCounterClockwise, 'ArrowCounterClockwise', 'Reset, undo'], [CircleNotch, 'CircleNotch', 'Working'],
  [ShieldWarning, 'ShieldWarning', 'Blocked'], [LockSimple, 'LockSimple', 'Login wall'], [Clock, 'Clock', 'Timed out'],
  [FileDashed, 'FileDashed', 'Empty page'], [WifiSlash, 'WifiSlash', 'Unreachable'], [Warning, 'Warning', 'Other error'],
]

export function IconSection() {
  return (
    <Section id="icons" n="06" title="Icons" lede="One set (Phosphor), one weight (bold), three sizes. Fill only for an on state. Pick from this set before adding a glyph.">
      <div className="grid sm:grid-cols-3 gap-3">
        {([['ICON.button', ICON.button, '16px', 'In an icon button'], ['ICON.inline', ICON.inline, '14px', 'Beside text'], ['ICON.micro', ICON.micro, '12px', 'In a chip or label']] as const).map(([n, cls, px, u]) => (
          <div key={n} className="rounded-[10px] border border-edge p-3.5 flex items-center gap-3">
            <span className="w-8 h-8 grid place-items-center rounded-[10px] bg-foreground/[0.05] text-ink"><MagnifyingGlass className={cls} weight="bold" /></span>
            <span><span className="block text-[13px] font-[600] text-ink">{n} · {px}</span><span className="text-meta text-ink-3">{u}</span></span>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-[10px] border border-edge p-3.5 flex items-center gap-4">
          <span className="flex gap-2 text-ink"><Heart className={ICON.button} weight="bold" /><Heart className={ICON.button + ' text-[var(--color-error)]'} weight="fill" /></span>
          <span className="flex gap-2 text-ink"><Eye className={ICON.button} weight="bold" /><Eye className={ICON.button} weight="fill" /></span>
          <span className="flex gap-2 text-ink"><BookmarkSimple className={ICON.button} weight="bold" /><BookmarkSimple className={ICON.button} weight="fill" /></span>
          <span className="text-meta text-ink-3">bold idle · fill on</span>
        </div>
        <div className="rounded-[10px] border border-edge p-3.5 flex items-center gap-4">
          <span className="flex gap-2"><X className={ICON.button + ' text-ink-4'} weight="bold" /><X className={ICON.button + ' text-ink'} weight="bold" /></span>
          <span className="text-meta text-ink-3">Icons inherit colour: ink-4 idle, ink on hover. Icon-only buttons carry <C>aria-label</C>.</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 border-t border-l border-edge-faint rounded-[10px] overflow-hidden">
        {ICONS.map(([I, n, u]) => (
          <div key={n} className="flex items-center gap-3 px-3 py-3 border-b border-r border-edge-faint min-w-0">
            <I className={ICON.button + ' text-ink shrink-0'} weight="bold" />
            <span className="min-w-0"><span className="block text-[12.5px] font-[600] text-ink truncate" title={n}>{n}</span><span className="block text-meta text-ink-4 truncate">{u}</span></span>
          </div>
        ))}
      </div>
      <p className="text-meta text-ink-4">Brand marks are their own components, not Phosphor: the library mark (<C>mark.tsx</C>), Google (<C>google-mark.tsx</C>), the Pro word and the Pro mark.</p>
    </Section>
  )
}
