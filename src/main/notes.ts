import { getDb, persistDb } from './db'
import { noteHasContent } from '../shared/notes'
import type { NewNote, Note, NoteColor, UpdateNote } from '../shared/notes'

const VALID_COLORS: NoteColor[] = ['default', 'rose', 'amber', 'emerald', 'sky', 'violet', 'slate']

function validate(input: { title: string; content: string; color: NoteColor }): string {
  if (!noteHasContent(input)) return 'errors.emptyNote'
  if (!VALID_COLORS.includes(input.color)) return 'errors.invalidColor'
  return ''
}

export function listNotes(): Note[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, title, content, color, pinned, archived, created_at, updated_at FROM notes ORDER BY updated_at DESC'
  )

  const rows: Note[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      title: row.title as string,
      content: row.content as string,
      color: row.color as NoteColor,
      pinned: Boolean(row.pinned),
      archived: Boolean(row.archived),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    })
  }
  stmt.free()
  return rows
}

export function addNote(input: NewNote): number {
  const error = validate(input)
  if (error) throw new Error(error)

  const db = getDb()
  const now = new Date().toISOString()
  db.run(
    'INSERT INTO notes (title, content, color, pinned, archived, created_at, updated_at) VALUES (:title, :content, :color, 0, 0, :now, :now)',
    {
      ':title': input.title.trim(),
      ':content': input.content.trim(),
      ':color': input.color,
      ':now': now
    }
  )
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
  persistDb()
  return id
}

export function updateNote(id: number, input: UpdateNote): void {
  const error = validate(input)
  if (error) throw new Error(error)

  getDb().run(
    'UPDATE notes SET title = :title, content = :content, color = :color, updated_at = :now WHERE id = :id',
    {
      ':title': input.title.trim(),
      ':content': input.content.trim(),
      ':color': input.color,
      ':now': new Date().toISOString(),
      ':id': id
    }
  )
  persistDb()
}

export function togglePinNote(id: number): void {
  getDb().run('UPDATE notes SET pinned = 1 - pinned WHERE id = :id', { ':id': id })
  persistDb()
}

export function toggleArchiveNote(id: number): void {
  getDb().run('UPDATE notes SET archived = 1 - archived WHERE id = :id', { ':id': id })
  persistDb()
}

export function deleteNote(id: number): void {
  getDb().run('DELETE FROM notes WHERE id = :id', { ':id': id })
  persistDb()
}
