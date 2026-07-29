import { getDb, persistDb } from './db'
import type { NewProject, Project, ProjectColor, UpdateProject } from '../shared/projects'

const VALID_COLORS: ProjectColor[] = ['rose', 'amber', 'emerald', 'sky', 'violet']

function validate(input: { name: string; color: ProjectColor }): string {
  if (!input.name.trim()) return 'errors.titleRequired'
  if (!VALID_COLORS.includes(input.color)) return 'errors.invalidColor'
  return ''
}

export function listProjects(): Project[] {
  const db = getDb()
  const stmt = db.prepare('SELECT id, name, color FROM projects ORDER BY name ASC')

  const rows: Project[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      name: row.name as string,
      color: row.color as ProjectColor
    })
  }
  stmt.free()
  return rows
}

export function addProject(input: NewProject): number {
  const error = validate(input)
  if (error) throw new Error(error)

  const db = getDb()
  try {
    db.run('INSERT INTO projects (name, color) VALUES (:name, :color)', {
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

export function updateProject(id: number, input: UpdateProject): void {
  const error = validate(input)
  if (error) throw new Error(error)

  const db = getDb()
  try {
    db.run('UPDATE projects SET name = :name, color = :color WHERE id = :id', {
      ':name': input.name.trim(),
      ':color': input.color,
      ':id': id
    })
  } catch {
    throw new Error('errors.projectAlreadyExists')
  }
  persistDb()
}

export function deleteProject(id: number): void {
  const db = getDb()
  db.run('UPDATE tasks SET project_id = NULL WHERE project_id = :id', { ':id': id })
  db.run('DELETE FROM projects WHERE id = :id', { ':id': id })
  persistDb()
}
