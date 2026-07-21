import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Apple,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  CalendarCheck,
  Check,
  Coffee,
  Moon,
  Pencil,
  Utensils
} from 'lucide-react'
import { currency } from '../lib/currency'
import type { ModuleKey } from '../lib/modules'
import { TYPE_ICON, TYPE_LABEL_KEY } from '../lib/reminderTypes'
import { currentLocale, formatWeekdayMonthDay, formatMonthLong, capitalize } from '../lib/dateFormat'
import { daysUntilReminder, isReminderPast, monthName, reminderOccurrenceDate, weekdayName } from '../../../shared/reminders'
import { MEAL_TYPES, MEAL_TYPE_LABEL_KEY } from '../../../shared/recipes'
import { shiftMonth, toLocalIso, todayIso } from '../../../shared/date'
import CategoryBadge from './contabilidad/CategoryBadge'
import { toBaseAmount } from '../../../shared/ledger'
import type { Reminder } from '../../../shared/reminders'
import type { MealPlanEntry, MealType } from '../../../shared/recipes'
import type { Task } from '../../../shared/tasks'
import type { Category, Transaction } from '../../../shared/ledger'

const MEAL_TYPE_ICON: Record<MealType, typeof Coffee> = {
  desayuno: Coffee,
  almuerzo: Utensils,
  cena: Moon,
  snack: Apple
}

interface Props {
  onNavigate: (key: ModuleKey) => void
}

interface DayActivity {
  date: string
  completed: number
}

interface MonthFinance {
  ingresos: number
  gastos: number
  prevIngresos: number
  prevGastos: number
}

interface CategorySpend {
  category: string
  amount: number
}

const WEEKDAY_LETTERS_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function last7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toLocalIso(d))
  }
  return days
}

