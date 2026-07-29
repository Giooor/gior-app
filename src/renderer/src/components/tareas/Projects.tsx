import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useConfirm } from '../../lib/useConfirm'
import type { Project, ProjectColor } from '../../../../shared/projects'
import { PROJECT_COLORS, PROJECT_COLOR_HEX } from '../../../../shared/projects'

interface Props {
  projects: Project[]
  onChange: () => void
}

export default function Projects({ projects, onChange }: Props): JSX.Element {
  const { t } = useTranslation()
  const { confirm, dialog } = useConfirm()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<ProjectColor>('sky')
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<ProjectColor>('sky')

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('errors.titleRequired'))
      return
    }

    const result = await window.api.projects.add({ name: trimmed, color })
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    setName('')
    setColor('sky')
    onChange()
  }

  function startEdit(project: Project): void {
    setEditingId(project.id)
    setEditName(project.name)
    setEditColor(project.color)
  }

  function cancelEdit(): void {
    setEditingId(null)
  }

  async function handleEditSubmit(e: FormEvent, id: number): Promise<void> {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) return

    const result = await window.api.projects.update(id, { name: trimmed, color: editColor })
    if (!result.ok) return

    setEditingId(null)
    onChange()
  }

  async function handleDelete(id: number): Promise<void> {
    if (!(await confirm(t('tasks.projects.deleteConfirm')))) return
    if (editingId === id) setEditingId(null)
    await window.api.projects.remove(id)
    onChange()
  }

  return (
    <div className="recurring-panel">
      <button type="button" className="recurring-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} {t('tasks.projects.toggleLabel')}
        {projects.length > 0 && ` (${projects.length})`}
      </button>

      {open && (
        <div className="recurring-body">
          <form className="recurring-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={t('tasks.projects.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="habit-color-picker" role="radiogroup" aria-label={t('tasks.projects.colorAria')}>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  className={`habit-color-swatch${color === c ? ' active' : ''}`}
                  style={{ background: PROJECT_COLOR_HEX[c] }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <button type="submit" className="ledger-submit" aria-label={t('tasks.projects.addAria')}>
              {t('common.add')}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {projects.length === 0 ? (
            <p className="empty-state">{t('tasks.projects.emptyState')}</p>
          ) : (
            <ul className="recurring-list">
              {projects.map((p) => (
                <li key={p.id} className="recurring-item">
                  {editingId === p.id ? (
                    <form className="task-edit-form" onSubmit={(e) => handleEditSubmit(e, p.id)}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                        autoFocus
                      />
                      <div className="habit-color-picker" role="radiogroup" aria-label={t('tasks.projects.colorAria')}>
                        {PROJECT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={editColor === c}
                            className={`habit-color-swatch${editColor === c ? ' active' : ''}`}
                            style={{ background: PROJECT_COLOR_HEX[c] }}
                            onClick={() => setEditColor(c)}
                          />
                        ))}
                      </div>
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
                  ) : (
                    <>
                      <label className="recurring-check">
                        <span className="habit-color-dot" style={{ background: PROJECT_COLOR_HEX[p.color] }} />
                        <span className="recurring-item-title">{p.name}</span>
                      </label>
                      <div className="task-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => startEdit(p)}
                          aria-label={t('tasks.projects.editAria')}
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-danger"
                          onClick={() => handleDelete(p.id)}
                          aria-label={t('tasks.projects.deleteAria')}
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {dialog}
    </div>
  )
}
