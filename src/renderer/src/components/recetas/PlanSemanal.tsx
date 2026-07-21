import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import { MEAL_TYPES, MEAL_TYPE_LABEL_KEY, addDays, mondayOf, weekDays } from '../../../../shared/recipes'
import { weekdayName } from '../../../../shared/reminders'
import { currentLocale, capitalize } from '../../lib/dateFormat'
import { todayIso } from '../../../../shared/date'
import type { MealPlanEntry, MealType, Recipe } from '../../../../shared/recipes'

interface Props {
  weekStart: string
  onWeekChange: (week: string) => void
  onViewRecipe: (recipeId: number) => void
}

export default function PlanSemanal({ weekStart, onWeekChange, onViewRecipe }: Props): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()

  function formatDayHeader(iso: string): string {
    const d = new Date(`${iso}T00:00:00`)
    return `${capitalize(weekdayName(d.getDay(), locale)).slice(0, 3)} ${d.getDate()}`
  }

  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editingCell, setEditingCell] = useState<{ date: string; mealType: MealType } | null>(null)

  const days = weekDays(weekStart)

  useEffect(() => {
    load()
  }, [weekStart])

  useEffect(() => {
    window.api.recipes.list().then(setRecipes)
  }, [])

  async function load(): Promise<void> {
    const rows = await window.api.mealPlan.list(weekStart, addDays(weekStart, 6))
    setEntries(rows)
  }

  function entryFor(date: string, mealType: MealType): MealPlanEntry | undefined {
    return entries.find((e) => e.date === date && e.mealType === mealType)
  }

  async function handleAssign(date: string, mealType: MealType, recipeId: number): Promise<void> {
    await window.api.mealPlan.set({ date, mealType, recipeId })
    setEditingCell(null)
    await load()
  }

  async function handleRemove(id: number): Promise<void> {
    await window.api.mealPlan.remove(id)
    await load()
  }

  return (
    <div className="mealplan">
      <div className="mealplan-week-nav">
        <button
          type="button"
          className="date-nav-button"
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          aria-label={t('recipes.prevWeekAria')}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <span className="mealplan-week-label">
          {formatDayHeader(days[0])} – {formatDayHeader(days[6])}
        </span>
        <button
          type="button"
          className="date-nav-button"
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          aria-label={t('recipes.nextWeekAria')}
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
        {weekStart !== mondayOf(todayIso()) && (
          <button
            type="button"
            className="pill-button pill-button-accent"
            onClick={() => onWeekChange(mondayOf(todayIso()))}
          >
            {t('recipes.thisWeek')}
          </button>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>{t('recipes.noRecipesHint')}</p>
        </div>
      ) : (
        <div className="mealplan-grid">
          <div className="mealplan-grid-corner" />
          {days.map((d) => (
            <div key={d} className={`mealplan-day-header${d === todayIso() ? ' today' : ''}`}>
              {formatDayHeader(d)}
            </div>
          ))}

          {MEAL_TYPES.map((mealType) => (
            <Fragment key={mealType}>
              <div className="mealplan-row-label">{t(MEAL_TYPE_LABEL_KEY[mealType])}</div>
              {days.map((d) => {
                const entry = entryFor(d, mealType)
                const editing = editingCell?.date === d && editingCell.mealType === mealType
                return (
                  <div key={`${d}-${mealType}`} className="mealplan-cell">
                    {editing ? (
                      <select
                        autoFocus
                        className="mealplan-select"
                        defaultValue=""
                        onChange={(e) => e.target.value && handleAssign(d, mealType, Number(e.target.value))}
                        onBlur={() => setEditingCell(null)}
                      >
                        <option value="" disabled>
                          {t('recipes.selectPlaceholder')}
                        </option>
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    ) : entry ? (
                      <div className="mealplan-entry" onClick={() => setEditingCell({ date: d, mealType })}>
                        <span className="mealplan-entry-title">{entry.recipeTitle}</span>
                        <div className="mealplan-entry-actions">
                          <button
                            type="button"
                            className="mealplan-entry-view"
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewRecipe(entry.recipeId)
                            }}
                            aria-label={t('recipes.viewRecipeAria')}
                            title={t('recipes.viewRecipeAria')}
                          >
                            <Eye size={16} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className="mealplan-entry-remove"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemove(entry.id)
                            }}
                            aria-label={t('recipes.removeFromPlanAria')}
                          >
                            <X size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mealplan-cell-empty"
                        onClick={() => setEditingCell({ date: d, mealType })}
                        aria-label={t('recipes.addMealAria', { meal: t(MEAL_TYPE_LABEL_KEY[mealType]) })}
                      >
                        +
                      </button>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
