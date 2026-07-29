import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { monthName, reminderOccursOn, weekdayAbbr } from '../../../../shared/reminders'
import type { Reminder } from '../../../../shared/reminders'
import { shiftMonth, todayIso } from '../../../../shared/date'
import { currentLocale, capitalize } from '../../lib/dateFormat'

interface Props {
  reminders: Reminder[]
  month: string
  onMonthChange: (month: string) => void
  onSelectReminder: (reminder: Reminder) => void
  onAddForDate: (date: Date) => void
}

const TYPE_DOT_COLOR: Record<Reminder['type'], string> = {
  cumpleanos: '#ec4899',
  aniversario: '#f43f5e',
  pago: '#f59e0b',
  otro: '#6366f1'
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const MAX_DOTS = 3

interface Cell {
  date: Date
  inCurrentMonth: boolean
}

function buildWeeks(year: number, month: number): Cell[][] {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = (first.getDay() + 6) % 7 // Monday = 0
  const totalDays = new Date(year, month, 0).getDate()

  const cells: Cell[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: new Date(year, month - 1, i - firstWeekday + 1), inCurrentMonth: false })
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ date: new Date(year, month - 1, d), inCurrentMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inCurrentMonth: false })
  }

  const weeks: Cell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function RemindersCalendar({
  reminders,
  month,
  onMonthChange,
  onSelectReminder,
  onAddForDate
}: Props): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthNum = Number(monthStr)
  const weeks = buildWeeks(year, monthNum)
  const todayIsoStr = todayIso()

  return (
    <div className="reminders-calendar">
      <div className="reminders-calendar-nav">
        <button
          type="button"
          className="date-nav-button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label={t('reminders.prevMonthAria')}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <span className="reminders-calendar-label">
          {capitalize(monthName(monthNum, locale))} {year}
        </span>
        <button
          type="button"
          className="date-nav-button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label={t('reminders.nextMonthAria')}
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
        {month !== todayIsoStr.slice(0, 7) && (
          <button
            type="button"
            className="pill-button pill-button-accent"
            onClick={() => onMonthChange(todayIsoStr.slice(0, 7))}
          >
            {t('reminders.thisMonth')}
          </button>
        )}
      </div>

      <div className="reminders-calendar-grid">
        {WEEKDAY_ORDER.map((dow) => (
          <span key={dow} className="reminders-calendar-weekday">
            {weekdayAbbr(dow, locale)}
          </span>
        ))}

        {weeks.map((week) =>
          week.map((cell) => {
            const cellIso = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(
              cell.date.getDate()
            ).padStart(2, '0')}`
            const matches = reminders.filter((r) => reminderOccursOn(r, cell.date))
            const isToday = cellIso === todayIsoStr
            const classes = ['reminders-calendar-day', !cell.inCurrentMonth && 'outside', isToday && 'today']
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={cellIso}
                className={classes}
                onClick={() => onAddForDate(cell.date)}
                title={t('reminders.addForDayAria')}
              >
                <span className="reminders-calendar-day-number">{cell.date.getDate()}</span>
                {matches.length > 0 && (
                  <span className="reminders-calendar-dots">
                    {matches.slice(0, MAX_DOTS).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="reminders-calendar-dot"
                        style={{ background: TYPE_DOT_COLOR[r.type] }}
                        title={r.title}
                        aria-label={r.title}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectReminder(r)
                        }}
                      />
                    ))}
                    {matches.length > MAX_DOTS && (
                      <span className="reminders-calendar-dot-more">+{matches.length - MAX_DOTS}</span>
                    )}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
