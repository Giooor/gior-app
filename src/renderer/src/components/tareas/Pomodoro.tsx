import { CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PictureInPicture2, Pause, Play, RotateCcw } from 'lucide-react'
import { playSessionEndChime } from '../../lib/sound'
import { BREAK_SECONDS, pomodoroMotivationKey } from '../../../../shared/pomodoro'
import { todayIso } from '../../../../shared/date'
import type { PomodoroState } from '../../../../shared/pomodoro'
import type { Task } from '../../../../shared/tasks'

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Pomodoro({ tasksVersion = 0 }: { tasksVersion?: number }): JSX.Element {
  const { t } = useTranslation()
  const [state, setState] = useState<PomodoroState | null>(null)
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    window.api.pomodoro.getState().then(setState)
    const unsubscribeState = window.api.pomodoro.onState(setState)
    const unsubscribeSound = window.api.pomodoro.onSessionEnded((mode) => {
      playSessionEndChime(mode)
      setCelebrate(true)
      setTimeout(() => setCelebrate(false), 3500)
    })
    return () => {
      unsubscribeState()
      unsubscribeSound()
    }
  }, [])

  useEffect(() => {
    window.api.tasks.list(todayIso()).then(setTodayTasks)
  }, [tasksVersion])

  if (!state) {
    return <div className="pomodoro-card" />
  }

  function handleTaskChange(value: string): void {
    if (!value) {
      window.api.pomodoro.setTask(null, null, null)
      return
    }
    const task = todayTasks.find((t) => t.id === Number(value))
    window.api.pomodoro.setTask(Number(value), task?.title ?? null, task?.targetMinutes ?? null)
  }

  const totalSeconds = state.mode === 'work' ? state.workSeconds : BREAK_SECONDS
  const progressPct = Math.min(100, Math.max(0, ((totalSeconds - state.secondsLeft) / totalSeconds) * 100))

  return (
    <div className="pomodoro-card">
      <div className="pomodoro-card-header">
        <h2>{t('pomodoro.title')}</h2>
        <span className={`widget-mode-badge pomodoro-mode-${state.mode}`}>
          {state.mode === 'work' ? t('pomodoro.modeWork') : t('pomodoro.modeBreak')}
        </span>
      </div>

      <div
        className={`pomodoro-ring pomodoro-ring-${state.mode}${state.isRunning ? ' running' : ''}`}
        style={{ '--progress': progressPct } as CSSProperties}
      >
        <div className="pomodoro-ring-inner">
          <div className="pomodoro-time">{formatTime(state.secondsLeft)}</div>
        </div>
      </div>

      <button
        type="button"
        className={`pomodoro-play-button pomodoro-play-button-${state.mode}`}
        onClick={() => (state.isRunning ? window.api.pomodoro.pause() : window.api.pomodoro.start())}
        aria-label={state.isRunning ? t('pomodoro.pauseAria') : t('pomodoro.startAria')}
      >
        {state.isRunning ? <Pause size={20} strokeWidth={2} /> : <Play size={20} strokeWidth={2} />}
      </button>

      <div className={`widget-motivation widget-motivation-${state.mode}${celebrate ? ' celebrate' : ''}`}>
        {celebrate ? t('pomodoro.sessionComplete') : t(pomodoroMotivationKey(state.mode, progressPct, state.isRunning))}
      </div>

      <select
        className="pomodoro-task-select"
        value={state.linkedTaskId ?? ''}
        onChange={(e) => handleTaskChange(e.target.value)}
        aria-label={t('pomodoro.linkedTaskAria')}
      >
        <option value="">{t('pomodoro.noLinkedTask')}</option>
        {todayTasks
          .filter((t) => !t.completed)
          .map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
      </select>

      <div className="pomodoro-controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => window.api.pomodoro.reset()}
          aria-label={t('pomodoro.resetAria')}
        >
          <RotateCcw size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => window.api.pomodoro.openWidget()}
          aria-label={t('pomodoro.showFloatingAria')}
          title={t('pomodoro.showFloatingTitle')}
        >
          <PictureInPicture2 size={18} strokeWidth={1.75} />
        </button>
      </div>
      <p className="pomodoro-count">{t('pomodoro.completedToday', { count: state.completedPomodoros })}</p>
    </div>
  )
}
