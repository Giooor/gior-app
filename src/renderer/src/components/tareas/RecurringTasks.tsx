import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { NewRecurringTask, RecurringTask, RecurringTaskFrequency } from '../../../../shared/tasks'
import { weekdayAbbr, weekdayName } from '../../../../shared/reminders'
import { currentLocale, capitalize } from '../../lib/dateFormat'

const FREQUENCIES: RecurringTaskFrequency[] = ['diaria', 'semanal', 'personalizada']

export default function RecurringTasks(): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()
  const weekdayFull = Array.from({ length: 7 }, (_, i) => capitalize(weekdayName(i, locale)))
  const weekdayLetters = Array.from({ length: 7 }, (_, i) => weekdayAbbr(i, locale).charAt(0))

  const FREQUENCY_LABEL: Record<RecurringTaskFrequency, string> = {
    diaria: t('tasks.recurring.frequency.diaria'),
    semanal: t('tasks.recurring.frequency.semanal'),
    personalizada: t('tasks.recurring.frequency.personalizada')
  }

  function describeFrequency(r: RecurringTask): string {
    if (r.frequency === 'diaria') return t('tasks.recurring.everyDay')
    if (r.frequency === 'semanal') return weekdayFull[r.weekday ?? 0]
    if (!r.weekdays || r.weekdays.length === 0) return t('tasks.recurring.frequency.personalizada')
    return r.weekdays.map((d) => weekdayFull[d].slice(0, 3)).join(', ')
  }

  const [rules, setRules] = useState<RecurringTask[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState<RecurringTaskFrequency>('diaria')
  const [weekday, setWeekday] = useState(1)
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    const rows = await window.api.recurringTasks.list()
    setRules(rows)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const trimmed = title.trim()
    if (!trimmed) {
      setError(t('errors.titleRequired'))
      return
    }

    if (frequency === 'personalizada' && weekdays.length === 0) {
      setError(t('errors.weekdaysRequired'))
      return
    }

    const input: NewRecurringTask = {
      title: trimmed,
      frequency,
      weekday: frequency === 'semanal' ? weekday : null,
      weekdays: frequency === 'personalizada' ? weekdays : null
    }

    const result = await window.api.recurringTasks.add(input)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    setTitle('')
    await load()
  }

  function toggleWeekday(day: number): void {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
    )
  }

  async function handleToggle(id: number): Promise<void> {
    await window.api.recurringTasks.toggle(id)
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.recurringTasks.remove(id)
    await load()
  }

  return (
    <div className="recurring-panel">
      <button type="button" className="recurring-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} {t('tasks.recurring.toggleLabel')}
        {rules.length > 0 && ` (${rules.length})`}
      </button>

      {open && (
        <div className="recurring-body">
          <form className="recurring-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={t('tasks.recurring.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="frequency-picker" role="radiogroup" aria-label={t('tasks.recurring.frequencyAria')}>
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={frequency === f}
                  className={`frequency-chip${frequency === f ? ' active' : ''}`}
                  onClick={() => setFrequency(f)}
                >
                  {FREQUENCY_LABEL[f]}
                </button>
              ))}
            </div>

            {frequency === 'semanal' && (
              <div className="weekday-picker" role="radiogroup" aria-label={t('tasks.recurring.weekdayAria')}>
                {weekdayFull.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    role="radio"
                    aria-checked={weekday === index}
                    title={day}
                    className={`weekday-btn${weekday === index ? ' active' : ''}`}
                    onClick={() => setWeekday(index)}
                  >
                    {weekdayLetters[index]}
                  </button>
                ))}
              </div>
            )}

            {frequency === 'personalizada' && (
              <div className="weekday-picker-row">
                <div className="weekday-picker" role="group" aria-label={t('tasks.recurring.weekdaysAria')}>
                  {weekdayFull.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={weekdays.includes(index)}
                      title={day}
                      className={`weekday-btn${weekdays.includes(index) ? ' active' : ''}`}
                      onClick={() => toggleWeekday(index)}
                    >
                      {weekdayLetters[index]}
                    </button>
                  ))}
                </div>
                <button type="button" className="recurring-preset" onClick={() => setWeekdays([1, 2, 3, 4, 5])}>
                  {t('tasks.recurring.weekdayPreset')}
                </button>
              </div>
            )}

            <button type="submit" className="ledger-submit">
              {t('common.add')}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {rules.length === 0 ? (
            <p className="empty-state">{t('tasks.recurring.emptyState')}</p>
          ) : (
            <ul className="recurring-list">
              {rules.map((r) => (
                <li key={r.id} className={r.active ? 'recurring-item' : 'recurring-item inactive'}>
                  <label className="recurring-check">
                    <input type="checkbox" checked={r.active} onChange={() => handleToggle(r.id)} />
                    <span className="recurring-item-title">{r.title}</span>
                    <span className="recurring-freq-badge">{describeFrequency(r)}</span>
                  </label>
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => handleDelete(r.id)}
                    aria-label={t('tasks.recurring.deleteAria')}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="recurring-hint">{t('tasks.recurring.hint')}</p>
        </div>
      )}
    </div>
  )
}
