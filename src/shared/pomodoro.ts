export const WORK_SECONDS = 25 * 60
export const BREAK_SECONDS = 5 * 60

export type PomodoroMode = 'work' | 'break'

export interface PomodoroState {
  mode: PomodoroMode
  secondsLeft: number
  isRunning: boolean
  completedPomodoros: number
  linkedTaskId: number | null
  linkedTaskTitle: string | null
  workSeconds: number
}

export function pomodoroMotivationKey(mode: PomodoroMode, progressPct: number, isRunning: boolean): string {
  if (!isRunning && progressPct === 0) {
    return mode === 'work' ? 'pomodoro.motivation.readyWork' : 'pomodoro.motivation.readyBreak'
  }
  if (mode === 'break') {
    return progressPct < 50 ? 'pomodoro.motivation.breathe' : 'pomodoro.motivation.almostReady'
  }
  if (progressPct < 25) return 'pomodoro.motivation.starting'
  if (progressPct < 50) return 'pomodoro.motivation.streak'
  if (progressPct < 80) return 'pomodoro.motivation.goingWell'
  return 'pomodoro.motivation.almostDone'
}
