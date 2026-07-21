import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { playTaskCompleteSound } from '../../lib/sound'
import type { Subtask } from '../../../../shared/tasks'

export default function Subtasks({
  taskId,
  onChange
}: {
  taskId: number
  onChange: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [items, setItems] = useState<Subtask[]>([])
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    load()
  }, [taskId])

  async function load(): Promise<void> {
    const rows = await window.api.subtasks.list(taskId)
    setItems(rows)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    await window.api.subtasks.add({ taskId, title: trimmed })
    setTitle('')
    await load()
    onChange()
  }

  async function handleToggle(s: Subtask): Promise<void> {
    if (!s.completed) playTaskCompleteSound()
    await window.api.subtasks.toggle(s.id)
    await load()
    onChange()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.subtasks.remove(id)
    await load()
    onChange()
  }

  function startEdit(s: Subtask): void {
    setEditingId(s.id)
    setEditTitle(s.title)
  }

  function cancelEdit(): void {
    setEditingId(null)
  }

  async function handleEditSubmit(e: FormEvent, id: number): Promise<void> {
    e.preventDefault()
    const trimmed = editTitle.trim()
    if (!trimmed) return

    await window.api.subtasks.update(id, trimmed)
    setEditingId(null)
    await load()
    onChange()
  }

  return (
    <div className="subtasks">
      {items.length > 0 && (
        <ul className="subtasks-list">
          {items.map((s) => {
            if (editingId === s.id) {
              return (
                <li key={s.id} className="subtask-item subtask-item-editing">
                  <form className="subtask-edit-form" onSubmit={(e) => handleEditSubmit(e, s.id)}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                    />
                    <button type="submit" className="icon-button icon-button-save" aria-label={t('common.save')}>
                      <Check size={13} strokeWidth={2} />
                    </button>
                    <button type="button" className="icon-button" onClick={cancelEdit} aria-label={t('common.cancel')}>
                      <X size={13} strokeWidth={1.75} />
                    </button>
                  </form>
                </li>
              )
            }

            return (
              <li key={s.id} className={s.completed ? 'subtask-item completed' : 'subtask-item'}>
                <label className="subtask-checkbox">
                  <input type="checkbox" checked={s.completed} onChange={() => handleToggle(s)} />
                  <span className="subtask-checkmark" />
                  <span className="subtask-title">{s.title}</span>
                </label>
                <div className="subtask-actions">
                  <button
                    type="button"
                    className="icon-button subtask-edit"
                    onClick={() => startEdit(s)}
                    aria-label={t('tasks.subtasks.editAria')}
                  >
                    <Pencil size={12} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-danger subtask-delete"
                    onClick={() => handleDelete(s.id)}
                    aria-label={t('tasks.subtasks.deleteAria')}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <form className="subtask-form" onSubmit={handleSubmit}>
        <Plus size={13} strokeWidth={2} />
        <input
          type="text"
          placeholder={t('tasks.subtasks.addPlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </form>
    </div>
  )
}
