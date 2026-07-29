import { getDb, persistDb } from './db'
import type { Habit, HabitColor, HabitFrequency, HabitLog, NewHabit, UpdateHabit } from '../shared/habits'

const VALID_COLORS: HabitColor[] = ['rose', 'amber', 'emerald', 'sky', 'violet']
const VALID_FREQUENCIES: HabitFrequency[] = ['diaria', 'semanal', 'personalizada']

function validate(input: { title: string; color: HabitColor; frequency: HabitFrequency }): string {
  if (!input.title.trim()) return 'errors.titleRequired'
  if (!VALID_COLORS.includes(input.color)) return 'errors.invalidColor'
  if (!VALID_FREQUENCIES.includes(input.frequency)) return 'errors.invalidFrequency'
  return ''
}

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

export function listHabits(): Habit[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, title, color, frequency, weekday, weekdays_mask, active FROM habits ORDER BY id ASC'
  )

  const rows: Habit[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      title: row.title as string,
      color: row.color as HabitColor,
      frequency: row.frequency as HabitFrequency,
      weekday: row.weekday as number | null,
      weekdays: decodeWeekdaysMask((row.weekdays_mask as number | null) ?? null),
      active: Boolean(row.active)
    })
  }
  stmt.free()
  return rows
}

export function addHabit(input: NewHabit): number {
  const error = validate(input)
  if (error) throw new Error(error)

  const db = getDb()
  db.run(
    'INSERT INTO habits (title, color, frequency, weekday, weekdays_mask, active) VALUES (:title, :color, :frequency, :weekday, :weekdaysMask, 1)',
    {
      ':title': input.title.trim(),
      ':color': input.color,
      ':frequency': input.frequency,
      ':weekday': input.frequency === 'semanal' ? input.weekday : null,
      ':weekdaysMask': input.frequency === 'personalizada' ? encodeWeekdaysMask(input.weekdays ?? []) : null
    }
  )
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
  persistDb()
  return id
}

export function updateHabit(id: number, input: UpdateHabit): void {
  const error = validate(input)
  if (error) throw new Error(error)

  getDb().run(
    'UPDATE habits SET title = :title, color = :color, frequency = :frequency, weekday = :weekday, weekdays_mask = :weekdaysMask WHERE id = :id',
    {
      ':title': input.title.trim(),
      ':color': input.color,
      ':frequency': input.frequency,
      ':weekday': input.frequency === 'semanal' ? input.weekday : null,
      ':weekdaysMask': input.frequency === 'personalizada' ? encodeWeekdaysMask(input.weekdays ?? []) : null,
      ':id': id
    }
  )
  persistDb()
}

export function deleteHabit(id: number): void {
  const db = getDb()
  db.run('DELETE FROM habits WHERE id = :id', { ':id': id })
  db.run('DELETE FROM habit_logs WHERE habit_id = :id', { ':id': id })
  persistDb()
}

export function toggleHabitLog(habitId: number, date: string): boolean {
  const db = getDb()
  const stmt = db.prepare('SELECT id FROM habit_logs WHERE habit_id = :habitId AND date = :date LIMIT 1')
  stmt.bind({ ':habitId': habitId, ':date': date })
  const exists = stmt.step()
  stmt.free()

  if (exists) {
    db.run('DELETE FROM habit_logs WHERE habit_id = :habitId AND date = :date', {
      ':habitId': habitId,
      ':date': date
    })
    persistDb()
    return false
  }

  db.run('INSERT INTO habit_logs (habit_id, date, completed) VALUES (:habitId, :date, 1)', {
    ':habitId': habitId,
    ':date': date
  })
  persistDb()
  return true
}

export function listHabitLogsSince(since: string): HabitLog[] {
  const db = getDb()
  const stmt = db.prepare('SELECT habit_id, date, completed FROM habit_logs WHERE date >= :since ORDER BY date ASC')
  stmt.bind({ ':since': since })

  const rows: HabitLog[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      habitId: row.habit_id as number,
      date: row.date as string,
      completed: Boolean(row.completed)
    })
  }
  stmt.free()
  return rows
}
