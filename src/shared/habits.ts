import { toLocalIso } from './date'

export type HabitFrequency = 'diaria' | 'semanal' | 'personalizada'
export type HabitColor = 'rose' | 'amber' | 'emerald' | 'sky' | 'violet'

export interface Habit {
  id: number
  title: string
  color: HabitColor
  frequency: HabitFrequency
  weekday: number | null
  weekdays: number[] | null
  active: boolean
}

export interface NewHabit {
  title: string
  color: HabitColor
  frequency: HabitFrequency
  weekday: number | null
  weekdays: number[] | null
}

export type UpdateHabit = NewHabit

export interface HabitLog {
  habitId: number
  date: string
  completed: boolean
}

export const HABIT_COLORS: HabitColor[] = ['rose', 'amber', 'emerald', 'sky', 'violet']

export const HABIT_COLOR_HEX: Record<HabitColor, string> = {
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
  violet: '#8b5cf6'
}

interface HabitSchedule {
  frequency: HabitFrequency
  weekday: number | null
  weekdays: number[] | null
}

export function isScheduledOn(habit: HabitSchedule, date: Date): boolean {
  const weekday = date.getDay()
  if (habit.frequency === 'diaria') return true
  if (habit.frequency === 'semanal') return habit.weekday === weekday
  return habit.weekdays?.includes(weekday) ?? false
}

export function computeStreak(habit: HabitSchedule, completedDates: Set<string>, from: Date = new Date()): number {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())

  if (isScheduledOn(habit, cursor) && !completedDates.has(toLocalIso(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  const maxLookback = 3650
  for (let i = 0; i < maxLookback; i++) {
    if (isScheduledOn(habit, cursor)) {
      if (completedDates.has(toLocalIso(cursor))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    } else {
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return streak
}
