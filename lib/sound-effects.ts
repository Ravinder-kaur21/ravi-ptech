"use client"

/**
 * Muvx UI Sound Effects Engine
 * Generates ultra-low-latency, crystal-clear procedural audio for micro-interactions
 * using the Web Audio API. Requires zero external network requests or asset loading.
 */

class SoundEngine {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false

  constructor() {
    if (typeof window !== "undefined") {
      this.isMuted = localStorage.getItem("muvx-sound-muted") === "true"
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (typeof window !== "undefined") {
      localStorage.setItem("muvx-sound-muted", String(this.isMuted))
    }
    return this.isMuted
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  /**
   * Crisp micro-tap for buttons, tabs, and menu selections
   */
  public playClick(volume: number = 0.08) {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.04)
  }

  /**
   * Bubble pop for stars, tags, and small items
   */
  public playPop(volume: number = 0.1) {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(450, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.06)

    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.06)
  }

  /**
   * Harmonic two-chord celebration for success actions (dispatch, invoice, payment)
   */
  public playSuccess(volume: number = 0.12) {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, now + idx * 0.05)

      gain.gain.setValueAtTime(0, now + idx * 0.05)
      gain.gain.linearRampToValueAtTime(volume, now + idx * 0.05 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.05)
      osc.stop(now + idx * 0.05 + 0.35)
    })
  }

  /**
   * Bell chime for notifications and incoming alerts
   */
  public playBell(volume: number = 0.12) {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const freqs = [1200, 2400]

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(f, now)

      gain.gain.setValueAtTime(volume * (1 / (i + 1)), now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.6)
    })
  }

  /**
   * Subdued switch toggle
   */
  public playToggle(checked: boolean, volume: number = 0.07) {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    const startFreq = checked ? 400 : 600
    const endFreq = checked ? 650 : 350

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.05)

    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.05)
  }
}

export const sounds = new SoundEngine()
