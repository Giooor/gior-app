import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, PartyPopper, Plus, Repeat, Trash2 } from 'lucide-react'
import {
  daysInMonth,
  daysUntilReminder,
  isReminderPast,
  monthName,
  reminderOccurrenceDate,
  weekdayName,
  weekdayAbbr
} from '../../../../shared/reminders'
import type { NewReminder, Reminder, ReminderType } from '../../../../shared/reminders'
import { REMINDER_TYPES as TYPES, TYPE_ICON, TYPE_LABEL_KEY } from '../../lib/reminderTypes'
import { currentLocale, capitalize } from '../../lib/dateFormat'

interface FormState {
  title: string
  day: number
  month: number
  type: ReminderType
  notes: string
  repeats: boolean
}

function emptyForm(): FormState {
  const today = new Date()
  return {
    title: '',
    day: today.getDate(),
    month: today.getMonth() + 1,
    type: 'cumpleanos',
    notes: '',
    repeats: true
  }
}

export default function Recordatorios(): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    setLoading(true)
    const rows = await window.api.reminders.list()
    setReminders(rows)
    setLoading(false)
  }

  const sorted = useMemo(
    () =>
      [...reminders].sort((a, b) => {
        const aPast = isReminderPast(a)
        const bPast = isReminderPast(b)
        if (aPast !== bPast) return aPast ? 1 : -1
        const diff = aPast
          ? daysUntilReminder(b) - daysUntilReminder(a)
          : daysUntilReminder(a) - daysUntilReminder(b)
        return diff !== 0 ? diff : a.title.localeCompare(b.title)
      }),
    [reminders]
  )

  const next = sorted.find((r) => !isReminderPast(r)) ?? null

  function formatDaysUntil(n: number): string {
    if (n === 0) return t('common.today')
    if (n === 1) return t('common.tomorrow')
    return t('reminders.inDays', { n })
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError(t('reminders.titleRequired'))
      return
    }

    const input: NewReminder = {
      title: form.title.trim(),
      day: form.day,
      month: form.month,
      type: form.type,
      notes: form.notes.trim(),
      repeats: form.repeats
    }

    const result = await window.api.reminders.add(input)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    setForm(emptyForm())
    setShowForm(false)
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.reminders.remove(id)
    await load()
  }

  function startEdit(r: Reminder): void {
    setEditingId(r.id)
    setEditForm({ title: r.title, day: r.day, month: r.month, type: r.type, notes: r.notes, repeats: r.repeats })
  }

  function cancelEdit(): void {
    setEditingId(null)
  }

  async function handleEditSubmit(e: FormEvent, id: number): Promise<void> {
    e.preventDefault()
    if (!editForm.title.trim()) return

    const result = await window.api.reminders.update(id, {
      title: editForm.title.trim(),
      day: editForm.day,
      month: editForm.month,
      type: editForm.type,
      notes: editForm.notes.trim(),
      repeats: editForm.repeats
    })
    if (result.ok) {
      setEditingId(null)
      await load()
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  function dayOptionsFor(month: number): number[] {
    return Array.from({ length: daysInMonth(month) }, (_, i) => i + 1)
  }

  return (
    <div className="reminders-page">
      <div className="reminders-header">
        <div>
          <h1>{t('reminders.pageTitle')}</h1>
          <p className="reminders-subtitle">{t('reminders.subtitle')}</p>
        </div>
        <button
          type="button"
          className="icon-button-primary"
          onClick={() => setShowForm((v) => !v)}
          aria-label={t('reminders.addAria')}
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {next && (
        <div className={`reminder-hero reminder-hero-${next.type}`}>
          <div className="reminder-hero-icon">
            {(() => {
              const Icon = TYPE_ICON[next.type]
              return <Icon size={28} strokeWidth={1.75} />
            })()}
          </div>
          <div className="reminder-hero-body">
            <span className="reminder-hero-eyebrow">
              {t('home.reminderEyebrow', { type: t(TYPE_LABEL_KEY[next.type]) })}
            </span>
            <span className="reminder-hero-title">{next.title}</span>
            <span className="reminder-hero-date">
              {capitalize(weekdayName(reminderOccurrenceDate(next).getDay(), locale))}{' '}
              {t('common.dayMonth', { day: next.day, month: monthName(next.month, locale) })}
            </span>
          </div>
          <div className="reminder-hero-countdown">
            <span className="reminder-hero-countdown-value">
              {daysUntilReminder(next) === 0
                ? t('home.todayExcited')
                : daysUntilReminder(next) === 1
                  ? t('home.tomorrowExcited')
                  : daysUntilReminder(next)}
            </span>
            {daysUntilReminder(next) > 1 && <span className="reminder-hero-countdown-label">{t('home.daysLabel')}</span>}
          </div>
        </div>
      )}

      {showForm && (
        <form className="reminder-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('reminders.titlePlaceholder')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />

          <div className="reminder-date-fields">
            <select
              value={form.day}
              onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
              aria-label={t('reminders.dayAria')}
            >
              {dayOptionsFor(form.month).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              aria-label={t('reminders.monthAria')}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {capitalize(monthName(m, locale))}
                </option>
              ))}
            </select>
          </div>

          <div className="reminder-type-picker" role="radiogroup" aria-label={t('reminders.typeAria')}>
            {TYPES.map((typ) => {
              const Icon = TYPE_ICON[typ]
              return (
                <button
                  key={typ}
                  type="button"
                  role="radio"
                  aria-checked={form.type === typ}
                  className={`reminder-type-chip${form.type === typ ? ' active' : ''}`}
                  onClick={() => setForm({ ...form, type: typ })}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {t(TYPE_LABEL_KEY[typ])}
                </button>
              )
            })}
          </div>

          <input
            type="text"
            placeholder={t('reminders.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <label className="reminder-repeat-toggle">
            <input
              type="checkbox"
              checked={form.repeats}
              onChange={(e) => setForm({ ...form, repeats: e.target.checked })}
            />
            <Repeat size={13} strokeWidth={1.75} />
            {t('reminders.repeatsToggle')}
          </label>

          <div className="reminder-form-actions">
            <button type="submit" className="ledger-submit">
              {t('common.save')}
            </button>
            <button type="button" className="pill-button" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </form>
      )}

      {loading ? (
        <p className="tasks-loading">{t('common.loading')}</p>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <PartyPopper size={28} strokeWidth={1.5} />
          <p>{t('reminders.emptyState')}</p>
        </div>
      ) : (
        <ul className="reminders-list">
          {sorted.map((r) => {
            const editing = editingId === r.id
            const Icon = TYPE_ICON[r.type]
            const occurrence = reminderOccurrenceDate(r)
            const days = daysUntilReminder(r)
            const past = isReminderPast(r)

            if (editing) {
              return (
                <li key={r.id} className="reminder-item reminder-item-editing">
                  <form className="reminder-edit-form" onSubmit={(e) => handleEditSubmit(e, r.id)}>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      autoFocus
                    />
                    <div className="reminder-date-fields">
                      <select
                        value={editForm.day}
                        onChange={(e) => setEditForm({ ...editForm, day: Number(e.target.value) })}
                        aria-label={t('reminders.dayAria')}
                      >
                        {dayOptionsFor(editForm.month).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editForm.month}
                        onChange={(e) => setEditForm({ ...editForm, month: Number(e.target.value) })}
                        aria-label={t('reminders.monthAria')}
                      >
                        {monthOptions.map((m) => (
                          <option key={m} value={m}>
                            {capitalize(monthName(m, locale))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="reminder-type-picker" role="radiogroup" aria-label={t('reminders.typeAria')}>
                      {TYPES.map((typ) => {
                        const TIcon = TYPE_ICON[typ]
                        return (
                          <button
                            key={typ}
                            type="button"
                            role="radio"
                            aria-checked={editForm.type === typ}
                            className={`reminder-type-chip${editForm.type === typ ? ' active' : ''}`}
                            onClick={() => setEditForm({ ...editForm, type: typ })}
                          >
                            <TIcon size={14} strokeWidth={1.75} />
                            {t(TYPE_LABEL_KEY[typ])}
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder={t('reminders.notesPlaceholder')}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                    <label className="reminder-repeat-toggle">
                      <input
                        type="checkbox"
                        checked={editForm.repeats}
                        onChange={(e) => setEditForm({ ...editForm, repeats: e.target.checked })}
                      />
                      <Repeat size={13} strokeWidth={1.75} />
                      {t('reminders.repeatsToggle')}
                    </label>
                    <div className="reminder-form-actions">
                      <button type="submit" className="ledger-submit">
                        {t('common.save')}
                      </button>
                      <button type="button" className="pill-button" onClick={cancelEdit}>
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                </li>
              )
            }

            return (
              <li key={r.id} className={`reminder-item${past ? ' reminder-item-past' : ''}`}>
                <div className={`reminder-date-badge reminder-date-badge-${r.type}`}>
                  <span className="reminder-date-weekday">{weekdayAbbr(occurrence.getDay(), locale)}</span>
                  <span className="reminder-date-day">{r.day}</span>
                  <span className="reminder-date-month">{monthName(r.month, locale).slice(0, 3)}</span>
                </div>
                <div className="reminder-item-body">
                  <div className="reminder-item-title-row">
                    <Icon size={14} strokeWidth={1.75} className="reminder-item-type-icon" />
                    <span className="reminder-item-title">{r.title}</span>
                  </div>
                  {r.notes && <p className="reminder-item-notes">{r.notes}</p>}
                  <span className="reminder-item-meta">
                    {past
                      ? t('reminders.pastNoRepeat')
                      : occurrence.getFullYear() !== new Date().getFullYear()
                        ? t('reminders.nextYear', { month: capitalize(monthName(r.month, locale)) })
                        : r.repeats
                          ? t(TYPE_LABEL_KEY[r.type])
                          : t('reminders.noRepeatSuffix', { type: t(TYPE_LABEL_KEY[r.type]) })}
                  </span>
                </div>
                <div className="reminder-item-actions">
                  <span className={`reminder-countdown-pill${past ? ' past' : days <= 1 ? ' soon' : ''}`}>
                    {past ? t('reminders.past') : formatDaysUntil(days)}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => startEdit(r)}
                    aria-label={t('reminders.editAria')}
                  >
                    <Pencil size={13} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => handleDelete(r.id)}
                    aria-label={t('reminders.deleteAria')}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
