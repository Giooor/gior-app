import { getDb, persistDb } from './db'
import { PROJECT_COLORS } from '../shared/projects'
import type { ProjectColor } from '../shared/projects'
import type {
  BoardProject,
  BoardStatus,
  BoardTask,
  NewBoardProject,
  NewBoardTask,
  UpdateBoardProject,
  UpdateBoardTask
} from '../shared/boards'
import { BOARD_STATUSES } from '../shared/boards'

function validateProject(input: { name: string; color: ProjectColor }): string {
  if (!input.name.trim()) return 'errors.titleRequired'
  if (!PROJECT_COLORS.includes(input.color)) return 'errors.invalidColor'
  return ''
}

export function listBoardProjects(): BoardProject[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT p.id, p.name, p.color,
      (SELECT COUNT(*) FROM board_tasks t WHERE t.board_project_id = p.id) AS task_total,
      (SELECT COUNT(*) FROM board_tasks t WHERE t.board_project_id = p.id AND t.status = 'done') AS task_done
    FROM board_projects p
    ORDER BY p.name ASC
  `)

  const rows: BoardProject[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      name: row.name as string,
      color: row.color as ProjectColor,
      taskTotal: row.task_total as number,
      taskDone: row.task_done as number
    })
  }
  stmt.free()
  return rows
}

export function addBoardProject(input: NewBoardProject): number {
  const error = validateProject(input)
  if (error) throw new Error(error)

  const db = getDb()
  try {
    db.run('INSERT INTO board_projects (name, color) VALUES (:name, :color)', {
      ':name': input.name.trim(),
      ':color': input.color
    })
  } catch {
    throw new Error('errors.projectAlreadyExists')
  }
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
  persistDb()
  return id
}

export function updateBoardProject(id: number, input: UpdateBoardProject): void {
  const error = validateProject(input)
  if (error) throw new Error(error)

  const db = getDb()
  try {
    db.run('UPDATE board_projects SET name = :name, color = :color WHERE id = :id', {
      ':name': input.name.trim(),
      ':color': input.color,
      ':id': id
    })
  } catch {
    throw new Error('errors.projectAlreadyExists')
  }
  persistDb()
}

export function deleteBoardProject(id: number): void {
  const db = getDb()
  db.run('DELETE FROM board_tasks WHERE board_project_id = :id', { ':id': id })
  db.run('DELETE FROM board_projects WHERE id = :id', { ':id': id })
  persistDb()
}

export function listBoardTasks(boardProjectId: number): BoardTask[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, board_project_id, title, status, position FROM board_tasks WHERE board_project_id = :pid ORDER BY position ASC'
  )
  stmt.bind({ ':pid': boardProjectId })

  const rows: BoardTask[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      boardProjectId: row.board_project_id as number,
      title: row.title as string,
      status: row.status as BoardStatus,
      position: row.position as number
    })
  }
  stmt.free()
  return rows
}

export function addBoardTask(input: NewBoardTask): void {
  const title = input.title.trim()
  if (!title) throw new Error('errors.titleRequired')

  const db = getDb()
  const maxStmt = db.prepare(
    "SELECT COALESCE(MAX(position), -1) AS maxPos FROM board_tasks WHERE board_project_id = :pid AND status = 'todo'"
  )
  maxStmt.bind({ ':pid': input.boardProjectId })
  const maxPos = maxStmt.step() ? (maxStmt.getAsObject().maxPos as number) : -1
  maxStmt.free()

  db.run(
    "INSERT INTO board_tasks (board_project_id, title, status, position) VALUES (:pid, :title, 'todo', :position)",
    {
      ':pid': input.boardProjectId,
      ':title': title,
      ':position': maxPos + 1
    }
  )
  persistDb()
}

export function updateBoardTask(id: number, input: UpdateBoardTask): void {
  const title = input.title.trim()
  if (!title) throw new Error('errors.titleRequired')

  getDb().run('UPDATE board_tasks SET title = :title WHERE id = :id', { ':title': title, ':id': id })
  persistDb()
}

export function deleteBoardTask(id: number): void {
  getDb().run('DELETE FROM board_tasks WHERE id = :id', { ':id': id })
  persistDb()
}

export function moveBoardTask(id: number, status: BoardStatus, targetIndex: number): void {
  if (!BOARD_STATUSES.includes(status)) throw new Error('errors.generic')

  const db = getDb()
  const taskStmt = db.prepare('SELECT board_project_id FROM board_tasks WHERE id = :id')
  taskStmt.bind({ ':id': id })
  const projectId = taskStmt.step() ? (taskStmt.getAsObject().board_project_id as number) : null
  taskStmt.free()
  if (projectId === null) return

  const listStmt = db.prepare(
    'SELECT id FROM board_tasks WHERE board_project_id = :pid AND status = :status AND id != :id ORDER BY position ASC'
  )
  listStmt.bind({ ':pid': projectId, ':status': status, ':id': id })
  const ids: number[] = []
  while (listStmt.step()) ids.push(listStmt.getAsObject().id as number)
  listStmt.free()

  const clamped = Math.max(0, Math.min(targetIndex, ids.length))
  ids.splice(clamped, 0, id)

  ids.forEach((taskId, index) => {
    db.run('UPDATE board_tasks SET status = :status, position = :position WHERE id = :id', {
      ':status': status,
      ':position': index,
      ':id': taskId
    })
  })
  persistDb()
}
