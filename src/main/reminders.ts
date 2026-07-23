import { getDb, persistDb } from './db'
import { daysInMonth } from '../shared/reminders'
import type { NewReminder, Reminder, ReminderType, UpdateReminder } from '../shared/reminders'

const VALID_TYPES: ReminderType[] = ['cumpleanos', 'aniversario', 'pago', 'otro']

function validate(input: { title: string; month: number; day: number; type: ReminderType }): string {
  if (!input.title.trim()) return 'errors.titleRequired'
  if (!VALID_TYPES.includes(input.type)) return 'errors.invalidType'
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) return 'errors.invalidMonth'
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > daysInMonth(input.month)) {
    return 'errors.invalidDay'
  }
  return ''
}

export function listReminders(): Reminder[] {
  const db = getDb()
  const stmt = db.prepare('SELECT id, title, month, day, type, notes, repeats FROM reminders ORDER BY id ASC')

  const rows: Reminder[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      title: row.title as string,
      month: row.month as number,
      day: row.day as number,
      type: row.type as ReminderType,
      notes: row.notes as string,
      repeats: Boolean(row.repeats)
    })
  }
  stmt.free()
  return rows
}

export function addReminder(input: NewReminder): void {
  const error = validate(input)
  if (error) throw new Error(error)

  getDb().run(
    'INSERT INTO reminders (title, month, day, type, notes, repeats) VALUES (:title, :month, :day, :type, :notes, :repeats)',
    {
      ':title': input.title.trim(),
      ':month': input.month,
      ':day': input.day,
      ':type': input.type,
      ':notes': input.notes.trim(),
      ':repeats': input.repeats ? 1 : 0
    }
  )
  persistDb()
}

export function updateReminder(id: number, input: UpdateReminder): void {
  const error = validate(input)
  if (error) throw new Error(error)

  getDb().run(
    'UPDATE reminders SET title = :title, month = :month, day = :day, type = :type, notes = :notes, repeats = :repeats WHERE id = :id',
    {
      ':title': input.title.trim(),
      ':month': input.month,
      ':day': input.day,
      ':type': input.type,
      ':notes': input.notes.trim(),
      ':repeats': input.repeats ? 1 : 0,
      ':id': id
    }
  )
  persistDb()
}

export function deleteReminder(id: number): void {
  getDb().run('DELETE FROM reminders WHERE id = :id', { ':id': id })
  persistDb()
}
