import type { PomodoroMode } from '../../../shared/pomodoro'

const SOUND_MUTED_KEY = 'soundMuted'

export function isSoundMuted(): boolean {
  return localStorage.getItem(SOUND_MUTED_KEY) === '1'
}

export function setSoundMuted(muted: boolean): void {
  localStorage.setItem(SOUND_MUTED_KEY, muted ? '1' : '0')
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.28, startTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playSessionEndChime(mode: PomodoroMode): void {
  if (isSoundMuted()) return
  const ctx = new AudioContext()
  const now = ctx.currentTime

  const notes = mode === 'work' ? [523.25, 659.25, 783.99, 1046.5] : [880, 698.46]
  const gap = mode === 'work' ? 0.16 : 0.2

  notes.forEach((freq, i) => {
    playTone(ctx, freq, now + i * gap, 0.55)
  })

  const totalDuration = notes.length * gap + 0.6
  setTimeout(() => ctx.close(), totalDuration * 1000)
}

function playBellPartial(ctx: AudioContext, freq: number, startTime: number, duration: number, peak: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playTaskCompleteSound(): void {
  if (isSoundMuted()) return
  const ctx = new AudioContext()
  const now = ctx.currentTime

  const fundamental = 1567.98
  playBellPartial(ctx, fundamental, now, 0.42, 0.3)
  playBellPartial(ctx, fundamental * 2.4, now, 0.26, 0.12)
  playBellPartial(ctx, fundamental * 3.5, now, 0.16, 0.06)

  setTimeout(() => ctx.close(), 550)
}
