import { existsSync, readFileSync, writeFileSync } from 'fs'
import initSqlJs from 'sql.js'
import { getDb, getDbPath, persistDb } from './db'

const JSON_BACKUP_VERSION = 1

interface JsonBackup {
  version: number
  exportedAt: string
  tables: Record<string, Record<string, unknown>[]>
}

function isSafeIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}

function backupDateSuffix(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function backupFileName(): string {
  return `gior-app-backup-${backupDateSuffix()}.db`
}

export function jsonBackupFileName(): string {
  return `gior-app-backup-${backupDateSuffix()}.json`
}

export function exportBackupTo(destPath: string): void {
  persistDb()
  writeFileSync(destPath, Buffer.from(getDb().export()))
}

async function isValidBackupFile(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) return false
  try {
    const SQL = await initSqlJs()
    const candidate = new SQL.Database(readFileSync(filePath))
    const stmt = candidate.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'settings'")
    const hasSettingsTable = stmt.step()
    stmt.free()
    candidate.close()
    return hasSettingsTable
  } catch {
    return false
  }
}

export async function restoreBackupFrom(filePath: string): Promise<{ ok: boolean; error?: string }> {
  const valid = await isValidBackupFile(filePath)
  if (!valid) {
    return { ok: false, error: 'errors.invalidBackupFile' }
  }

  writeFileSync(getDbPath(), readFileSync(filePath))
  return { ok: true }
}

function buildJsonBackup(): JsonBackup {
  const db = getDb()
  const tableNamesStmt = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  )
  const tableNames: string[] = []
  while (tableNamesStmt.step()) {
    tableNames.push(tableNamesStmt.getAsObject().name as string)
  }
  tableNamesStmt.free()

  const tables: Record<string, Record<string, unknown>[]> = {}
  for (const name of tableNames) {
    const stmt = db.prepare(`SELECT * FROM ${name}`)
    const rows: Record<string, unknown>[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    tables[name] = rows
  }

  return { version: JSON_BACKUP_VERSION, exportedAt: new Date().toISOString(), tables }
}

export function exportJsonBackupTo(destPath: string): void {
  persistDb()
  writeFileSync(destPath, JSON.stringify(buildJsonBackup(), null, 2), 'utf8')
}

function isValidJsonBackup(data: unknown): data is JsonBackup {
  if (!data || typeof data !== 'object') return false
  const candidate = data as Partial<JsonBackup>
  return (
    typeof candidate.tables === 'object' &&
    candidate.tables !== null &&
    'settings' in candidate.tables &&
    'transactions' in candidate.tables
  )
}

function applyJsonBackup(data: JsonBackup): void {
  const db = getDb()
  db.run('BEGIN TRANSACTION')
  try {
    for (const [table, rows] of Object.entries(data.tables)) {
      if (!isSafeIdentifier(table)) continue

      db.run(`DELETE FROM ${table}`)
      for (const row of rows) {
        const columns = Object.keys(row).filter(isSafeIdentifier)
        if (columns.length === 0) continue

        const placeholders = columns.map((c) => `:${c}`).join(', ')
        const params: Record<string, string | number | Uint8Array | null> = {}
        for (const c of columns) {
          const value = row[c]
          params[`:${c}`] =
            typeof value === 'string' || typeof value === 'number' || value === null ? value : String(value)
        }
        db.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, params)
      }
    }
    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
  persistDb()
}

export function restoreJsonBackupFrom(filePath: string): { ok: boolean; error?: string } {
  if (!existsSync(filePath)) {
    return { ok: false, error: 'errors.invalidBackupFile' }
  }

  let data: unknown
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return { ok: false, error: 'errors.invalidBackupFile' }
  }

  if (!isValidJsonBackup(data)) {
    return { ok: false, error: 'errors.invalidBackupFile' }
  }

  try {
    applyJsonBackup(data)
    return { ok: true }
  } catch {
    return { ok: false, error: 'errors.generic' }
  }
}
