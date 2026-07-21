import { BrowserWindow, Notification } from 'electron'
import { EventEmitter } from 'events'
import { addFocusedSeconds } from './tasks'
import { mt } from './i18n'
import { BREAK_SECONDS, WORK_SECONDS } from '../shared/pomodoro'
import type { PomodoroMode, PomodoroState } from '../shared/pomodoro'

export const pomodoroEvents = new EventEmitter()

let mode: PomodoroMode = 'work'
let secondsLeft = WORK_SECONDS
let isRunning = false
let completedPomodoros = 0
let interval: NodeJS.Timeout | null = null

let linkedTaskId: number | null = null
let linkedTaskTitle: string | null = null
let linkedTaskWorkSeconds: number | null = null
let pendingFocusedSeconds = 0

function currentWorkSeconds(): number {
  return linkedTaskWorkSeconds ?? WORK_SECONDS
}

function getState(): PomodoroState {
  return {
    mode,
    secondsLeft,
    isRunning,
    completedPomodoros,
    linkedTaskId,
    linkedTaskTitle,
    workSeconds: currentWorkSeconds()
  }
}

function broadcast(): void {
  const state = getState()
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('pomodoro:state', state)
  }
}

function flushFocusedSeconds(): void {
  if (linkedTaskId !== null && pendingFocusedSeconds > 0) {
    addFocusedSeconds(linkedTaskId, pendingFocusedSeconds)
  }
  pendingFocusedSeconds = 0
}

function notifySessionEnd(finishedMode: PomodoroMode): void {
  pomodoroEvents.emit('sessionEnd', finishedMode)

  if (Notification.isSupported()) {
    new Notification({
      title: finishedMode === 'work' ? mt('sessionEndWorkTitle') : mt('sessionEndBreakTitle'),
      body: finishedMode === 'work' ? mt('sessionEndWorkBody') : mt('sessionEndBreakBody')
    }).show()
  }
}

function tick(): void {
  if (secondsLeft > 1) {
    secondsLeft -= 1
    if (mode === 'work' && linkedTaskId !== null) {
      pendingFocusedSeconds += 1
    }
    broadcast()
    return
  }

  const finishedMode = mode
  if (mode === 'work') {
    completedPomodoros += 1
    if (linkedTaskId !== null) pendingFocusedSeconds += 1
  }
  flushFocusedSeconds()
  mode = mode === 'work' ? 'break' : 'work'
  secondsLeft = mode === 'work' ? currentWorkSeconds() : BREAK_SECONDS

  isRunning = false
  if (interval) {
    clearInterval(interval)
    interval = null
  }

  notifySessionEnd(finishedMode)
  broadcast()
}

export function startPomodoro(): PomodoroState {
  if (!isRunning) {
    isRunning = true
    interval = setInterval(tick, 1000)
  }
  broadcast()
  return getState()
}

export function pausePomodoro(): PomodoroState {
  isRunning = false
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  flushFocusedSeconds()
  broadcast()
  return getState()
}

export function resetPomodoro(): PomodoroState {
  pausePomodoro()
  secondsLeft = mode === 'work' ? currentWorkSeconds() : BREAK_SECONDS
  broadcast()
  return getState()
}

export function setPomodoroTask(
  taskId: number | null,
  taskTitle: string | null,
  targetMinutes: number | null
): PomodoroState {
  flushFocusedSeconds()
  linkedTaskId = taskId
  linkedTaskTitle = taskId !== null ? taskTitle : null
  linkedTaskWorkSeconds = taskId !== null && targetMinutes ? targetMinutes * 60 : null

  if (mode === 'work' && !isRunning) {
    secondsLeft = currentWorkSeconds()
  }

  broadcast()
  return getState()
}

export function getPomodoroState(): PomodoroState {
  return getState()
}
