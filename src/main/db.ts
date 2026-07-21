import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import initSqlJs, { Database } from 'sql.js'

let db: Database | null = null
let dbPath: string

export async function initDb(): Promise<void> {
  if (db) return

  const SQL = await initSqlJs()
  dbPath = join(app.getPath('userData'), 'gior-app.db')

  const fileBuffer = existsSync(dbPath) ? readFileSync(dbPath) : undefined
  db = new SQL.Database(fileBuffer)

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ingreso', 'gasto')),
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('cumpleanos', 'aniversario', 'otro')),
      notes TEXT NOT NULL DEFAULT ''
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'default',
      pinned INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_goals (
      month TEXT PRIMARY KEY,
      income_goal REAL NOT NULL DEFAULT 0,
      expense_goal REAL NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      prep_minutes INTEGER,
      servings INTEGER,
      steps TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recipe_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('desayuno', 'almuerzo', 'cena', 'snack', 'postre', 'otro'))
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack')),
      recipe_id INTEGER NOT NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT NOT NULL DEFAULT '',
      checked INTEGER NOT NULL DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('ingreso', 'gasto')),
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('diaria', 'semanal', 'personalizada')),
      weekday INTEGER,
      weekdays_mask INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );
  `)

  ensureColumn(db, 'reminders', 'repeats', 'repeats INTEGER NOT NULL DEFAULT 1')

  ensureColumn(db, 'transactions', 'recurring_id', 'recurring_id INTEGER')
  ensureColumn(db, 'transactions', 'currency', "currency TEXT NOT NULL DEFAULT 'COP'")
  ensureColumn(db, 'recurring_transactions', 'currency', "currency TEXT NOT NULL DEFAULT 'COP'")
  ensureColumn(db, 'tasks', 'priority', "priority TEXT NOT NULL DEFAULT 'media'")
  ensureColumn(db, 'tasks', 'recurring_id', 'recurring_id INTEGER')
  ensureColumn(db, 'tasks', 'focused_seconds', 'focused_seconds INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'tasks', 'target_minutes', 'target_minutes INTEGER')

  migrateRecurringTasksFrequencyCheck(db)
  ensureColumn(db, 'recurring_tasks', 'weekdays_mask', 'weekdays_mask INTEGER')

  ensureColumn(db, 'categories', 'icon', 'icon TEXT')
  ensureColumn(db, 'categories', 'color', 'color TEXT')
  ensureColumn(db, 'categories', 'budget', 'budget REAL')

  migrateCategoriesToGlobal(db)
  deduplicateCategoriesCaseInsensitive(db)
  migrateRecipeCategories(db)

  persistDb()
}

function ensureColumn(db: Database, table: string, column: string, definition: string): void {
  const stmt = db.prepare(`PRAGMA table_info(${table})`)
  const columns: string[] = []
  while (stmt.step()) {
    columns.push(stmt.getAsObject().name as string)
  }
  stmt.free()

  if (!columns.includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
}

function migrateRecurringTasksFrequencyCheck(db: Database): void {
  const stmt = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recurring_tasks'")
  const sql = stmt.step() ? (stmt.getAsObject().sql as string) : ''
  stmt.free()

  if (!sql || sql.includes('personalizada')) return

  db.run('ALTER TABLE recurring_tasks RENAME TO recurring_tasks_old')
  db.run(`
    CREATE TABLE recurring_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('diaria', 'semanal', 'personalizada')),
      weekday INTEGER,
      weekdays_mask INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );
  `)
  db.run(`
    INSERT INTO recurring_tasks (id, title, frequency, weekday, active)
    SELECT id, title, frequency, weekday, active FROM recurring_tasks_old
  `)
  db.run('DROP TABLE recurring_tasks_old')
}

function migrateCategoriesToGlobal(db: Database): void {
  const stmt = db.prepare('PRAGMA table_info(categories)')
  const columns: string[] = []
  while (stmt.step()) {
    columns.push(stmt.getAsObject().name as string)
  }
  stmt.free()

  if (!columns.includes('type')) return

  db.run('ALTER TABLE categories RENAME TO categories_old')
  db.run(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
  `)
  db.run('INSERT OR IGNORE INTO categories (name) SELECT DISTINCT name FROM categories_old')
  db.run('DROP TABLE categories_old')
}

