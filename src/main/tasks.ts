import { getDb, persistDb } from './db'
import { todayIso } from '../shared/date'
import type {
  NewRecurringTask,
  NewSubtask,
  NewTask,
  RecurringTask,
  Subtask,
  Task,
  TaskPriority,
  UpdateTask
} from '../shared/tasks'

const VALID_PRIORITIES: TaskPriority[] = ['alta', 'media', 'baja']

function normalizeTargetMinutes(value: number | null): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

export function listTasks(date: string): Task[] {
  const db = getDb()
  const stmt = db.prepare(
    `SELECT t.id, t.date, t.title, t.completed, t.priority, t.recurring_id, t.focused_seconds, t.target_minutes,
       (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_total,
       (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.completed = 1) AS subtask_completed
     FROM tasks t WHERE t.date = :date ORDER BY t.id ASC`
  )
  stmt.bind({ ':date': date })

  const rows: Task[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      date: row.date as string,
      title: row.title as string,
      completed: Boolean(row.completed),
      priority: row.priority as TaskPriority,
      recurringId: (row.recurring_id as number | null) ?? null,
      focusedSeconds: row.focused_seconds as number,
      targetMinutes: (row.target_minutes as number | null) ?? null,
      subtaskTotal: row.subtask_total as number,
      subtaskCompleted: row.subtask_completed as number
    })
  }
  stmt.free()
  return rows
}

function insertTask(
  date: string,
  title: string,
  priority: TaskPriority,
  recurringId: number | null,
  targetMinutes: number | null
): void {
  getDb().run(
    'INSERT INTO tasks (date, title, completed, priority, recurring_id, target_minutes) VALUES (:date, :title, 0, :priority, :recurringId, :targetMinutes)',
    {
      ':date': date,
      ':title': title,
      ':priority': priority,
      ':recurringId': recurringId,
      ':targetMinutes': targetMinutes
    }
  )
}

export function addTask(input: NewTask): void {
  const title = input.title.trim()
  if (!title) {
    throw new Error('errors.titleRequired')
  }
  if (!input.date) {
    throw new Error('errors.invalidDate')
  }
  const priority = VALID_PRIORITIES.includes(input.priority) ? input.priority : 'media'

  insertTask(input.date, title, priority, null, normalizeTargetMinutes(input.targetMinutes))
  persistDb()
}

export function updateTask(id: number, input: UpdateTask): void {
  const title = input.title.trim()
  if (!title) {
    throw new Error('errors.titleRequired')
  }
  const priority = VALID_PRIORITIES.includes(input.priority) ? input.priority : 'media'

  getDb().run('UPDATE tasks SET title = :title, priority = :priority, target_minutes = :targetMinutes WHERE id = :id', {
    ':title': title,
    ':priority': priority,
    ':targetMinutes': normalizeTargetMinutes(input.targetMinutes),
    ':id': id
  })
  persistDb()
}

export function toggleTask(id: number): void {
  getDb().run('UPDATE tasks SET completed = NOT completed WHERE id = :id', { ':id': id })
  persistDb()
}

export function deleteTask(id: number): void {
  const db = getDb()
  db.run('DELETE FROM subtasks WHERE task_id = :id', { ':id': id })
  db.run('DELETE FROM tasks WHERE id = :id', { ':id': id })
  persistDb()
}

export function addFocusedSeconds(taskId: number, seconds: number): void {
  if (seconds <= 0) return
  getDb().run('UPDATE tasks SET focused_seconds = focused_seconds + :seconds WHERE id = :id', {
    ':seconds': seconds,
    ':id': taskId
  })
  persistDb()
}

// --- Recurring tasks ---

function encodeWeekdaysMask(weekdays: number[]): number {
  return weekdays.reduce((mask, day) => mask | (1 << day), 0)
}

function decodeWeekdaysMask(mask: number | null): number[] | null {
  if (mask === null) return null
  const weekdays: number[] = []
  for (let day = 0; day <= 6; day++) {
    if (mask & (1 << day)) weekdays.push(day)
  }
  return weekdays
}

