import { Notification } from 'electron'
import { getSetting, setSetting } from './db'
import { listReminders } from './reminders'
import { listTasks } from './tasks'
import { mt } from './i18n'
import { daysUntilNext } from '../shared/reminders'
import type { ReminderType } from '../shared/reminders'
import { todayIso } from '../shared/date'

const TYPE_KEY: Record<ReminderType, string> = {
  cumpleanos: 'typeCumpleanos',
  aniversario: 'typeAniversario',
  otro: 'typeOtro'
}

const NOTIFY_HOUR = 9
const LAST_NOTIFIED_KEY = 'notifications_last_date'

function showNotification(title: string, body: string, onClick: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  notification.on('click', onClick)
  notification.show()
}

export function checkAndSendDailyNotifications(focusMainWindow: () => void): void {
  const now = new Date()
  const today = todayIso()

  if (getSetting(LAST_NOTIFIED_KEY) === today) return
  if (now.getHours() < NOTIFY_HOUR) return

  const dueReminders = listReminders().filter((r) => daysUntilNext(r.month, r.day) === 0)
  for (const reminder of dueReminders) {
    showNotification(mt('notifyReminderTitle', { type: mt(TYPE_KEY[reminder.type]) }), reminder.title, focusMainWindow)
  }

  const pendingTasks = listTasks(today).filter((t) => !t.completed)
  if (pendingTasks.length > 0) {
    const preview = pendingTasks
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ')
    const extra = pendingTasks.length > 3 ? mt('notifyTasksMore', { count: pendingTasks.length - 3 }) : ''
    showNotification(mt('notifyTasksTitle', { count: pendingTasks.length }), `${preview}${extra}`, focusMainWindow)
  }

  setSetting(LAST_NOTIFIED_KEY, today)
}
