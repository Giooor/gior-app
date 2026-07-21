import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Pencil,
  Plus,
  Target,
  Timer,
  Trash2,
  X
} from 'lucide-react'
import { playTaskCompleteSound } from '../../lib/sound'
import { formatWeekdayMonthDay } from '../../lib/dateFormat'
import { toLocalIso, todayIso } from '../../../../shared/date'
import type { NewTask, Task, TaskPriority } from '../../../../shared/tasks'
import Pomodoro from './Pomodoro'
import RecurringTasks from './RecurringTasks'
import Subtasks from './Subtasks'

const PRIORITIES: TaskPriority[] = ['alta', 'media', 'baja']

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toLocalIso(d)
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
}

function formatFocusedTime(seconds: number): string | null {
  if (seconds < 60) return null
  const totalMinutes = Math.round(seconds / 60)
  return formatMinutes(totalMinutes)
}

function parseTargetMinutes(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function Tareas(): JSX.Element {
  const { t } = useTranslation()
  const PRIORITY_LABEL: Record<TaskPriority, string> = {
    alta: t('tasks.priority.alta'),
    media: t('tasks.priority.media'),
    baja: t('tasks.priority.baja')
  }
  const PRIORITY_RANK: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 }

  function formatLabel(iso: string): string {
    const today = todayIso()
    if (iso === today) return t('common.today')
    if (iso === shiftDate(today, -1)) return t('common.yesterday')
    if (iso === shiftDate(today, 1)) return t('common.tomorrow')
    return formatWeekdayMonthDay(new Date(`${iso}T00:00:00`))
  }

  const [date, setDate] = useState(todayIso())
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksVersion, setTasksVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('media')
  const [targetMinutes, setTargetMinutes] = useState('')
  const [showTargetInput, setShowTargetInput] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState<TaskPriority>('media')
  const [editTargetMinutes, setEditTargetMinutes] = useState('')
  const [showEditTargetInput, setShowEditTargetInput] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [date])

  async function loadTasks(showLoading = true): Promise<void> {
    if (showLoading) setLoading(true)
    const rows = await window.api.tasks.list(date)
    setTasks(rows)
    setTasksVersion((v) => v + 1)
    if (showLoading) setLoading(false)
  }

  function toggleExpanded(id: number): void {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const input: NewTask = { date, title: trimmed, priority, targetMinutes: parseTargetMinutes(targetMinutes) }
    await window.api.tasks.add(input)
    setTitle('')
    setPriority('media')
    setTargetMinutes('')
    setShowTargetInput(false)
    await loadTasks()
  }

  async function handleToggle(task: Task): Promise<void> {
    if (!task.completed) playTaskCompleteSound()
    await window.api.tasks.toggle(task.id)
    await loadTasks()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.tasks.remove(id)
    await loadTasks()
  }

  function startEdit(task: Task): void {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditPriority(task.priority)
    setEditTargetMinutes(task.targetMinutes !== null ? String(task.targetMinutes) : '')
    setShowEditTargetInput(task.targetMinutes !== null)
  }

  function cancelEdit(): void {
    setEditingId(null)
  }

  async function handleEditSubmit(e: FormEvent, id: number): Promise<void> {
    e.preventDefault()
    const trimmed = editTitle.trim()
    if (!trimmed) return

    await window.api.tasks.update(id, {
      title: trimmed,
      priority: editPriority,
      targetMinutes: parseTargetMinutes(editTargetMinutes)
    })
    setEditingId(null)
    await loadTasks(false)
  }

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id - b.id),
    [tasks]
  )

  const completedCount = tasks.filter((task) => task.completed).length
  const progressPct = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100)

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1>{t('tasks.pageTitle')}</h1>
          <p className="tasks-subtitle">{t('tasks.subtitle')}</p>
        </div>
      </div>

      <div className="tasks-layout">
        <div className="tasks-panel">
          <div className="tasks-date-nav">
            <button
              type="button"
              className="date-nav-button"
              onClick={() => setDate(shiftDate(date, -1))}
              aria-label={t('tasks.prevDayAria')}
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <span className="tasks-date-label">{formatLabel(date)}</span>
            <button
              type="button"
              className="date-nav-button"
              onClick={() => setDate(shiftDate(date, 1))}
              aria-label={t('tasks.nextDayAria')}
            >
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
            {date !== todayIso() && (
              <button type="button" className="pill-button pill-button-accent" onClick={() => setDate(todayIso())}>
                {t('common.today')}
              </button>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="tasks-progress-bar">
              <div className="tasks-progress-track">
                <div className="tasks-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="tasks-progress-label">
                <CalendarCheck size={13} strokeWidth={2} />
                {t('tasks.progressLabel', { completed: completedCount, total: tasks.length })}
              </span>
            </div>
          )}

          <form className="tasks-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={t('tasks.newTaskPlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="priority-picker" role="radiogroup" aria-label={t('tasks.priorityAria')}>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={priority === p}
                  className={`priority-chip priority-chip-${p}${priority === p ? ' active' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  <span className={`priority-dot priority-${p}`} />
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
            {showTargetInput ? (
              <label className="focus-duration-field">
                <Target size={13} strokeWidth={1.75} />
                <input
                  type="number"
                  min={1}
                  placeholder={t('tasks.minPlaceholder')}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(e.target.value)}
                  aria-label={t('tasks.focusMinutesAria')}
                  autoFocus
                />
                <button
                  type="button"
                  className="focus-duration-clear"
                  onClick={() => {
                    setTargetMinutes('')
                    setShowTargetInput(false)
                  }}
                  aria-label={t('tasks.removeFocusAria')}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </label>
            ) : (
              <button
                type="button"
                className="focus-duration-toggle"
                onClick={() => setShowTargetInput(true)}
                title={t('tasks.addFocusTitle')}
              >
                <Target size={13} strokeWidth={1.75} />
                {t('tasks.focusToggleLabel')}
              </button>
            )}
            <button type="submit" className="icon-button-primary" aria-label={t('tasks.addAria')}>
              <Plus size={18} strokeWidth={2} />
            </button>
          </form>

          {loading ? (
            <p className="tasks-loading">{t('common.loading')}</p>
          ) : sortedTasks.length === 0 ? (
            <div className="empty-state">
              <ListTodo size={28} strokeWidth={1.5} />
              <p>{t('tasks.emptyState')}</p>
            </div>
          ) : (
            <ul className="tasks-list">
              {sortedTasks.map((task) => {
                const focusedLabel = formatFocusedTime(task.focusedSeconds)
                const expanded = expandedIds.has(task.id)
                const editing = editingId === task.id

                if (editing) {
                  return (
                    <li key={task.id} className="task-item task-item-editing">
                      <span className={`priority-bar priority-bar-${task.priority}`} />
                      <form className="task-edit-form" onSubmit={(e) => handleEditSubmit(e, task.id)}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                          autoFocus
                        />
                        <div className="priority-picker" role="radiogroup" aria-label={t('tasks.priorityAria')}>
                          {PRIORITIES.map((p) => (
                            <button
                              key={p}
                              type="button"
                              role="radio"
                              aria-checked={editPriority === p}
                              className={`priority-chip priority-chip-${p}${editPriority === p ? ' active' : ''}`}
                              onClick={() => setEditPriority(p)}
                            >
                              <span className={`priority-dot priority-${p}`} />
                              {PRIORITY_LABEL[p]}
                            </button>
                          ))}
                        </div>
                        {showEditTargetInput ? (
                          <label className="focus-duration-field">
                            <Target size={13} strokeWidth={1.75} />
                            <input
                              type="number"
                              min={1}
                              placeholder={t('tasks.minPlaceholder')}
                              value={editTargetMinutes}
                              onChange={(e) => setEditTargetMinutes(e.target.value)}
                              aria-label={t('tasks.focusMinutesAria')}
                            />
                            <button
                              type="button"
                              className="focus-duration-clear"
                              onClick={() => {
                                setEditTargetMinutes('')
                                setShowEditTargetInput(false)
                              }}
                              aria-label={t('tasks.removeFocusAria')}
                            >
                              <X size={12} strokeWidth={2} />
                            </button>
                          </label>
                        ) : (
                          <button
                            type="button"
                            className="focus-duration-toggle"
                            onClick={() => setShowEditTargetInput(true)}
                            title={t('tasks.addFocusTitle')}
                          >
                            <Target size={13} strokeWidth={1.75} />
                            {t('tasks.focusToggleLabel')}
                          </button>
                        )}
                        <button type="submit" className="icon-button icon-button-save" aria-label={t('common.save')}>
                          <Check size={16} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={cancelEdit}
                          aria-label={t('common.cancel')}
                        >
                          <X size={16} strokeWidth={1.75} />
                        </button>
                      </form>
                    </li>
                  )
                }

                return (
                  <li key={task.id} className={task.completed ? 'task-item completed' : 'task-item'}>
                    <span className={`priority-bar priority-bar-${task.priority}`} />
                    <div className="task-row">
                      <label className="task-checkbox">
                        <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task)} />
                        <span className="task-checkmark" />
                        <span className="task-title">{task.title}</span>
                        {focusedLabel && (
                          <span className="focused-badge">
                            <Timer size={11} strokeWidth={2} />
                            {focusedLabel}
                          </span>
                        )}
                        {task.targetMinutes !== null && (
                          <span className="target-badge" title={t('tasks.focusBadgeTitle')}>
                            <Target size={11} strokeWidth={2} />
                            {formatMinutes(task.targetMinutes)}
                          </span>
                        )}
                      </label>
                      <div className="task-actions">
                        {task.subtaskTotal > 0 && (
                          <span className="subtask-count">
                            {task.subtaskCompleted}/{task.subtaskTotal}
                          </span>
                        )}
                        <button
                          type="button"
                          className="icon-button task-edit"
                          onClick={() => startEdit(task)}
                          aria-label={t('tasks.editAria')}
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="icon-button task-expand"
                          onClick={() => toggleExpanded(task.id)}
                          aria-label={t('tasks.subtasksAria')}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown size={15} strokeWidth={1.75} />
                          ) : (
                            <ChevronRight size={15} strokeWidth={1.75} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-danger task-delete"
                          onClick={() => handleDelete(task.id)}
                          aria-label={t('tasks.deleteAria')}
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                    {expanded && <Subtasks taskId={task.id} onChange={() => loadTasks(false)} />}
                  </li>
                )
              })}
            </ul>
          )}

          <RecurringTasks />
        </div>

        <Pomodoro tasksVersion={tasksVersion} />
      </div>
    </div>
  )
}
