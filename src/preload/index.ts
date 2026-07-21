import { contextBridge, ipcRenderer } from 'electron'
import type {
  Category,
  MonthlyGoal,
  NewCategory,
  NewRecurringTransaction,
  NewTransaction,
  RecurringTransaction,
  ReportPeriod,
  Transaction,
  UpdateCategory,
  UpdateTransaction
} from '../shared/ledger'
import type { NewRecurringTask, NewSubtask, NewTask, RecurringTask, Subtask, Task, UpdateTask } from '../shared/tasks'
import type { PomodoroMode, PomodoroState } from '../shared/pomodoro'
import type { UpdateStatus } from '../shared/updater'
import type { NewReminder, Reminder, UpdateReminder } from '../shared/reminders'
import type { NewNote, Note, UpdateNote } from '../shared/notes'
import type {
  MealPlanEntry,
  NewMealPlanEntry,
  NewRecipe,
  NewShoppingListItem,
  Recipe,
  ShoppingListItem,
  UpdateRecipe
} from '../shared/recipes'

export interface ActionResult {
  ok: boolean
  error?: string
}

const api = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
  },
  auth: {
    hasMasterPassword: (): Promise<boolean> => ipcRenderer.invoke('auth:hasMasterPassword'),
    setup: (password: string): Promise<ActionResult> => ipcRenderer.invoke('auth:setup', password),
    login: (password: string): Promise<ActionResult> => ipcRenderer.invoke('auth:login', password),
    changePassword: (currentPassword: string, newPassword: string): Promise<ActionResult> =>
      ipcRenderer.invoke('auth:changePassword', currentPassword, newPassword),
    verifyPassword: (password: string): Promise<ActionResult> => ipcRenderer.invoke('auth:verifyPassword', password),
    hasSecurityQuestion: (): Promise<boolean> => ipcRenderer.invoke('auth:hasSecurityQuestion'),
    getSecurityQuestion: (): Promise<string | null> => ipcRenderer.invoke('auth:getSecurityQuestion'),
    setSecurityQuestion: (question: string, answer: string): Promise<ActionResult> =>
      ipcRenderer.invoke('auth:setSecurityQuestion', question, answer),
    verifySecurityAnswer: (answer: string): Promise<ActionResult> =>
      ipcRenderer.invoke('auth:verifySecurityAnswer', answer),
    resetWithSecurityAnswer: (answer: string, newPassword: string): Promise<ActionResult> =>
      ipcRenderer.invoke('auth:resetWithSecurityAnswer', answer, newPassword)
  },
  settings: {
    getUserName: (): Promise<string | null> => ipcRenderer.invoke('settings:getUserName'),
    setUserName: (name: string): Promise<ActionResult> => ipcRenderer.invoke('settings:setUserName', name),
    getLanguage: (): Promise<string> => ipcRenderer.invoke('settings:getLanguage'),
    setLanguage: (lang: string): Promise<ActionResult> => ipcRenderer.invoke('settings:setLanguage', lang)
  },
  backup: {
    export: (): Promise<ActionResult & { path?: string }> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<ActionResult> => ipcRenderer.invoke('backup:import'),
    exportJson: (): Promise<ActionResult & { path?: string }> => ipcRenderer.invoke('backup:exportJson'),
    importJson: (): Promise<ActionResult> => ipcRenderer.invoke('backup:importJson')
  },
  reminders: {
    list: (): Promise<Reminder[]> => ipcRenderer.invoke('reminders:list'),
    add: (input: NewReminder): Promise<ActionResult> => ipcRenderer.invoke('reminders:add', input),
    update: (id: number, input: UpdateReminder): Promise<ActionResult> =>
      ipcRenderer.invoke('reminders:update', id, input),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('reminders:delete', id)
  },
  notes: {
    list: (): Promise<Note[]> => ipcRenderer.invoke('notes:list'),
    add: (input: NewNote): Promise<ActionResult & { id?: number }> => ipcRenderer.invoke('notes:add', input),
    update: (id: number, input: UpdateNote): Promise<ActionResult> => ipcRenderer.invoke('notes:update', id, input),
    togglePin: (id: number): Promise<ActionResult> => ipcRenderer.invoke('notes:togglePin', id),
    toggleArchive: (id: number): Promise<ActionResult> => ipcRenderer.invoke('notes:toggleArchive', id),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('notes:delete', id)
  },
  recipes: {
    list: (): Promise<Recipe[]> => ipcRenderer.invoke('recipes:list'),
    add: (input: NewRecipe): Promise<ActionResult> => ipcRenderer.invoke('recipes:add', input),
    update: (id: number, input: UpdateRecipe): Promise<ActionResult> => ipcRenderer.invoke('recipes:update', id, input),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('recipes:delete', id),
    toggleFavorite: (id: number): Promise<ActionResult> => ipcRenderer.invoke('recipes:toggleFavorite', id)
  },
  mealPlan: {
    list: (startDate: string, endDate: string): Promise<MealPlanEntry[]> =>
      ipcRenderer.invoke('mealPlan:list', startDate, endDate),
    set: (input: NewMealPlanEntry): Promise<ActionResult> => ipcRenderer.invoke('mealPlan:set', input),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('mealPlan:remove', id)
  },
  shoppingList: {
    list: (weekStart: string): Promise<ShoppingListItem[]> => ipcRenderer.invoke('shoppingList:list', weekStart),
    generate: (weekStart: string): Promise<ActionResult> => ipcRenderer.invoke('shoppingList:generate', weekStart),
    addItem: (input: NewShoppingListItem): Promise<ActionResult> =>
      ipcRenderer.invoke('shoppingList:addItem', input),
    toggleItem: (id: number): Promise<ActionResult> => ipcRenderer.invoke('shoppingList:toggleItem', id),
    removeItem: (id: number): Promise<ActionResult> => ipcRenderer.invoke('shoppingList:removeItem', id),
    clear: (weekStart: string): Promise<ActionResult> => ipcRenderer.invoke('shoppingList:clear', weekStart)
  },
  ledger: {
    list: (): Promise<Transaction[]> => ipcRenderer.invoke('ledger:list'),
    add: (input: NewTransaction): Promise<ActionResult> => ipcRenderer.invoke('ledger:add', input),
    update: (id: number, input: UpdateTransaction): Promise<ActionResult> =>
      ipcRenderer.invoke('ledger:update', id, input),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('ledger:delete', id),
    getGoal: (month: string): Promise<MonthlyGoal | null> => ipcRenderer.invoke('ledger:getGoal', month),
    setGoal: (month: string, incomeGoal: number, expenseGoal: number): Promise<ActionResult> =>
      ipcRenderer.invoke('ledger:setGoal', month, incomeGoal, expenseGoal),
    getExchangeRate: (): Promise<number> => ipcRenderer.invoke('ledger:getExchangeRate'),
    setExchangeRate: (rate: number): Promise<ActionResult> => ipcRenderer.invoke('ledger:setExchangeRate', rate),
    exportCsv: (period: ReportPeriod): Promise<ActionResult & { path?: string }> =>
      ipcRenderer.invoke('ledger:exportCsv', period),
    exportPdf: (period: ReportPeriod): Promise<ActionResult & { path?: string }> =>
      ipcRenderer.invoke('ledger:exportPdf', period)
  },
  categories: {
    list: (): Promise<Category[]> => ipcRenderer.invoke('categories:list'),
    add: (input: NewCategory): Promise<ActionResult & { id?: number }> =>
      ipcRenderer.invoke('categories:add', input),
    update: (id: number, input: UpdateCategory): Promise<ActionResult> =>
      ipcRenderer.invoke('categories:update', id, input),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('categories:delete', id)
  },
  recurringTransactions: {
    list: (): Promise<RecurringTransaction[]> => ipcRenderer.invoke('recurringTransactions:list'),
    add: (input: NewRecurringTransaction): Promise<ActionResult> =>
      ipcRenderer.invoke('recurringTransactions:add', input),
    toggle: (id: number): Promise<ActionResult> => ipcRenderer.invoke('recurringTransactions:toggle', id),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('recurringTransactions:delete', id)
  },
  tasks: {
    list: (date: string): Promise<Task[]> => ipcRenderer.invoke('tasks:list', date),
    add: (input: NewTask): Promise<ActionResult> => ipcRenderer.invoke('tasks:add', input),
    update: (id: number, input: UpdateTask): Promise<ActionResult> => ipcRenderer.invoke('tasks:update', id, input),
    toggle: (id: number): Promise<ActionResult> => ipcRenderer.invoke('tasks:toggle', id),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('tasks:delete', id)
  },
  recurringTasks: {
    list: (): Promise<RecurringTask[]> => ipcRenderer.invoke('recurringTasks:list'),
    add: (input: NewRecurringTask): Promise<ActionResult> => ipcRenderer.invoke('recurringTasks:add', input),
    toggle: (id: number): Promise<ActionResult> => ipcRenderer.invoke('recurringTasks:toggle', id),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('recurringTasks:delete', id)
  },
  subtasks: {
    list: (taskId: number): Promise<Subtask[]> => ipcRenderer.invoke('subtasks:list', taskId),
    add: (input: NewSubtask): Promise<ActionResult> => ipcRenderer.invoke('subtasks:add', input),
    update: (id: number, title: string): Promise<ActionResult> => ipcRenderer.invoke('subtasks:update', id, title),
    toggle: (id: number): Promise<ActionResult> => ipcRenderer.invoke('subtasks:toggle', id),
    remove: (id: number): Promise<ActionResult> => ipcRenderer.invoke('subtasks:delete', id)
  },
  pomodoro: {
    getState: (): Promise<PomodoroState> => ipcRenderer.invoke('pomodoro:getState'),
    start: (): Promise<PomodoroState> => ipcRenderer.invoke('pomodoro:start'),
    pause: (): Promise<PomodoroState> => ipcRenderer.invoke('pomodoro:pause'),
    reset: (): Promise<PomodoroState> => ipcRenderer.invoke('pomodoro:reset'),
    openWidget: (): Promise<PomodoroState> => ipcRenderer.invoke('pomodoro:openWidget'),
    focusMain: (): Promise<void> => ipcRenderer.invoke('pomodoro:focusMain'),
    setTask: (taskId: number | null, taskTitle: string | null, targetMinutes: number | null): Promise<PomodoroState> =>
      ipcRenderer.invoke('pomodoro:setTask', taskId, taskTitle, targetMinutes),
    onState: (callback: (state: PomodoroState) => void): (() => void) => {
      const listener = (_event: unknown, state: PomodoroState): void => callback(state)
      ipcRenderer.on('pomodoro:state', listener)
      return () => ipcRenderer.removeListener('pomodoro:state', listener)
    },
    onSessionEnded: (callback: (mode: PomodoroMode) => void): (() => void) => {
      const listener = (_event: unknown, mode: PomodoroMode): void => callback(mode)
      ipcRenderer.on('pomodoro:sessionEnded', listener)
      return () => ipcRenderer.removeListener('pomodoro:sessionEnded', listener)
    }
  },
  updater: {
    check: (): Promise<ActionResult> => ipcRenderer.invoke('updater:check'),
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updater:getStatus'),
    install: (): Promise<ActionResult> => ipcRenderer.invoke('updater:install'),
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: unknown, status: UpdateStatus): void => callback(status)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
