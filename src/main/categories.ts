import { getDb, persistDb } from './db'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../shared/ledger'
import type { Category, NewCategory, UpdateCategory } from '../shared/ledger'

const DEFAULT_CATEGORIES = [
  'Sueldo',
  'Freelance',
  'Ventas',
  'Comida',
  'Arriendo',
  'Transporte',
  'Servicios',
  'Salud',
  'Entretenimiento',
  'Otro'
]

export function ensureDefaultCategories(): void {
  const db = getDb()
  const stmt = db.prepare('SELECT COUNT(*) as count FROM categories')
  stmt.step()
  const { count } = stmt.getAsObject() as { count: number }
  stmt.free()

  if (count > 0) return

  for (const name of DEFAULT_CATEGORIES) {
    upsertCategory(name)
  }
  persistDb()
}

export function listCategories(): Category[] {
  const db = getDb()
  const stmt = db.prepare('SELECT id, name, icon, color, budget FROM categories ORDER BY name ASC')

  const rows: Category[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      name: row.name as string,
      icon: (row.icon as string | null) ?? null,
      color: (row.color as string | null) ?? null,
      budget: (row.budget as number | null) ?? null
    })
  }
  stmt.free()
  return rows
}

export function upsertCategory(name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return

  getDb().run('INSERT OR IGNORE INTO categories (name) VALUES (:name)', {
    ':name': trimmed
  })
}

function validateCategoryInput(input: {
  name: string
  icon: string | null
  color: string | null
  budget: number | null
}): string {
  if (!input.name.trim()) return 'errors.categoryRequired'
  if (input.icon !== null && !(CATEGORY_ICONS as readonly string[]).includes(input.icon)) return 'errors.invalidCategory'
  if (input.color !== null && !(CATEGORY_COLORS as readonly string[]).includes(input.color)) return 'errors.invalidCategory'
  if (input.budget !== null && (!Number.isFinite(input.budget) || input.budget < 0)) return 'errors.invalidBudget'
  return ''
}

export function addCategory(input: NewCategory): number {
  const error = validateCategoryInput(input)
  if (error) throw new Error(error)

  const db = getDb()
  try {
    db.run('INSERT INTO categories (name, icon, color, budget) VALUES (:name, :icon, :color, :budget)', {
      ':name': input.name.trim(),
      ':icon': input.icon,
      ':color': input.color,
      ':budget': input.budget
    })
  } catch {
    throw new Error('errors.categoryAlreadyExists')
  }
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
  persistDb()
  return id
}

export function updateCategory(id: number, input: UpdateCategory): void {
  const error = validateCategoryInput(input)
  if (error) throw new Error(error)

  const db = getDb()
  const currentStmt = db.prepare('SELECT name FROM categories WHERE id = :id')
  currentStmt.bind({ ':id': id })
  const previousName = currentStmt.step() ? (currentStmt.getAsObject().name as string) : null
  currentStmt.free()

  const trimmedName = input.name.trim()

  try {
    db.run('UPDATE categories SET name = :name, icon = :icon, color = :color, budget = :budget WHERE id = :id', {
      ':name': trimmedName,
      ':icon': input.icon,
      ':color': input.color,
      ':budget': input.budget,
      ':id': id
    })
  } catch {
    throw new Error('errors.categoryAlreadyExists')
  }

  if (previousName !== null && previousName.toLowerCase() !== trimmedName.toLowerCase()) {
    db.run('UPDATE transactions SET category = :name WHERE category = :old', {
      ':name': trimmedName,
      ':old': previousName
    })
    db.run('UPDATE recurring_transactions SET category = :name WHERE category = :old', {
      ':name': trimmedName,
      ':old': previousName
    })
  }

  persistDb()
}

export function deleteCategory(id: number): void {
  getDb().run('DELETE FROM categories WHERE id = :id', { ':id': id })
  persistDb()
}
