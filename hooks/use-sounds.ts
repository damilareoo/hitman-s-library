'use client'

import { useCallback, useRef, useState } from 'react'

export function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [enabled, setEnabled] = useState(false)

  function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext()
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume()
      }
      return ctxRef.current
    } catch {
      return null
    }
  }

  const playHover = useCallback(() => {
    if (!enabled) return
    const ac = getCtx()
    if (!ac) return
    try {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(720, ac.currentTime + 0.07)
      gain.gain.setValueAtTime(0.022, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.07)
      osc.start(ac.currentTime)
      osc.stop(ac.currentTime + 0.07)
    } catch {}
  }, [enabled])

  const playSelect = useCallback(() => {
    if (!enabled) return
    const ac = getCtx()
    if (!ac) return
    try {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(480, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(680, ac.currentTime + 0.14)
      gain.gain.setValueAtTime(0.045, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14)
      osc.start(ac.currentTime)
      osc.stop(ac.currentTime + 0.14)
    } catch {}
  }, [enabled])

  const playSuccess = useCallback(() => {
    if (!enabled) return
    const ac = getCtx()
    if (!ac) return
    try {
      const notes: [number, number][] = [[523, 0], [659, 0.1], [784, 0.2]]
      notes.forEach(([freq, delay]) => {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.connect(gain)
        gain.connect(ac.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.038, ac.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.18)
        osc.start(ac.currentTime + delay)
        osc.stop(ac.currentTime + delay + 0.18)
      })
    } catch {}
  }, [enabled])

  const playFilterClick = useCallback(() => {
    if (!enabled) return
    const ac = getCtx()
    if (!ac) return
    try {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(560, ac.currentTime)
      gain.gain.setValueAtTime(0.028, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05)
      osc.start(ac.currentTime)
      osc.stop(ac.currentTime + 0.05)
    } catch {}
  }, [enabled])

  const playPanelOpen = useCallback(() => {
    if (!enabled) return
    const ac = getCtx()
    if (!ac) return
    try {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(480, ac.currentTime + 0.18)
      gain.gain.setValueAtTime(0.04, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18)
      osc.start(ac.currentTime)
      osc.stop(ac.currentTime + 0.18)
    } catch {}
  }, [enabled])

  return {
    enabled,
    setEnabled,
    playHover,
    playSelect,
    playSuccess,
    playFilterClick,
    playPanelOpen,
  }
}
