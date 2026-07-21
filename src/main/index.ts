import { app, dialog, shell, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getSetting, initDb, setSetting } from './db'
import { initAutoUpdater } from './updater'
import {
  backupFileName,
  exportBackupTo,
  exportJsonBackupTo,
  jsonBackupFileName,
  restoreBackupFrom,
  restoreJsonBackupFrom
} from './backup'
import { exportLedgerCsvTo, exportLedgerPdfTo } from './reports'
import { mt } from './i18n'
import {
  getSecurityQuestion,
  hasMasterPassword,
  hasSecurityQuestion,
  resetPasswordWithSecurityAnswer,
  setMasterPassword,
  setSecurityQuestion,
  verifyMasterPassword,
  verifySecurityAnswer
} from './auth'
import {
  addRecurringTransaction,
  addTransaction,
  deleteRecurringTransaction,
  deleteTransaction,
  generateDueRecurringTransactions,
  getExchangeRate,
  getMonthlyGoal,
  listRecurringTransactions,
  listTransactions,
  setExchangeRate,
  setMonthlyGoal,
  toggleRecurringTransaction,
  updateTransaction
} from './ledger'
import { addCategory, deleteCategory, ensureDefaultCategories, listCategories, updateCategory } from './categories'
import {
  addRecurringTask,
  addSubtask,
  addTask,
  deleteRecurringTask,
  deleteSubtask,
  deleteTask,
  generateDueRecurringTasks,
  listRecurringTasks,
  listSubtasks,
  listTasks,
  toggleRecurringTask,
  toggleSubtask,
  toggleTask,
  updateSubtask,
  updateTask
} from './tasks'
import {
  getPomodoroState,
  pausePomodoro,
  pomodoroEvents,
  resetPomodoro,
  setPomodoroTask,
  startPomodoro
} from './pomodoro'
import { addReminder, deleteReminder, listReminders, updateReminder } from './reminders'
import { addNote, deleteNote, listNotes, toggleArchiveNote, togglePinNote, updateNote } from './notes'
import { checkAndSendDailyNotifications } from './notifications'
import {
  addRecipe,
  addShoppingListItem,
  clearShoppingList,
  deleteRecipe,
  generateShoppingList,
  listMealPlan,
  listRecipes,
  listShoppingList,
  removeMealPlanEntry,
  removeShoppingListItem,
  setMealPlanEntry,
  toggleRecipeFavorite,
  toggleShoppingListItem,
  updateRecipe
} from './recipes'
import type {
  NewCategory,
  NewRecurringTransaction,
  NewTransaction,
  ReportPeriod,
  UpdateCategory,
  UpdateTransaction
} from '../shared/ledger'
import type { NewRecurringTask, NewSubtask, NewTask, UpdateTask } from '../shared/tasks'
import type { PomodoroMode } from '../shared/pomodoro'
import type { NewReminder, UpdateReminder } from '../shared/reminders'
import type { NewNote, UpdateNote } from '../shared/notes'
import type { NewMealPlanEntry, NewRecipe, NewShoppingListItem, UpdateRecipe } from '../shared/recipes'

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function focusMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
}

function applyTrayLanguage(): void {
  if (!tray) return
  tray.setToolTip(mt('trayTooltip'))
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: mt('trayOpen'), click: () => focusMainWindow() },
      { type: 'separator' },
      {
        label: mt('trayQuit'),
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  applyTrayLanguage()
  tray.on('click', () => focusMainWindow())
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'GIOR - App Personal',
    icon: nativeImage.createFromPath(join(__dirname, '../../resources/icon.png')),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (isQuitting) return
    e.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createPomodoroWidget(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    widgetWindow.focus()
    return
  }

  const { workArea } = screen.getPrimaryDisplay()
  const width = 190
  const height = 200
  const margin = 16

  widgetWindow = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + workArea.height - height - margin,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  widgetWindow.on('ready-to-show', () => {
    widgetWindow?.show()
  })

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    widgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#pomodoro-widget`)
  } else {
    widgetWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'pomodoro-widget' })
  }
}

