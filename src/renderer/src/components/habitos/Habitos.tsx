import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame, Pencil, Plus, Trash2, X } from 'lucide-react'
import { computeStreak, HABIT_COLORS, HABIT_COLOR_HEX } from '../../../../shared/habits'
import type { Habit, HabitColor, HabitFrequency, NewHabit } from '../../../../shared/habits'
import { weekdayAbbr, weekdayName } from '../../../../shared/reminders'
import { todayIso, toLocalIso } from '../../../../shared/date'
import { currentLocale, capitalize } from '../../lib/dateFormat'
import { useConfirm } from '../../lib/useConfirm'
import HabitHeatmap from './HabitHeatmap'

const FREQUENCIES: HabitFrequency[] = ['diaria', 'semanal', 'personalizada']
const SINCE_DAYS = 84

interface FormState {
  title: string
  color: HabitColor
  frequency: HabitFrequency
  weekday: number
  weekdays: number[]
}

function emptyForm(): FormState {
  return { title: '', color: 'rose', frequency: 'diaria', weekday: 1, weekdays: [1, 2, 3, 4, 5] }
}

export default function Habitos(): JSX.Element {
  const { t } = useTranslation()
  const { confirm, dialog } = useConfirm()
  const locale = currentLocale()
  const weekdayFull = Array.from({ length: 7 }, (_, i) => capitalize(weekdayName(i, locale)))
  const weekdayLetters = Array.from({ length: 7 }, (_, i) => weekdayAbbr(i, locale).charAt(0))

  const FREQUENCY_LABEL: Record<HabitFrequency, string> = {
    diaria: t('habits.frequency.diaria'),
    semanal: t('habits.frequency.semanal'),
    personalizada: t('habits.frequency.personalizada')
  }

  const [habits, setHabits] = useState<Habit[]>([])
  const [logsByHabit, setLogsByHabit] = useState<Record<number, Set<string>>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!showForm) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeForm()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  async function load(): Promise<void> {
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - SINCE_DAYS)
    const [habitRows, logRows] = await Promise.all([
      window.api.habits.list(),
      window.api.habits.logsSince(toLocalIso(since))
    ])
    setHabits(habitRows)
    const grouped: Record<number, Set<string>> = {}
    for (const log of logRows) {
      if (!log.completed) continue
      if (!grouped[log.habitId]) grouped[log.habitId] = new Set()
      grouped[log.habitId].add(log.date)
    }
    setLogsByHabit(grouped)
    setLoading(false)
  }

  function closeForm(): void {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  function openAddForm(): void {
    setEditingId(null)
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  function openEditForm(h: Habit): void {
    setEditingId(h.id)
    setForm({
      title: h.title,
      color: h.color,
      frequency: h.frequency,
      weekday: h.weekday ?? 1,
      weekdays: h.weekdays ?? [1, 2, 3, 4, 5]
    })
    setError('')
    setShowForm(true)
  }

  function toggleWeekday(day: number): void {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((d) => d !== day)
        : [...current.weekdays, day].sort()
    }))
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const trimmed = form.title.trim()
    if (!trimmed) {
      setError(t('errors.titleRequired'))
      return
    }
    if (form.frequency === 'personalizada' && form.weekdays.length === 0) {
      setError(t('errors.weekdaysRequired'))
      return
    }

    const input: NewHabit = {
      title: trimmed,
      color: form.color,
      frequency: form.frequency,
      weekday: form.frequency === 'semanal' ? form.weekday : null,
      weekdays: form.frequency === 'personalizada' ? form.weekdays : null
    }

    const result = editingId ? await window.api.habits.update(editingId, input) : await window.api.habits.add(input)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    closeForm()
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    if (!(await confirm(t('habits.deleteConfirm')))) return
    await window.api.habits.remove(id)
    await load()
  }

  async function handleToggleDate(habitId: number, date: string): Promise<void> {
    await window.api.habits.toggleLog(habitId, date)
    await load()
  }

  function describeFrequency(h: Habit): string {
    if (h.frequency === 'diaria') return t('habits.everyDay')
    if (h.frequency === 'semanal') return weekdayFull[h.weekday ?? 0]
    if (!h.weekdays || h.weekdays.length === 0) return t('habits.frequency.personalizada')
    return h.weekdays.map((d) => weekdayFull[d].slice(0, 3)).join(', ')
  }

  const today = todayIso()

  return (
    <div className="habitos-page">
      <div className="habitos-header">
        <div>
          <h1>{t('habits.pageTitle')}</h1>
          <p className="habitos-subtitle">{t('habits.subtitle')}</p>
        </div>
        <button type="button" className="icon-button-primary" onClick={openAddForm} aria-label={t('habits.addAria')}>
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {showForm && (
        <div className="reminder-modal-backdrop" onClick={closeForm}>
          <form
            className="reminder-form reminder-modal-card"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reminder-modal-header">
              <h3>{editingId ? t('habits.editAria') : t('habits.addAria')}</h3>
              <button type="button" className="icon-button" onClick={closeForm} aria-label={t('common.close')}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <input
              type="text"
              placeholder={t('habits.titlePlaceholder')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />

            <div className="habit-color-picker" role="radiogroup" aria-label={t('habits.colorAria')}>
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.color === c}
                  className={`habit-color-swatch${form.color === c ? ' active' : ''}`}
                  style={{ background: HABIT_COLOR_HEX[c] }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>

            <div className="frequency-picker" role="radiogroup" aria-label={t('habits.frequencyAria')}>
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={form.frequency === f}
                  className={`frequency-chip${form.frequency === f ? ' active' : ''}`}
                  onClick={() => setForm({ ...form, frequency: f })}
                >
                  {FREQUENCY_LABEL[f]}
                </button>
              ))}
            </div>

            {form.frequency === 'semanal' && (
              <div className="weekday-picker" role="radiogroup" aria-label={t('habits.weekdayAria')}>
                {weekdayFull.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    role="radio"
                    aria-checked={form.weekday === index}
                    title={day}
                    className={`weekday-btn${form.weekday === index ? ' active' : ''}`}
                    onClick={() => setForm({ ...form, weekday: index })}
                  >
                    {weekdayLetters[index]}
                  </button>
                ))}
              </div>
            )}

            {form.frequency === 'personalizada' && (
              <div className="weekday-picker-row">
                <div className="weekday-picker" role="group" aria-label={t('habits.weekdaysAria')}>
                  {weekdayFull.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={form.weekdays.includes(index)}
                      title={day}
                      className={`weekday-btn${form.weekdays.includes(index) ? ' active' : ''}`}
                      onClick={() => toggleWeekday(index)}
                    >
                      {weekdayLetters[index]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="reminder-form-actions">
              <button type="submit" className="ledger-submit">
                {t('common.save')}
              </button>
              <button type="button" className="pill-button" onClick={closeForm}>
                {t('common.cancel')}
              </button>
            </div>

            {error && <p className="error">{error}</p>}
          </form>
        </div>
      )}

      {loading ? (
        <p className="tasks-loading">{t('common.loading')}</p>
      ) : habits.length === 0 ? (
        <div className="empty-state">
          <Flame size={28} strokeWidth={1.5} />
          <p>{t('habits.emptyState')}</p>
        </div>
      ) : (
        <div className="habits-grid">
          {habits.map((h) => {
            const completedDates = logsByHabit[h.id] ?? new Set<string>()
            const streak = computeStreak(h, completedDates)
            const doneToday = completedDates.has(today)
            return (
              <div key={h.id} className="habit-card">
                <div className="habit-card-header">
                  <span className="habit-color-dot" style={{ background: HABIT_COLOR_HEX[h.color] }} />
                  <span className="habit-card-title">{h.title}</span>
                  <div className="habit-card-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => openEditForm(h)}
                      aria-label={t('habits.editAria')}
                    >
                      <Pencil size={13} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(h.id)}
                      aria-label={t('habits.deleteAria')}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <span className="habit-card-frequency">{describeFrequency(h)}</span>

                <div className="habit-card-row">
                  <span className="habit-streak-badge">
                    <Flame size={13} strokeWidth={1.75} />
                    {t('habits.streakLabel', { count: streak })}
                  </span>
                  <button
                    type="button"
                    className={`habit-done-toggle${doneToday ? ' done' : ''}`}
                    onClick={() => handleToggleDate(h.id, today)}
                  >
                    {doneToday ? t('habits.alreadyDoneToday') : t('habits.markDoneAria')}
                  </button>
                </div>

                <HabitHeatmap
                  color={h.color}
                  completedDates={completedDates}
                  onToggleDate={(date) => handleToggleDate(h.id, date)}
                />
              </div>
            )
          })}
        </div>
      )}
      {dialog}
    </div>
  )
}
