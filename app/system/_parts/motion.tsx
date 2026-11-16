// app/system/_parts/motion.tsx
//
// Motion and sound, live. Every demo uses the real constants from lib/motion
// and the real sounds from the sounds context, and replays on demand.
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowCounterClockwise, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { BTN, CARD, ICON } from '@/components/member-card'
import { EASE, MOVE_EASE, HOVER_EASE, MENU, POP_OUT } from '@/lib/motion'
import { useSoundsContext } from '@/contexts/sounds-context'
import { Section, Sub, Specimen, Rows, C, Rules, useReplay } from './kit'

const CURVES = [
  ['ease-sig · EASE', EASE, 'Entering and leaving', 300],
  ['ease-move · MOVE_EASE', MOVE_EASE, 'On-screen movement', 300],
  ['ease-hover · HOVER_EASE', HOVER_EASE, 'Hover, colour, press', 200],
] as const

function Curve({ c }: { c: readonly [number, number, number, number] }) {
  const [x1, y1, x2, y2] = c
  const S = 64
  return (
    <svg viewBox={`-4 -4 ${S + 8} ${S + 8}`} className="w-16 h-16 shrink-0 text-ink" aria-hidden>
      <rect x="0" y="0" width={S} height={S} fill="none" stroke="currentColor" strokeOpacity=".12" />
      <path d={`M0 ${S} C ${x1 * S} ${S - y1 * S}, ${x2 * S} ${S - y2 * S}, ${S} 0`} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function Replay({ onClick, label = 'Replay' }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className={BTN.ghost}><ArrowCounterClockwise className={ICON.inline} weight="bold" />{label}</button>
}

export function MotionSection() {
  const [run, replayCurves] = useReplay()
  const [open, setOpen] = useState(true)
  const [sheet, setSheet] = useState(true)
  const [grid, replayGrid] = useReplay()
  const [side, setSide] = useState(true)

  return (
    <Section id="motion" n="17" title="Motion" lede="Fast and quiet. A strong ease-out for anything entering or leaving, no bounce in everyday UI, exits quicker than entrances, nothing over 300ms in everyday UI.">
      <Sub title="Curves" note={<Replay onClick={replayCurves} />}>
        <div className="flex flex-col gap-4">
          {CURVES.map(([n, c, u, d]) => (
            <div key={n} className="grid grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[64px_200px_minmax(0,1fr)] items-center gap-4">
              <Curve c={c} />
              <div>
                <p className="text-[13px] font-[600] text-ink">{n}</p>
                <p className="text-meta text-ink-4">cubic-bezier({c.join(', ')})</p>
                <p className="text-meta text-ink-3">{u}</p>
              </div>
              <div className="relative h-8 rounded-[10px] bg-foreground/[0.04] max-sm:col-span-2">
                <motion.span
                  key={run}
                  className="absolute top-1 left-1 w-6 h-6 rounded-[6px] bg-foreground"
                  initial={{ left: 4 }}
                  animate={{ left: 'calc(100% - 28px)' }}
                  transition={{ duration: d / 1000 * 2, ease: [...c] as [number, number, number, number], delay: 0.15 }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-meta text-ink-4">Tracks run at double speed so the shape is visible.</p>
      </Sub>

      <Sub title="Durations" note="--dur-* · DUR">
        <Rows head={['Token', 'Value', 'Use']} rows={[
          [<C key="a">--dur-press · DUR.press</C>, '140ms', 'Press scale'],
          [<C key="a">--dur-1 · DUR.exit</C>, '120ms', 'Exits, card border hover, reduced-motion fades'],
          [<C key="a">POP_IN</C>, '180ms', 'Popovers in'],
          [<C key="a">--dur-2 · DUR.color</C>, '200ms', 'Colour changes, segmented thumb, toast'],
          ['Sheet', '220ms', 'Sign-in sheet in'],
          [<C key="a">--dur-3 · DUR.move</C>, '300ms', 'Card entrance. The ceiling for everyday UI'],
          [<C key="a">--dur-4 · DUR.reveal</C>, '450ms', 'Rare reveals only'],
        ]} />
      </Sub>

      <div className="grid sm:grid-cols-2 gap-4">
        <Specimen name="Popover · MENU" file="lib/motion.ts" className="min-h-[260px]" stage="start">
          <div className="w-full flex flex-col gap-3">
            <button onClick={() => setOpen(v => !v)} className={BTN.secondary + ' self-start'}>{open ? 'Close' : 'Open'}</button>
            <div className="relative h-[150px]">
              <AnimatePresence>
                {open && (
                  <motion.div {...MENU} style={{ transformOrigin: 'top left' }} className={CARD.shell + ' absolute left-0 top-0 w-[240px] shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}>
                    <div className={CARD.head}><span>Saved</span><span className="text-ink-4">2 sets</span></div>
                    <div className={CARD.pad + ' py-3.5'}><p className={CARD.body}>In 180ms from −4px and .98; out 120ms.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Specimen>

        <Specimen name="Sheet" file="sign-in-sheet.tsx" className="min-h-[260px]" stage="start">
          <div className="w-full flex flex-col gap-3">
            <button onClick={() => setSheet(v => !v)} className={BTN.secondary + ' self-start'}>{sheet ? 'Close' : 'Open'}</button>
            <div className="relative h-[150px] flex items-end justify-center">
              <AnimatePresence>
                {sheet && (
                  <motion.div
                    initial={{ opacity: 0, transform: 'translateY(16px) scale(0.98)' }} animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                    exit={{ opacity: 0, transform: 'translateY(8px) scale(0.99)', transition: POP_OUT }} transition={{ duration: 0.22, ease: EASE }}
                    className={CARD.shell + ' w-[240px] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.4)]'}
                  >
                    <div className={CARD.head}><span>Sign in</span></div>
                    <div className={CARD.pad + ' py-3.5'}><p className={CARD.body}>In 220ms from 16px and .98; out 120ms.</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Specimen>

        <Specimen name="Side sheet · spring" file="gallery.tsx" className="min-h-[220px]" stage="start">
          <div className="w-full flex flex-col gap-3">
            <button onClick={() => setSide(v => !v)} className={BTN.secondary + ' self-start'}>{side ? 'Close' : 'Open'}</button>
            <div className="relative h-[110px] overflow-hidden rounded-[10px] bg-foreground/[0.03]">
              <AnimatePresence>
                {side && (
                  <motion.div
                    initial={{ opacity: 0, transform: 'translateX(24px)' }} animate={{ opacity: 1, transform: 'translateX(0px)' }}
                    exit={{ opacity: 0, transform: 'translateX(24px)', transition: { duration: 0.16, ease: EASE } }}
                    transition={{ type: 'spring', damping: 38, stiffness: 420, mass: 0.8 }}
                    className="absolute top-2 right-2 bottom-2 w-[55%] rounded-[14px] bg-card border border-edge-strong shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)] p-3"
                  >
                    <p className="text-meta text-ink-3">Damping 38, stiffness 420, mass .8. Critically damped: no overshoot.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Specimen>

        <Specimen name="Grid entrance · .card-enter" file="globals.css" className="min-h-[220px]" stage="start">
          <div className="w-full flex flex-col gap-3">
            <Replay onClick={replayGrid} />
            <div key={grid} className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="card-enter h-10 rounded-[8px] border border-edge bg-muted" style={{ ['--i' as string]: i }} />
              ))}
            </div>
            <p className="text-meta text-ink-4">Rise 12px, 300ms, 30ms stagger, capped at 32 cards. Runs in CSS from the server HTML.</p>
          </div>
        </Specimen>

        <Specimen name="Press" file="globals.css">
          <button className={BTN.primaryLg}>Press and hold</button>
          <span className="basis-full text-center text-meta text-ink-4">scale(.97), 140ms, fine pointers only.</span>
        </Specimen>

        <Specimen name="Hover zoom" file="globals.css · .hover-zoom">
          <div className="group w-40 aspect-[16/10] rounded-[10px] overflow-hidden border border-edge bg-muted">
            <div className="hover-zoom w-full h-full bg-[linear-gradient(135deg,var(--muted),rgba(var(--foreground-rgb),.12))] transition-transform duration-[250ms] ease-[var(--ease-sig)]" />
          </div>
          <span className="basis-full text-center text-meta text-ink-4">Image scale 1.015 on card hover.</span>
        </Specimen>
      </div>

      <Sub title="Every pattern">
        <Rows head={['Pattern', 'Spec', 'Where']} rows={[
          ['Press', 'scale(.97) · 140ms · opt out data-no-press', 'All buttons and links'],
          ['Popover', 'MENU: −4px .98 → rest 180ms; out 120ms', 'Account, Saved, Refine, Watch, Save'],
          ['Sheet', '16px .98 → rest 220ms; out 120ms', 'Sign-in'],
          ['Side sheet', 'Spring 38 / 420 / .8 from 24px; out 160ms', 'Site panel 640–1279'],
          ['Scrim', 'Opacity 180–220ms', 'Sheets'],
          ['Toast', '8px up 200ms; out 120ms', 'Signed in'],
          ['Grid first paint', '12px rise · 300ms · 30ms stagger', 'Gallery'],
          ['Grid swap', 'Old dims .55; new crossfade 6px · 200ms', 'Filters, sort'],
          ['Tab content', 'Fade in 150ms; out instantly', 'Panel tabs'],
          ['Site switch', 'Crossfade 120ms', 'Panel column'],
          ['Theme', 'Circle from the click point · 360ms · EASE', 'Theme toggle (view transition)'],
          ['Pro word', 'Colour wash once · 900ms, then still', 'Header'],
          ['Pro mark', 'Gather, sort in one sweep, rest; lens on hover', 'Pro card, member card'],
          ['Browse layer', 'None: opens and closes instantly', '⌘K, /'],
        ]} />
      </Sub>

      <Rules items={[
        <>Animate <C>transform</C> and <C>opacity</C> only. Write transforms as strings (<C>{"'translateY(4px)'"}</C>), not <C>x</C>/<C>y</C>/<C>scale</C>, so they stay on the compositor.</>,
        <>Exits are faster than entrances: 120ms out against 180–220ms in.</>,
        <>Nothing in everyday UI over 300ms. 450ms is for rare reveals.</>,
        <>No overshoot or bounce. The one spring is critically damped.</>,
        <>No animation on keyboard-triggered or very frequent actions: ⌘K opens instantly, arrow-key tab changes jump.</>,
        <>Hover motion only on <C>(hover: hover) and (pointer: fine)</C>.</>,
        <>Popovers grow from their trigger: set <C>transformOrigin</C> to its corner.</>,
        <>Reduced motion keeps feedback and removes movement: colour and opacity still change at 120ms; transforms and keyframes stop.</>,
      ]} />
    </Section>
  )
}

/* ── Sound ──────────────────────────────────────────────────────────────── */

export function SoundSection() {
  const s = useSoundsContext()
  const SOUNDS: [string, () => void, string, string][] = [
    ['playHover', s.playHover, 'Card hover', 'A5 → G4 triangle, 40ms'],
    ['playFilterClick', s.playFilterClick, 'Sort, filter, chip', 'A5 sine tick, 30ms'],
    ['playSelect', s.playSelect, 'Open a site', 'G4 + D5 pluck, 120ms'],
    ['playTabChange', s.playTabChange, 'Panel tab', 'E4 → G4 glide, 80ms'],
    ['playCopy', s.playCopy, 'Copy a value', 'C6 then E6'],
    ['playClose', s.playClose, 'Close a panel', 'A4 → E4, 100ms'],
    ['playPanelOpen', s.playPanelOpen, 'Panel opens', 'E3 + B3 + E4 chord'],
    ['playThemeToggle', () => s.playThemeToggle(true), 'Theme switch', 'E5 then A5 chime'],
    ['playSuccess', s.playSuccess, 'Something finished', 'C5 E5 G5 arpeggio'],
  ]
  return (
    <Section id="sound" n="18" title="Sound" lede="Synthesised, very quiet, silent until the visitor has interacted, and switchable from the header. Each sound has one job.">
      <div className="flex items-center gap-3">
        <button onClick={() => s.setEnabled(v => !v)} className={BTN.secondary} aria-pressed={s.enabled}>
          {s.enabled ? <SpeakerHigh className={ICON.inline} weight="bold" /> : <SpeakerSlash className={ICON.inline} weight="bold" />}
          Sounds {s.enabled ? 'on' : 'off'}
        </button>
        <span className="text-meta text-ink-4">contexts/sounds-context.tsx</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {SOUNDS.map(([n, play, use, shape]) => (
          <button key={n} onClick={play} className="group text-left rounded-[10px] border border-edge p-3 hover:border-edge-strong hover:bg-foreground/[0.025] transition-colors">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-[600] text-ink">{use}</span>
              <Play className={ICON.micro + ' text-ink-4 group-hover:text-ink'} weight="fill" />
            </span>
            <span className="block mt-1 text-meta text-ink-4">{n} · {shape}</span>
          </button>
        ))}
      </div>
      <Rules items={[
        'Reuse these. A new sound needs a job none of them does.',
        'Never on an action that fires many times a second.',
        'Volume stays under 0.05 gain; most sit near 0.02.',
      ]} />
    </Section>
  )
}