export default function Home({ onNavigate }: Props): JSX.Element {
  const { t } = useTranslation()
  const [todayTasks, setTodayTasks] = useState<Task[] | null>(null)
  const [todayMeals, setTodayMeals] = useState<MealPlanEntry[] | null>(null)
  const [monthFinance, setMonthFinance] = useState<MonthFinance | null>(null)
  const [topCategories, setTopCategories] = useState<CategorySpend[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [weekActivity, setWeekActivity] = useState<DayActivity[] | null>(null)
  const [nearestReminder, setNearestReminder] = useState<Reminder | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    window.api.tasks.list(todayIso()).then(setTodayTasks)
    window.api.settings.getUserName().then(setUserName)
    window.api.mealPlan.list(todayIso(), todayIso()).then(setTodayMeals)

    window.api.categories.list().then(setCategories)

    Promise.all([window.api.ledger.list(), window.api.ledger.getExchangeRate()]).then(
      ([transactions, exchangeRate]) => {
        const month = todayIso().slice(0, 7)
        const prevMonth = shiftMonth(month, -1)
        const monthTransactions = transactions.filter((t) => t.date.startsWith(month))
        const prevMonthTransactions = transactions.filter((t) => t.date.startsWith(prevMonth))

        const sumByType = (rows: Transaction[], type: 'ingreso' | 'gasto'): number =>
          rows
            .filter((t) => t.type === type)
            .reduce((sum, t) => sum + toBaseAmount(t.amount, t.currency, exchangeRate), 0)

        setMonthFinance({
          ingresos: sumByType(monthTransactions, 'ingreso'),
          gastos: sumByType(monthTransactions, 'gasto'),
          prevIngresos: sumByType(prevMonthTransactions, 'ingreso'),
          prevGastos: sumByType(prevMonthTransactions, 'gasto')
        })

        const spendByCategory = new Map<string, number>()
        for (const t of monthTransactions) {
          if (t.type !== 'gasto') continue
          const amount = toBaseAmount(t.amount, t.currency, exchangeRate)
          spendByCategory.set(t.category, (spendByCategory.get(t.category) ?? 0) + amount)
        }
        setTopCategories(
          Array.from(spendByCategory, ([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 4)
        )
      }
    )

    window.api.reminders.list().then((rows) => {
      const upcoming = rows.filter((r) => !isReminderPast(r))
      if (upcoming.length === 0) return
      const sorted = [...upcoming].sort((a, b) => daysUntilReminder(a) - daysUntilReminder(b))
      setNearestReminder(sorted[0])
    })

    const days = last7Days()
    Promise.all(days.map((d) => window.api.tasks.list(d))).then((results) => {
      setWeekActivity(
        days.map((d, i) => ({ date: d, completed: results[i].filter((t) => t.completed).length }))
      )
    })
  }, [])

  function startEditName(): void {
    setNameInput(userName ?? '')
    setEditingName(true)
  }

  async function handleNameSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return

    const result = await window.api.settings.setUserName(trimmed)
    if (result.ok) {
      setUserName(trimmed)
      setEditingName(false)
    }
  }

  const completedCount = todayTasks?.filter((t) => t.completed).length ?? 0

  const maxCompleted = Math.max(1, ...(weekActivity?.map((d) => d.completed) ?? [0]))
  const financeMax = Math.max(1, monthFinance?.ingresos ?? 0, monthFinance?.gastos ?? 0)
  const hasFinanceActivity = !!monthFinance && (monthFinance.ingresos > 0 || monthFinance.gastos > 0)
  const incomeDelta = monthFinance ? percentDelta(monthFinance.ingresos, monthFinance.prevIngresos) : null
  const expenseDelta = monthFinance ? percentDelta(monthFinance.gastos, monthFinance.prevGastos) : null

  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]))
  const topCategoriesMax = Math.max(1, ...(topCategories?.map((c) => c.amount) ?? [0]))

  const ReminderIcon = nearestReminder ? TYPE_ICON[nearestReminder.type] : null
  const locale = currentLocale()

  function renderDelta(value: number | null): JSX.Element | null {
    if (value === null) return null
    const rounded = Math.round(value)
    return (
      <span className={`home-finance-delta ${rounded >= 0 ? 'positive' : 'negative'}`}>
        {rounded >= 0 ? '+' : ''}
        {rounded}% <span className="home-finance-delta-label">{t('home.vsLastMonth')}</span>
      </span>
    )
  }

  return (
    <div className="home-page">
      <div className="home-header">
        {editingName ? (
          <form className="home-name-form" onSubmit={handleNameSubmit}>
            <input
              type="text"
              placeholder={t('home.namePlaceholder')}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="icon-button icon-button-save" aria-label={t('common.save')}>
              <Check size={16} strokeWidth={2} />
            </button>
          </form>
        ) : (
          <h1>
            {userName ? t('home.greetingNamed', { name: userName }) : t('home.greeting')}
            <button
              type="button"
              className="icon-button home-name-edit"
              onClick={startEditName}
              aria-label={t('home.editNameAria')}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
          </h1>
        )}
        <p className="home-subtitle">{formatWeekdayMonthDay(new Date())}</p>
      </div>

      {todayTasks !== null && todayTasks.length > 0 && (
        <div className="home-highlight">
          <CalendarCheck size={16} strokeWidth={2} />
          <span>
            {t('home.todayTasksSummary', {
              count: todayTasks.length,
              taskWord: t('home.taskWord', { count: todayTasks.length }),
              completed: completedCount,
              completedWord: t('home.completedWord', { count: completedCount })
            })}
          </span>
        </div>
      )}

      <div className="home-top-row">
        {nearestReminder && ReminderIcon && (
          <div
            className={`reminder-hero reminder-hero-${nearestReminder.type} home-reminder-spotlight`}
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('recordatorios')}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate('recordatorios')}
          >
            <div className="reminder-hero-icon">
              <ReminderIcon size={28} strokeWidth={1.75} />
            </div>
            <div className="reminder-hero-body">
              <span className="reminder-hero-eyebrow">
                {t('home.reminderEyebrow', { type: t(TYPE_LABEL_KEY[nearestReminder.type]) })}
              </span>
              <span className="reminder-hero-title">{nearestReminder.title}</span>
              <span className="reminder-hero-date">
                {capitalize(weekdayName(reminderOccurrenceDate(nearestReminder).getDay(), locale))}{' '}
                {t('common.dayMonth', { day: nearestReminder.day, month: monthName(nearestReminder.month, locale) })}
              </span>
            </div>
            <div className="reminder-hero-countdown">
              <span className="reminder-hero-countdown-value">
                {daysUntilReminder(nearestReminder) === 0
                  ? t('home.todayExcited')
                  : daysUntilReminder(nearestReminder) === 1
                    ? t('home.tomorrowExcited')
                    : daysUntilReminder(nearestReminder)}
              </span>
              {daysUntilReminder(nearestReminder) > 1 && (
                <span className="reminder-hero-countdown-label">{t('home.daysLabel')}</span>
              )}
            </div>
            <ArrowRight size={18} strokeWidth={2} className="reminder-hero-arrow" />
          </div>
        )}

        {todayMeals !== null && (
          <div className="home-today-plan">
            <div className="home-today-plan-header">
              <h2>{t('home.mealPlanTitle')}</h2>
              <button type="button" className="pill-button" onClick={() => onNavigate('recetas')}>
                {t('home.viewWeekPlan')}
              </button>
            </div>
            <div className="home-meal-list">
              {MEAL_TYPES.map((mealType) => {
                const entry = todayMeals.find((m) => m.mealType === mealType)
                const Icon = MEAL_TYPE_ICON[mealType]
                return (
                  <div key={mealType} className="home-meal-row">
                    <div className="home-meal-icon">
                      <Icon size={15} strokeWidth={1.75} />
                    </div>
                    <span className="home-meal-label">{t(MEAL_TYPE_LABEL_KEY[mealType])}</span>
                    <span className={`home-meal-value${entry ? '' : ' empty'}`}>
                      {entry ? entry.recipeTitle : t('home.notPlanned')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="home-charts-row">
        <div className="home-chart-card">
          <h2>{t('home.weekActivityTitle')}</h2>
          {weekActivity && (
            <>
              <div className="home-week-chart">
                {weekActivity.map((d) => {
                  const isToday = d.date === todayIso()
                  const heightPct = Math.max(6, (d.completed / maxCompleted) * 100)
                  return (
                    <div className="home-week-col" key={d.date}>
                      <div className="home-week-bar-track">
                        <div
                          className={`home-week-bar${isToday ? ' home-week-bar-today' : ''}`}
                          style={{ height: `${heightPct}%` }}
                          title={t('home.taskCompletedTooltip', { count: d.completed })}
                        />
                      </div>
                      <span className={`home-week-label${isToday ? ' home-week-label-today' : ''}`}>
                        {t(`common.weekday.${WEEKDAY_LETTERS_KEYS[new Date(`${d.date}T00:00:00`).getDay()]}`)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="home-chart-summary">
                {t('home.weekSummary', { count: weekActivity.reduce((sum, d) => sum + d.completed, 0) })}
              </p>
            </>
          )}
        </div>

        <div className="home-chart-card">
          <h2>{t('home.financeTitle', { month: formatMonthLong(new Date()) })}</h2>
          {hasFinanceActivity && monthFinance ? (
            <>
              <div className="home-finance-row">
                <div className="home-finance-icon home-finance-icon-income">
                  <ArrowUpCircle size={16} strokeWidth={1.75} />
                </div>
                <div className="home-finance-body">
                  <div className="home-finance-label-row">
                    <span className="home-finance-label">{t('home.income')}</span>
                    <span className="home-finance-value">{currency.format(monthFinance.ingresos)}</span>
                  </div>
                  <div className="home-finance-track">
                    <div
                      className="home-finance-fill home-finance-fill-income"
                      style={{ width: `${(monthFinance.ingresos / financeMax) * 100}%` }}
                    />
                  </div>
                  {renderDelta(incomeDelta)}
                </div>
              </div>
              <div className="home-finance-row">
                <div className="home-finance-icon home-finance-icon-expense">
                  <ArrowDownCircle size={16} strokeWidth={1.75} />
                </div>
                <div className="home-finance-body">
                  <div className="home-finance-label-row">
                    <span className="home-finance-label">{t('home.expenses')}</span>
                    <span className="home-finance-value">{currency.format(monthFinance.gastos)}</span>
                  </div>
                  <div className="home-finance-track">
                    <div
                      className="home-finance-fill home-finance-fill-expense"
                      style={{ width: `${(monthFinance.gastos / financeMax) * 100}%` }}
                    />
                  </div>
                  {renderDelta(expenseDelta)}
                </div>
              </div>
              <p className="home-chart-summary">
                {t('home.balance', { amount: currency.format(monthFinance.ingresos - monthFinance.gastos) })}
              </p>
            </>
          ) : (
            <p className="home-chart-summary">{t('home.noFinanceActivity')}</p>
          )}
        </div>
      </div>

      <div className="home-chart-card home-top-categories-card">
        <h2>{t('home.topCategoriesTitle')}</h2>
        {topCategories && topCategories.length > 0 ? (
          <ul className="home-top-categories-list">
            {topCategories.map((entry) => {
              const category = categoryByName.get(entry.category.toLowerCase())
              return (
                <li key={entry.category} className="home-top-category-row">
                  <CategoryBadge category={category} fallbackName={entry.category} size={26} />
                  <div className="home-finance-body">
                    <div className="home-finance-label-row">
                      <span className="home-finance-label">{entry.category}</span>
                      <span className="home-finance-value">{currency.format(entry.amount)}</span>
                    </div>
                    <div className="home-finance-track">
                      <div
                        className="home-finance-fill home-finance-fill-expense"
                        style={{ width: `${(entry.amount / topCategoriesMax) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="home-chart-summary">{t('home.noCategoryActivity')}</p>
        )}
      </div>
    </div>
  )
}
