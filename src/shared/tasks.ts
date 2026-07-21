export type TaskPriority = 'alta' | 'media' | 'baja'

export interface Task {
  id: number
  date: string
  title: string
  completed: boolean
  priority: TaskPriority
  recurringId: number | null
  focusedSeconds: number
  targetMinutes: number | null
  subtaskTotal: number
  subtaskCompleted: number
}

export interface NewTask {
  date: string
  title: string
  priority: TaskPriority
  targetMinutes: number | null
}

export interface UpdateTask {
  title: string
  priority: TaskPriority
  targetMinutes: number | null
}

export interface Subtask {
  id: number
  taskId: number
  title: string
  completed: boolean
}

export interface NewSubtask {
  taskId: number
  title: string
}

export type RecurringTaskFrequency = 'diaria' | 'semanal' | 'personalizada'

export interface RecurringTask {
  id: number
  title: string
  frequency: RecurringTaskFrequency
  weekday: number | null
  weekdays: number[] | null
  active: boolean
}

export interface NewRecurringTask {
  title: string
  frequency: RecurringTaskFrequency
  weekday: number | null
  weekdays: number[] | null
}
