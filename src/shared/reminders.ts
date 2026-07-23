export type ReminderType = 'cumpleanos' | 'aniversario' | 'pago' | 'otro'

export interface Reminder {
  id: number
  title: string
  month: number
  day: number
  type: ReminderType
  notes: string
  repeats: boolean
}

export interface NewReminder {
  title: string
  month: number
  day: number
  type: ReminderType
  notes: string
  repeats: boolean
}

export type UpdateReminder = NewReminder

export function monthName(month: number, locale: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(locale, { month: 'long' })
}

export function weekdayName(dayOfWeek: number, locale: string): string {
  return new Date(2000, 0, 2 + dayOfWeek).toLocaleDateString(locale, { weekday: 'long' })
}

export function weekdayAbbr(dayOfWeek: number, locale: string): string {
  return new Date(2000, 0, 2 + dayOfWeek)
    .toLocaleDateString(locale, { weekday: 'short' })
    .replace('.', '')
    .toUpperCase()
}

export function daysInMonth(month: number): number {
  if (month === 2) return 29
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function occurrenceDateInYear(month: number, day: number, year: number): Date {
  if (month === 2 && day === 29 && !isLeapYear(year)) return new Date(year, 1, 28)
  return new Date(year, month - 1, day)
}

export function nextOccurrenceDate(month: number, day: number, from: Date = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let target = occurrenceDateInYear(month, day, from.getFullYear())
  if (target < today) target = occurrenceDateInYear(month, day, from.getFullYear() + 1)
  return target
}

export function daysUntilNext(month: number, day: number, from: Date = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const target = nextOccurrenceDate(month, day, from)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface ReminderOccurrenceInput {
  month: number
  day: number
  repeats: boolean
}

/** For non-repeating reminders, the occurrence stays put in the year it was created for instead of rolling forward. */
export function reminderOccurrenceDate(reminder: ReminderOccurrenceInput, from: Date = new Date()): Date {
  if (!reminder.repeats) return occurrenceDateInYear(reminder.month, reminder.day, from.getFullYear())
  return nextOccurrenceDate(reminder.month, reminder.day, from)
}

export function isReminderPast(reminder: ReminderOccurrenceInput, from: Date = new Date()): boolean {
  if (reminder.repeats) return false
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return occurrenceDateInYear(reminder.month, reminder.day, from.getFullYear()) < today
}

export function daysUntilReminder(reminder: ReminderOccurrenceInput, from: Date = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const target = reminderOccurrenceDate(reminder, from)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const URL_PATTERN = /https?:\/\/\S+/

export function extractUrl(notes: string): string | null {
  return URL_PATTERN.exec(notes)?.[0] ?? null
}
