import { CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, Pause, Play, X } from 'lucide-react'
import { playSessionEndChime } from '../../lib/sound'
import { BREAK_SECONDS, pomodoroMotivationKey } from '../../../../shared/pomodoro'
import type { PomodoroState } from '../../../../shared/pomodoro'

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function PomodoroWidget(): JSX.Element | null {
  const { t } = useTranslation()
  const [state, setState] = useState<PomodoroState | null>(null)
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

  if (!state) return null

  const totalSeconds = state.mode === 'work' ? state.workSeconds : BREAK_SECONDS
  const progressPct = Math.min(100, Math.max(0, ((totalSeconds - state.secondsLeft) / totalSeconds) * 100))

  return (
    <div className="widget-root">
      <div className="widget-drag-region">
        <span className={`widget-mode-badge pomodoro-mode-${state.mode}`}>
          {state.mode === 'work' ? t('pomodoro.modeWork') : t('pomodoro.modeBreak')}
        </span>
        <div className="widget-controls">
          <button
            type="button"
            className="widget-icon-button"
            onClick={() => window.api.pomodoro.focusMain()}
            aria-label={t('pomodoro.openAppAria')}
          >
            <Maximize2 size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="widget-icon-button"
            onClick={() => window.close()}
            aria-label={t('pomodoro.closeAria')}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        className={`widget-ring widget-ring-${state.mode}${state.isRunning ? ' running' : ''}`}
        style={{ '--progress': progressPct } as CSSProperties}
      >
        <div className="widget-ring-inner">
          <div className="widget-time">{formatTime(state.secondsLeft)}</div>
        </div>
      </div>

      <button
        type="button"
        className={`widget-play-button widget-play-button-${state.mode}`}
        onClick={() => (state.isRunning ? window.api.pomodoro.pause() : window.api.pomodoro.start())}
        aria-label={state.isRunning ? t('pomodoro.pauseAria') : t('pomodoro.startAria')}
      >
        {state.isRunning ? <Pause size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
      </button>

      {state.linkedTaskTitle && <div className="widget-task">{state.linkedTaskTitle}</div>}

      <div className={`widget-motivation widget-motivation-${state.mode}${celebrate ? ' celebrate' : ''}`}>
        {celebrate ? t('pomodoro.sessionComplete') : t(pomodoroMotivationKey(state.mode, progressPct, state.isRunning))}
      </div>
    </div>
  )
}
