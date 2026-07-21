import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { addDays, mondayOf } from '../../../../shared/recipes'
import { weekdayName } from '../../../../shared/reminders'
import { currentLocale, capitalize } from '../../lib/dateFormat'
import { todayIso } from '../../../../shared/date'
import type { ShoppingListItem } from '../../../../shared/recipes'

interface Props {
  weekStart: string
  onWeekChange: (week: string) => void
}

export default function ListaMercado({ weekStart, onWeekChange }: Props): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()

  function formatDayHeader(iso: string): string {
    const d = new Date(`${iso}T00:00:00`)
    return `${capitalize(weekdayName(d.getDay(), locale)).slice(0, 3)} ${d.getDate()}`
  }

  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')

  useEffect(() => {
    load()
  }, [weekStart])

  async function load(): Promise<void> {
    setLoading(true)
    const rows = await window.api.shoppingList.list(weekStart)
    setItems(rows)
    setLoading(false)
  }

  async function handleGenerate(): Promise<void> {
    await window.api.shoppingList.generate(weekStart)
    await load()
  }

  async function handleToggle(id: number): Promise<void> {
    await window.api.shoppingList.toggleItem(id)
    await load()
  }

  async function handleRemove(id: number): Promise<void> {
    await window.api.shoppingList.removeItem(id)
    await load()
  }

  async function handleClear(): Promise<void> {
    await window.api.shoppingList.clear(weekStart)
    await load()
  }

  async function handleAdd(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!name.trim()) return

    await window.api.shoppingList.addItem({
      weekStart,
      name: name.trim(),
      quantity: quantity ? Number(quantity) : null,
      unit: unit.trim()
    })
    setName('')
    setQuantity('')
    setUnit('')
    await load()
  }

  const pending = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  return (
    <div className="shopping-list">
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
          {formatDayHeader(weekStart)} – {formatDayHeader(addDays(weekStart, 6))}
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

      <div className="shopping-list-actions">
        <button type="button" className="pill-button" onClick={handleGenerate}>
          <RefreshCw size={13} strokeWidth={1.75} />
          {t('recipes.generateFromPlan')}
        </button>
        {items.length > 0 && (
          <button type="button" className="pill-button" onClick={handleClear}>
            {t('recipes.clearList')}
          </button>
        )}
      </div>

      <form className="shopping-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t('recipes.addItemPlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.1"
          placeholder={t('recipes.quantityPlaceholder')}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          type="text"
          placeholder={t('recipes.unitPlaceholder')}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <button type="submit" className="icon-button-primary" aria-label={t('recipes.addItemAria')}>
          <Plus size={16} strokeWidth={2} />
        </button>
      </form>

      {loading ? (
        <p className="tasks-loading">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>{t('recipes.emptyShoppingList')}</p>
        </div>
      ) : (
        <>
          <ul className="shopping-list-items">
            {pending.map((item) => (
              <li key={item.id} className="shopping-item">
                <label className="shopping-item-checkbox">
                  <input type="checkbox" checked={item.checked} onChange={() => handleToggle(item.id)} />
                  <span className="shopping-item-checkmark" />
                  <span className="shopping-item-name">
                    {item.quantity !== null && `${item.quantity} `}
                    {item.unit} {item.name}
                  </span>
                </label>
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  onClick={() => handleRemove(item.id)}
                  aria-label={t('recipes.deleteItemAria')}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
          {done.length > 0 && (
            <>
              <p className="shopping-done-label">{t('recipes.purchasedLabel', { count: done.length })}</p>
              <ul className="shopping-list-items">
                {done.map((item) => (
                  <li key={item.id} className="shopping-item completed">
                    <label className="shopping-item-checkbox">
                      <input type="checkbox" checked={item.checked} onChange={() => handleToggle(item.id)} />
                      <span className="shopping-item-checkmark" />
                      <span className="shopping-item-name">
                        {item.quantity !== null && `${item.quantity} `}
                        {item.unit} {item.name}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleRemove(item.id)}
                      aria-label={t('recipes.deleteItemAria')}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
