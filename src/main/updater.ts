import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../shared/updater'

const { autoUpdater } = electronUpdater

let window: BrowserWindow | null = null
let lastStatus: UpdateStatus = { state: 'idle' }

function sendStatus(status: UpdateStatus): void {
  lastStatus = status
  if (window && !window.isDestroyed()) {
    window.webContents.send('updater:status', status)
  }
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  window = mainWindow
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => sendStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => sendStatus({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => sendStatus({ state: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    sendStatus({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => sendStatus({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => sendStatus({ state: 'error', message: err.message }))

  ipcMain.handle('updater:check', () => {
    if (!app.isPackaged) {
      return { ok: false, error: 'errors.updaterDevMode' }
    }
    autoUpdater.checkForUpdates().catch((err) => sendStatus({ state: 'error', message: err.message }))
    return { ok: true }
  })

  ipcMain.handle('updater:getStatus', () => lastStatus)

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
    return { ok: true }
  })

  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((err) => sendStatus({ state: 'error', message: err.message }))
  }
}
