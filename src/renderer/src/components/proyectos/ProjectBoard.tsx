import { DragEvent, FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PROJECT_COLOR_HEX } from '../../../../shared/projects'
import { BOARD_STATUSES } from '../../../../shared/boards'
import type { BoardProject, BoardStatus, BoardTask, NewBoardTask } from '../../../../shared/boards'
import { useConfirm } from '../../lib/useConfirm'

interface Props {
  project: BoardProject
  onBack: () => void
  onProjectChanged: () => void
}

export default function ProjectBoard({ project, onBack, onProjectChanged }: Props): JSX.Element {
  const { t } = useTranslation()
  const { confirm, dialog } = useConfirm()

  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [dragOverStatus, setDragOverStatus] = useState<BoardStatus | null>(null)

  const STATUS_LABEL: Record<BoardStatus, string> = {
    todo: t('proyectos.status.todo'),
    in_progress: t('proyectos.status.inProgress'),
    done: t('proyectos.status.done')
  }

  useEffect(() => {
    load()
  }, [project.id])

  async function load(): Promise<void> {
    setLoading(true)
    setTasks(await window.api.boardTasks.list(project.id))
    setLoading(false)
  }

  async function handleAdd(e: FormEvent): Promise<void> {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return

    const input: NewBoardTask = { boardProjectId: project.id, title }
    await window.api.boardTasks.add(input)
    setNewTitle('')
    await load()
    onProjectChanged()
  }

  function startEdit(task: BoardTask): void {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  async function commitEdit(): Promise<void> {
    if (editingId === null) return
    const title = editingTitle.trim()
    const id = editingId
    setEditingId(null)
    if (!title) return
    await window.api.boardTasks.update(id, { title })
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    if (!(await confirm(t('proyectos.deleteTaskConfirm')))) return
    await window.api.boardTasks.remove(id)
    await load()
    onProjectChanged()
  }

  async function moveTask(id: number, status: BoardStatus, targetIndex: number): Promise<void> {
    await window.api.boardTasks.move(id, status, targetIndex)
    await load()
    onProjectChanged()
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, status: BoardStatus, targetIndex: number): void {
    e.preventDefault()
    e.stopPropagation()
    setDragOverStatus(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isFinite(id)) return
    moveTask(id, status, targetIndex)
  }

  const columns: Record<BoardStatus, BoardTask[]> = { todo: [], in_progress: [], done: [] }
  for (const task of tasks) columns[task.status].push(task)
  for (const status of BOARD_STATUSES) columns[status].sort((a, b) => a.position - b.position)

  return (
    <div className="habitos-page">
      <div className="habitos-header">
        <div className="proyecto-board-title">
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('proyectos.backAria')}>
            <ArrowLeft size={17} strokeWidth={1.75} />
          </button>
          <span className="habit-color-dot" style={{ background: PROJECT_COLOR_HEX[project.color] }} />
          <h1>{project.name}</h1>
        </div>
      </div>

      <form className="proyecto-add-task" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t('proyectos.newTaskPlaceholder')}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className="icon-button-primary" aria-label={t('proyectos.addTaskAria')}>
          <Plus size={16} strokeWidth={2} />
        </button>
      </form>

      {loading ? (
        <p className="tasks-loading">{t('common.loading')}</p>
      ) : (
        <div className="proyecto-board">
          {BOARD_STATUSES.map((status) => (
            <div
              key={status}
              className={`proyecto-column${dragOverStatus === status ? ' drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverStatus(status)
              }}
              onDragLeave={() => setDragOverStatus((current) => (current === status ? null : current))}
              onDrop={(e) => handleDrop(e, status, columns[status].length)}
            >
              <div className="proyecto-column-header">
                <span>{STATUS_LABEL[status]}</span>
                <span className="proyecto-column-count">{columns[status].length}</span>
              </div>
              <div className="proyecto-column-body">
                {columns[status].length === 0 && (
                  <p className="proyecto-column-empty">{t('proyectos.columnEmpty')}</p>
                )}
                {columns[status].map((task, index) => (
                  <div
                    key={task.id}
                    className="proyecto-task-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragOverStatus(status)
                    }}
                    onDrop={(e) => handleDrop(e, status, index)}
                  >
                    {editingId === task.id ? (
                      <input
                        type="text"
                        className="proyecto-task-edit-input"
                        value={editingTitle}
                        autoFocus
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : (
                      <span className="proyecto-task-title" onClick={() => startEdit(task)}>
                        {task.title}
                      </span>
                    )}
                    <div className="proyecto-task-actions">
                      <button
                        type="button"
                        className="icon-button icon-button-danger"
                        onClick={() => handleDelete(task.id)}
                        aria-label={t('proyectos.deleteTaskAria')}
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  )
}
