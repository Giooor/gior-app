import i18n from './i18n'
import { LOCALE_TAGS, type AppLanguage } from './i18n'

export function currentLocale(): string {
  const lang = (i18n.language?.split('-')[0] ?? 'es') as AppLanguage
  return LOCALE_TAGS[lang] ?? LOCALE_TAGS.es
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatWeekdayMonthDay(date: Date): string {
  return capitalize(date.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' }))
}

export function formatMonthLong(date: Date): string {
  return capitalize(date.toLocaleDateString(currentLocale(), { month: 'long' }))
}

export function formatDayMonthShortYear(date: Date): string {
  return date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
}