const CATEGORIES_DEDUPE_VERSION = '1'

function deduplicateCategoriesCaseInsensitive(db: Database): void {
  const versionStmt = db.prepare('SELECT value FROM settings WHERE key = :key')
  versionStmt.bind({ ':key': 'categories_dedupe_version' })
  const alreadyDone = versionStmt.step()
    ? versionStmt.getAsObject().value === CATEGORIES_DEDUPE_VERSION
    : false
  versionStmt.free()
  if (alreadyDone) return

  const stmt = db.prepare('SELECT name FROM categories ORDER BY id ASC')
  const names: string[] = []
  while (stmt.step()) {
    names.push(stmt.getAsObject().name as string)
  }
  stmt.free()

  const canonicalByLower = new Map<string, string>()
  const renameMap = new Map<string, string>()
  for (const name of names) {
    const key = name.trim().toLowerCase()
    const existing = canonicalByLower.get(key)
    if (existing) {
      if (existing !== name) renameMap.set(name, existing)
    } else {
      canonicalByLower.set(key, name)
    }
  }

  if (renameMap.size > 0) {
    db.run('DROP TABLE categories')
    db.run(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );
    `)
    for (const canonical of canonicalByLower.values()) {
      db.run('INSERT OR IGNORE INTO categories (name) VALUES (:name)', { ':name': canonical })
    }
    for (const [oldName, canonical] of renameMap) {
      db.run('UPDATE transactions SET category = :canonical WHERE category = :old', {
        ':canonical': canonical,
        ':old': oldName
      })
    }
  }

  db.run(
    'INSERT INTO settings (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    { ':key': 'categories_dedupe_version', ':value': CATEGORIES_DEDUPE_VERSION }
  )
}

function migrateRecipeCategories(db: Database): void {
  const stmt = db.prepare('PRAGMA table_info(recipes)')
  const columns: string[] = []
  while (stmt.step()) {
    columns.push(stmt.getAsObject().name as string)
  }
  stmt.free()

  if (!columns.includes('category')) return

  const dataStmt = db.prepare('SELECT id, category FROM recipes')
  const rows: { id: number; category: string }[] = []
  while (dataStmt.step()) {
    const row = dataStmt.getAsObject()
    rows.push({ id: row.id as number, category: row.category as string })
  }
  dataStmt.free()

  for (const row of rows) {
    if (!row.category) continue
    const checkStmt = db.prepare('SELECT 1 FROM recipe_categories WHERE recipe_id = :id AND category = :category')
    checkStmt.bind({ ':id': row.id, ':category': row.category })
    const exists = checkStmt.step()
    checkStmt.free()
    if (!exists) {
      db.run('INSERT INTO recipe_categories (recipe_id, category) VALUES (:id, :category)', {
        ':id': row.id,
        ':category': row.category
      })
    }
  }

  db.run('ALTER TABLE recipes RENAME TO recipes_old')
  db.run(`
    CREATE TABLE recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      prep_minutes INTEGER,
      servings INTEGER,
      steps TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0
    );
  `)
  db.run(`
    INSERT INTO recipes (id, title, prep_minutes, servings, steps, notes, favorite)
    SELECT id, title, prep_minutes, servings, steps, notes, favorite FROM recipes_old
  `)
  db.run('DROP TABLE recipes_old')
}

export function getDb(): Database {
  if (!db) throw new Error('La base de datos no ha sido inicializada.')
  return db
}

export function getDbPath(): string {
  return dbPath
}

export function persistDb(): void {
  if (!db || !dbPath) return
  writeFileSync(dbPath, Buffer.from(db.export()))
}

export function getSetting(key: string): string | undefined {
  const stmt = getDb().prepare('SELECT value FROM settings WHERE key = :key')
  stmt.bind({ ':key': key })
  const value = stmt.step() ? (stmt.getAsObject().value as string) : undefined
  stmt.free()
  return value
}

export function setSetting(key: string, value: string): void {
  getDb().run(
    'INSERT INTO settings (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    { ':key': key, ':value': value }
  )
  persistDb()
}