app.whenReady().then(async () => {
  await initDb()
  ensureDefaultCategories()
  generateDueRecurringTransactions()
  generateDueRecurringTasks()

  electronApp.setAppUserModelId('com.gior.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('auth:hasMasterPassword', () => hasMasterPassword())

  ipcMain.handle('auth:setup', (_event, password: string) => {
    if (hasMasterPassword()) {
      return { ok: false, error: 'errors.passwordAlreadySet' }
    }
    if (!/^\d{6}$/.test(password)) {
      return { ok: false, error: 'errors.passwordTooShort' }
    }
    setMasterPassword(password)
    return { ok: true }
  })

  ipcMain.handle('auth:login', (_event, password: string) => {
    const valid = verifyMasterPassword(password)
    if (!valid) {
      return { ok: false, error: 'errors.incorrectPassword' }
    }
    return { ok: true }
  })

  ipcMain.handle('auth:changePassword', (_event, currentPassword: string, newPassword: string) => {
    if (!verifyMasterPassword(currentPassword)) {
      return { ok: false, error: 'errors.currentPasswordIncorrect' }
    }
    if (!/^\d{6}$/.test(newPassword)) {
      return { ok: false, error: 'errors.passwordTooShort' }
    }
    setMasterPassword(newPassword)
    return { ok: true }
  })

  ipcMain.handle('auth:verifyPassword', (_event, password: string) => {
    if (!verifyMasterPassword(password)) {
      return { ok: false, error: 'errors.incorrectPassword' }
    }
    return { ok: true }
  })

  ipcMain.handle('auth:hasSecurityQuestion', () => hasSecurityQuestion())

  ipcMain.handle('auth:getSecurityQuestion', () => getSecurityQuestion())

  ipcMain.handle('auth:setSecurityQuestion', (_event, question: string, answer: string) => {
    if (!question.trim() || !answer.trim()) {
      return { ok: false, error: 'errors.securityQuestionRequired' }
    }
    setSecurityQuestion(question.trim(), answer)
    return { ok: true }
  })

  ipcMain.handle('auth:verifySecurityAnswer', (_event, answer: string) => {
    if (!verifySecurityAnswer(answer)) {
      return { ok: false, error: 'errors.securityAnswerIncorrect' }
    }
    return { ok: true }
  })

  ipcMain.handle('auth:resetWithSecurityAnswer', (_event, answer: string, newPassword: string) => {
    if (!/^\d{6}$/.test(newPassword)) {
      return { ok: false, error: 'errors.passwordTooShort' }
    }
    const ok = resetPasswordWithSecurityAnswer(answer, newPassword)
    if (!ok) {
      return { ok: false, error: 'errors.securityAnswerIncorrect' }
    }
    return { ok: true }
  })

  ipcMain.handle('settings:getUserName', () => getSetting('user_name') ?? null)

  ipcMain.handle('settings:setUserName', (_event, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { ok: false, error: 'errors.nameRequired' }
    }
    setSetting('user_name', trimmed)
    return { ok: true }
  })

  ipcMain.handle('settings:getLanguage', () => getSetting('app_language') ?? 'es')

  ipcMain.handle('settings:setLanguage', (_event, lang: string) => {
    setSetting('app_language', lang)
    applyTrayLanguage()
    return { ok: true }
  })

  ipcMain.handle('backup:export', async () => {
    const window = mainWindow
    if (!window) return { ok: false, error: 'errors.windowUnavailable' }

    const result = await dialog.showSaveDialog(window, {
      title: mt('exportDialogTitle'),
      defaultPath: backupFileName(),
      filters: [{ name: mt('backupFilterName'), extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }

    try {
      exportBackupTo(result.filePath)
      return { ok: true, path: result.filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('backup:import', async () => {
    const window = mainWindow
    if (!window) return { ok: false, error: 'errors.windowUnavailable' }

    const result = await dialog.showOpenDialog(window, {
      title: mt('importDialogTitle'),
      filters: [{ name: mt('backupFilterName'), extensions: ['db'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: false }

    const restored = await restoreBackupFrom(result.filePaths[0])
    if (!restored.ok) return restored

    app.relaunch()
    app.exit(0)
    return { ok: true }
  })

  ipcMain.handle('backup:exportJson', async () => {
    const window = mainWindow
    if (!window) return { ok: false, error: 'errors.windowUnavailable' }

    const result = await dialog.showSaveDialog(window, {
      title: mt('exportJsonDialogTitle'),
      defaultPath: jsonBackupFileName(),
      filters: [{ name: mt('jsonBackupFilterName'), extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }

    try {
      exportJsonBackupTo(result.filePath)
      return { ok: true, path: result.filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('backup:importJson', async () => {
    const window = mainWindow
    if (!window) return { ok: false, error: 'errors.windowUnavailable' }

    const result = await dialog.showOpenDialog(window, {
      title: mt('importJsonDialogTitle'),
      filters: [{ name: mt('jsonBackupFilterName'), extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: false }

    const restored = restoreJsonBackupFrom(result.filePaths[0])
    if (!restored.ok) return restored

    app.relaunch()
    app.exit(0)
    return { ok: true }
  })

  ipcMain.handle('ledger:exportCsv', async (_event, period: ReportPeriod) => {
    const window = mainWindow
    if (!window) return { ok: false, error: 'errors.windowUnavailable' }

    const result = await dialog.showSaveDialog(window, {
      title: mt('exportCsvDialogTitle'),
      defaultPath: `contabilidad-${period.value}.csv`,
      filters: [{ name: mt('csvFilterName'), extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }

    try {
      exportLedgerCsvTo(period, result.filePath)
      return { ok: true, path: result.filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('ledger:exportPdf', async (_event, period: ReportPeriod) => {
    const window = mainWindow
    if (!window) return { ok: false, error: 'errors.windowUnavailable' }

    const result = await dialog.showSaveDialog(window, {
      title: mt('exportPdfDialogTitle'),
      defaultPath: `contabilidad-${period.value}.pdf`,
      filters: [{ name: mt('pdfFilterName'), extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }

    try {
      await exportLedgerPdfTo(period, result.filePath)
      return { ok: true, path: result.filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('reminders:list', () => listReminders())

  ipcMain.handle('reminders:add', (_event, input: NewReminder) => {
    try {
      addReminder(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('reminders:update', (_event, id: number, input: UpdateReminder) => {
    try {
      updateReminder(id, input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('reminders:delete', (_event, id: number) => {
    deleteReminder(id)
    return { ok: true }
  })

  ipcMain.handle('notes:list', () => listNotes())

  ipcMain.handle('notes:add', (_event, input: NewNote) => {
    try {
      const id = addNote(input)
      return { ok: true, id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('notes:update', (_event, id: number, input: UpdateNote) => {
    try {
      updateNote(id, input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('notes:togglePin', (_event, id: number) => {
    togglePinNote(id)
    return { ok: true }
  })

  ipcMain.handle('notes:toggleArchive', (_event, id: number) => {
    toggleArchiveNote(id)
    return { ok: true }
  })

  ipcMain.handle('notes:delete', (_event, id: number) => {
    deleteNote(id)
    return { ok: true }
  })

  ipcMain.handle('recipes:list', () => listRecipes())

  ipcMain.handle('recipes:add', (_event, input: NewRecipe) => {
    try {
      addRecipe(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('recipes:update', (_event, id: number, input: UpdateRecipe) => {
    try {
      updateRecipe(id, input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('recipes:delete', (_event, id: number) => {
    deleteRecipe(id)
    return { ok: true }
  })

  ipcMain.handle('recipes:toggleFavorite', (_event, id: number) => {
    toggleRecipeFavorite(id)
    return { ok: true }
  })

  ipcMain.handle('mealPlan:list', (_event, startDate: string, endDate: string) => listMealPlan(startDate, endDate))

  ipcMain.handle('mealPlan:set', (_event, input: NewMealPlanEntry) => {
    try {
      setMealPlanEntry(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('mealPlan:remove', (_event, id: number) => {
    removeMealPlanEntry(id)
    return { ok: true }
  })

  ipcMain.handle('shoppingList:list', (_event, weekStart: string) => listShoppingList(weekStart))

  ipcMain.handle('shoppingList:generate', (_event, weekStart: string) => {
    generateShoppingList(weekStart)
    return { ok: true }
  })

  ipcMain.handle('shoppingList:addItem', (_event, input: NewShoppingListItem) => {
    try {
      addShoppingListItem(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('shoppingList:toggleItem', (_event, id: number) => {
    toggleShoppingListItem(id)
    return { ok: true }
  })

  ipcMain.handle('shoppingList:removeItem', (_event, id: number) => {
    removeShoppingListItem(id)
    return { ok: true }
  })

  ipcMain.handle('shoppingList:clear', (_event, weekStart: string) => {
    clearShoppingList(weekStart)
    return { ok: true }
  })

  ipcMain.handle('ledger:list', () => listTransactions())

  ipcMain.handle('ledger:add', (_event, input: NewTransaction) => {
    try {
      addTransaction(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('ledger:update', (_event, id: number, input: UpdateTransaction) => {
    try {
      updateTransaction(id, input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('ledger:delete', (_event, id: number) => {
    deleteTransaction(id)
    return { ok: true }
  })

  ipcMain.handle('ledger:getGoal', (_event, month: string) => getMonthlyGoal(month))

  ipcMain.handle('ledger:setGoal', (_event, month: string, incomeGoal: number, expenseGoal: number) => {
    try {
      setMonthlyGoal(month, incomeGoal, expenseGoal)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('ledger:getExchangeRate', () => getExchangeRate())

  ipcMain.handle('ledger:setExchangeRate', (_event, rate: number) => {
    try {
      setExchangeRate(rate)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('categories:list', () => listCategories())

  ipcMain.handle('categories:add', (_event, input: NewCategory) => {
    try {
      const id = addCategory(input)
      return { ok: true, id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('categories:update', (_event, id: number, input: UpdateCategory) => {
    try {
      updateCategory(id, input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('categories:delete', (_event, id: number) => {
    deleteCategory(id)
    return { ok: true }
  })

  ipcMain.handle('recurringTransactions:list', () => listRecurringTransactions())

  ipcMain.handle('recurringTransactions:add', (_event, input: NewRecurringTransaction) => {
    try {
      addRecurringTransaction(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('recurringTransactions:toggle', (_event, id: number) => {
    toggleRecurringTransaction(id)
    return { ok: true }
  })

  ipcMain.handle('recurringTransactions:delete', (_event, id: number) => {
    deleteRecurringTransaction(id)
    return { ok: true }
  })

  ipcMain.handle('tasks:list', (_event, date: string) => listTasks(date))

  ipcMain.handle('tasks:add', (_event, input: NewTask) => {
    try {
      addTask(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('tasks:update', (_event, id: number, input: UpdateTask) => {
    try {
      updateTask(id, input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('tasks:toggle', (_event, id: number) => {
    toggleTask(id)
    return { ok: true }
  })

  ipcMain.handle('tasks:delete', (_event, id: number) => {
    deleteTask(id)
    return { ok: true }
  })

  ipcMain.handle('recurringTasks:list', () => listRecurringTasks())

  ipcMain.handle('recurringTasks:add', (_event, input: NewRecurringTask) => {
    try {
      addRecurringTask(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('recurringTasks:toggle', (_event, id: number) => {
    toggleRecurringTask(id)
    return { ok: true }
  })

  ipcMain.handle('recurringTasks:delete', (_event, id: number) => {
    deleteRecurringTask(id)
    return { ok: true }
  })

  ipcMain.handle('subtasks:list', (_event, taskId: number) => listSubtasks(taskId))

  ipcMain.handle('subtasks:add', (_event, input: NewSubtask) => {
    try {
      addSubtask(input)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('subtasks:update', (_event, id: number, title: string) => {
    try {
      updateSubtask(id, title)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'errors.generic' }
    }
  })

  ipcMain.handle('subtasks:toggle', (_event, id: number) => {
    toggleSubtask(id)
    return { ok: true }
  })

  ipcMain.handle('subtasks:delete', (_event, id: number) => {
    deleteSubtask(id)
    return { ok: true }
  })

  ipcMain.handle('pomodoro:getState', () => getPomodoroState())

  ipcMain.handle('pomodoro:start', () => {
    const state = startPomodoro()
    createPomodoroWidget()
    return state
  })

  ipcMain.handle('pomodoro:pause', () => pausePomodoro())

  ipcMain.handle('pomodoro:reset', () => resetPomodoro())

  ipcMain.handle(
    'pomodoro:setTask',
    (_event, taskId: number | null, taskTitle: string | null, targetMinutes: number | null) =>
      setPomodoroTask(taskId, taskTitle, targetMinutes)
  )

  ipcMain.handle('pomodoro:openWidget', () => {
    createPomodoroWidget()
    return getPomodoroState()
  })

  ipcMain.handle('pomodoro:focusMain', () => focusMainWindow())

  pomodoroEvents.on('sessionEnd', (finishedMode: PomodoroMode) => {
    const target = widgetWindow && !widgetWindow.isDestroyed() ? widgetWindow : mainWindow
    if (target && !target.isDestroyed()) {
      target.webContents.send('pomodoro:sessionEnded', finishedMode)
    }
  })

  createWindow()
  createTray()
  if (mainWindow) initAutoUpdater(mainWindow)

  checkAndSendDailyNotifications(focusMainWindow)
  setInterval(() => checkAndSendDailyNotifications(focusMainWindow), 5 * 60 * 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})
