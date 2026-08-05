import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Kanban, Pencil, Plus, Trash2, X } from 'lucide-react'
import { PROJECT_COLORS, PROJECT_COLOR_HEX } from '../../../../shared/projects'
import type { ProjectColor } from '../../../../shared/projects'
import type { BoardProject, NewBoardProject } from '../../../../shared/boards'
import { useConfirm } from '../../lib/useConfirm'
import ProjectBoard from './ProjectBoard'

interface FormState {
  name: string
  color: ProjectColor
}

function emptyForm(): FormState {
  return { name: '', color: 'rose' }
}

export default function Proyectos(): JSX.Element {
  const { t } = useTranslation()
  const { confirm, dialog } = useConfirm()

  const [projects, setProjects] = useState<BoardProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [openProjectId, setOpenProjectId] = useState<number | null>(null)

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
    setProjects(await window.api.boardProjects.list())
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

  function openEditForm(p: BoardProject): void {
    setEditingId(p.id)
    setForm({ name: p.name, color: p.color })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const trimmed = form.name.trim()
    if (!trimmed) {
      setError(t('errors.titleRequired'))
      return
    }

    const input: NewBoardProject = { name: trimmed, color: form.color }
    const result = editingId
      ? await window.api.boardProjects.update(editingId, input)
      : await window.api.boardProjects.add(input)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    closeForm()
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    if (!(await confirm(t('proyectos.deleteConfirm')))) return
    await window.api.boardProjects.remove(id)
    if (openProjectId === id) setOpenProjectId(null)
    await load()
  }

  if (openProjectId !== null) {
    const project = projects.find((p) => p.id === openProjectId)
    if (project) {
      return (
        <ProjectBoard
          project={project}
          onBack={() => setOpenProjectId(null)}
          onProjectChanged={load}
        />
      )
    }
  }

  return (
    <div className="habitos-page">
      <div className="habitos-header">
        <div>
          <h1>{t('proyectos.pageTitle')}</h1>
          <p className="habitos-subtitle">{t('proyectos.subtitle')}</p>
        </div>
        <button type="button" className="icon-button-primary" onClick={openAddForm} aria-label={t('proyectos.addAria')}>
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
              <h3>{editingId ? t('proyectos.editAria') : t('proyectos.addAria')}</h3>
              <button type="button" className="icon-button" onClick={closeForm} aria-label={t('common.close')}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <input
              type="text"
              placeholder={t('proyectos.namePlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />

            <div className="habit-color-picker" role="radiogroup" aria-label={t('proyectos.colorAria')}>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.color === c}
                  className={`habit-color-swatch${form.color === c ? ' active' : ''}`}
                  style={{ background: PROJECT_COLOR_HEX[c] }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>

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
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <Kanban size={28} strokeWidth={1.5} />
          <p>{t('proyectos.emptyState')}</p>
        </div>
      ) : (
        <div className="habits-grid">
          {projects.map((p) => {
            const pct = p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : 0
            return (
              <div key={p.id} className="habit-card proyecto-card" onClick={() => setOpenProjectId(p.id)}>
                <div className="habit-card-header">
                  <span className="habit-color-dot" style={{ background: PROJECT_COLOR_HEX[p.color] }} />
                  <span className="habit-card-title">{p.name}</span>
                  <div className="habit-card-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditForm(p)
                      }}
                      aria-label={t('proyectos.editAria')}
                    >
                      <Pencil size={13} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(p.id)
                      }}
                      aria-label={t('proyectos.deleteAria')}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <span className="habit-card-frequency">
                  {p.taskTotal === 0
                    ? t('proyectos.noTasks')
                    : t('proyectos.taskProgress', { done: p.taskDone, total: p.taskTotal })}
                </span>

                <div className="proyecto-progress-track">
                  <div
                    className="proyecto-progress-fill"
                    style={{ width: `${pct}%`, background: PROJECT_COLOR_HEX[p.color] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {dialog}
    </div>
  )
}
