'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface SoundsContextValue {
  enabled: boolean
  setEnabled: React.Dispatch<React.SetStateAction<boolean>>
  playHover: () => void
  playSelect: () => void
  playSuccess: () => void
  playFilterClick: () => void
  playTabChange: () => void
  playCopy: () => void
  playClose: () => void
  playPanelOpen: () => void
}

const SoundsContext = createContext<SoundsContextValue | null>(null)

// Equal temperament frequencies
const NOTE = {
  E3: 164.81, B3: 246.94, E4: 329.63,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
  A5: 880.00,
  C6: 1046.50, E6: 1318.51,
}

export function SoundsProvider({ children }: { children: React.ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const [enabled, setEnabled] = useState(false)

  function ac(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
      return ctxRef.current
    } catch { return null }
  }

  function tone(
    freq: number, endFreq: number, duration: number, vol: number,
    type: OscillatorType = 'sine', delayStart = 0, attackTime = 0.003
  ) {
    const a = ac()
    if (!a) return
    try {
      const osc = a.createOscillator()
      const gain = a.createGain()
      osc.connect(gain)
      gain.connect(a.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, a.currentTime + delayStart)
      if (endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, a.currentTime + delayStart + duration)
      }
      gain.gain.setValueAtTime(0.0001, a.currentTime + delayStart)
      gain.gain.linearRampToValueAtTime(vol, a.currentTime + delayStart + attackTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delayStart + duration)
      osc.start(a.currentTime + delayStart)
      osc.stop(a.currentTime + delayStart + duration + 0.01)
    } catch {}
  }

  // Ultra-subtle breath — triangle wave, very short, barely perceptible
  const playHover = useCallback(() => {
    if (!enabled) return
    tone(NOTE.A5, NOTE.G4, 0.04, 0.006, 'triangle')
  }, [enabled])

  // Pluck — two layered tones (perfect 5th), like touching a string
  const playSelect = useCallback(() => {
    if (!enabled) return
    tone(NOTE.G4, NOTE.G4, 0.12, 0.032, 'triangle', 0, 0.002)
    tone(NOTE.D5, NOTE.C5, 0.08, 0.018, 'triangle', 0, 0.002)
  }, [enabled])

  // Micro-tick — clean sine ping, single frequency, very brief
  const playFilterClick = useCallback(() => {
    if (!enabled) return
    tone(NOTE.A5, NOTE.A5, 0.03, 0.016, 'sine', 0, 0.001)
  }, [enabled])

  // Upward glide — smooth motion feeling, like swiping
  const playTabChange = useCallback(() => {
    if (!enabled) return
    tone(NOTE.E4, NOTE.G4, 0.08, 0.022, 'triangle', 0, 0.004)
  }, [enabled])

  // Two-note phrase — C→E a minor 3rd, bright confirmation
  const playCopy = useCallback(() => {
    if (!enabled) return
    tone(NOTE.C6, NOTE.C6, 0.07, 0.024, 'sine', 0, 0.002)
    tone(NOTE.E6, NOTE.E6, 0.06, 0.016, 'sine', 0.055, 0.002)
  }, [enabled])

  // Descending — finality, like closing a drawer
  const playClose = useCallback(() => {
    if (!enabled) return
    tone(NOTE.A4, NOTE.E4, 0.10, 0.020, 'triangle', 0, 0.005)
  }, [enabled])

  // Warm chord — layered 3 sine tones (E3+B3+E4), like opening a door
  const playPanelOpen = useCallback(() => {
    if (!enabled) return
    const a = ac()
    if (!a) return
    const chord = [
      { freq: NOTE.E3, vol: 0.022, dur: 0.22 },
      { freq: NOTE.B3, vol: 0.018, dur: 0.20, delay: 0.02 },
      { freq: NOTE.E4, vol: 0.014, dur: 0.18, delay: 0.04 },
    ]
    chord.forEach(({ freq, vol, dur, delay = 0 }) => {
      tone(freq, freq, dur, vol, 'sine', delay, 0.015)
    })
  }, [enabled])

  // Major triad arpeggio — C5 E5 G5, warm triangle, musical resolve
  const playSuccess = useCallback(() => {
    if (!enabled) return
    const notes: [number, number, number][] = [
      [NOTE.C5, 0, 0.04],
      [NOTE.E5, 0.085, 0.036],
      [NOTE.G5, 0.17, 0.032],
    ]
    notes.forEach(([freq, delay, vol]) => {
      tone(freq, freq, 0.22, vol, 'triangle', delay, 0.005)
    })
  }, [enabled])

  return (
    <SoundsContext.Provider value={{
      enabled, setEnabled,
      playHover, playSelect, playSuccess, playFilterClick,
      playTabChange, playCopy, playClose, playPanelOpen,
    }}>
      {children}
    </SoundsContext.Provider>
  )
}

export function useSoundsContext() {
  const ctx = useContext(SoundsContext)
  if (!ctx) throw new Error('useSoundsContext must be used within SoundsProvider')
  return ctx
}