export function listRecurringTasks(): RecurringTask[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, title, frequency, weekday, weekdays_mask, active FROM recurring_tasks ORDER BY id ASC'
  )

  const rows: RecurringTask[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      title: row.title as string,
      frequency: row.frequency as RecurringTask['frequency'],
      weekday: (row.weekday as number | null) ?? null,
      weekdays: decodeWeekdaysMask((row.weekdays_mask as number | null) ?? null),
      active: Boolean(row.active)
    })
  }
  stmt.free()
  return rows
}

export function addRecurringTask(input: NewRecurringTask): void {
  const title = input.title.trim()
  if (!title) {
    throw new Error('errors.titleRequired')
  }
  if (input.frequency !== 'diaria' && input.frequency !== 'semanal' && input.frequency !== 'personalizada') {
    throw new Error('errors.invalidFrequency')
  }
  if (input.frequency === 'semanal' && (input.weekday === null || input.weekday < 0 || input.weekday > 6)) {
    throw new Error('errors.weekdayRequired')
  }
  if (input.frequency === 'personalizada' && (!input.weekdays || input.weekdays.length === 0)) {
    throw new Error('errors.weekdaysRequired')
  }

  getDb().run(
    'INSERT INTO recurring_tasks (title, frequency, weekday, weekdays_mask, active) VALUES (:title, :frequency, :weekday, :weekdaysMask, 1)',
    {
      ':title': title,
      ':frequency': input.frequency,
      ':weekday': input.frequency === 'semanal' ? input.weekday : null,
      ':weekdaysMask': input.frequency === 'personalizada' ? encodeWeekdaysMask(input.weekdays!) : null
    }
  )
  persistDb()
}

export function toggleRecurringTask(id: number): void {
  getDb().run('UPDATE recurring_tasks SET active = NOT active WHERE id = :id', { ':id': id })
  persistDb()
}

export function deleteRecurringTask(id: number): void {
  getDb().run('DELETE FROM recurring_tasks WHERE id = :id', { ':id': id })
  persistDb()
}

export function generateDueRecurringTasks(): void {
  const db = getDb()
  const today = todayIso()
  const todayWeekday = new Date(`${today}T00:00:00`).getDay()

  const rules = listRecurringTasks().filter((r) => r.active)
  let generated = false

  for (const rule of rules) {
    const isDue =
      rule.frequency === 'diaria' ||
      (rule.frequency === 'semanal' && rule.weekday === todayWeekday) ||
      (rule.frequency === 'personalizada' && (rule.weekdays?.includes(todayWeekday) ?? false))
    if (!isDue) continue

    const checkStmt = db.prepare('SELECT 1 FROM tasks WHERE recurring_id = :id AND date = :date LIMIT 1')
    checkStmt.bind({ ':id': rule.id, ':date': today })
    const alreadyGenerated = checkStmt.step()
    checkStmt.free()

    if (!alreadyGenerated) {
      insertTask(today, rule.title, 'media', rule.id, null)
      generated = true
    }
  }

  if (generated) persistDb()
}

// --- Subtasks ---

export function listSubtasks(taskId: number): Subtask[] {
  const db = getDb()
  const stmt = db.prepare('SELECT id, task_id, title, completed FROM subtasks WHERE task_id = :taskId ORDER BY id ASC')
  stmt.bind({ ':taskId': taskId })

  const rows: Subtask[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      taskId: row.task_id as number,
      title: row.title as string,
      completed: Boolean(row.completed)
    })
  }
  stmt.free()
  return rows
}

export function addSubtask(input: NewSubtask): void {
  const title = input.title.trim()
  if (!title) {
    throw new Error('errors.titleRequired')
  }

  getDb().run('INSERT INTO subtasks (task_id, title, completed) VALUES (:taskId, :title, 0)', {
    ':taskId': input.taskId,
    ':title': title
  })
  persistDb()
}

export function updateSubtask(id: number, title: string): void {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('errors.titleRequired')
  }

  getDb().run('UPDATE subtasks SET title = :title WHERE id = :id', { ':title': trimmed, ':id': id })
  persistDb()
}

export function toggleSubtask(id: number): void {
  getDb().run('UPDATE subtasks SET completed = NOT completed WHERE id = :id', { ':id': id })
  persistDb()
}

export function deleteSubtask(id: number): void {
  getDb().run('DELETE FROM subtasks WHERE id = :id', { ':id': id })
  persistDb()
}
