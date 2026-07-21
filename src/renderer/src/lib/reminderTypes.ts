import { Bell, Cake, Heart } from 'lucide-react'
import type { ReminderType } from '../../../shared/reminders'

export const TYPE_ICON: Record<ReminderType, typeof Cake> = {
  cumpleanos: Cake,
  aniversario: Heart,
  otro: Bell
}

export const TYPE_LABEL_KEY: Record<ReminderType, string> = {
  cumpleanos: 'reminders.types.cumpleanos',
  aniversario: 'reminders.types.aniversario',
  otro: 'reminders.types.otro'
}

export const REMINDER_TYPES: ReminderType[] = ['cumpleanos', 'aniversario', 'otro']
