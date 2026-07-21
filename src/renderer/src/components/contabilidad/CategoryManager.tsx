import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import { currency } from '../../lib/currency'
import { CATEGORY_ICON_COMPONENT } from '../../lib/categoryIcons'
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_LABEL_KEY,
  CATEGORY_ICONS,
  CATEGORY_ICON_LABEL_KEY
} from '../../../../shared/ledger'
import type { Category, CategoryColor, CategoryIcon } from '../../../../shared/ledger'

interface Props {
  categories: Category[]
  onChange: () => Promise<void>
}

interface Draft {
  name: string
  icon: CategoryIcon | null
  color: CategoryColor | null
  budget: string
}

const EMPTY_DRAFT: Draft = { name: '', icon: null, color: null, budget: '' }

function parseBudget(value: string): number | null {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : null
}

export default function CategoryManager({ categories, onChange }: Props): JSX.Element {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editError, setEditError] = useState('')

  async function handleAdd(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    if (!draft.name.trim()) {
      setError(t('errors.categoryRequired'))
      return
    }

    const budget = parseBudget(draft.budget)
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      setError(t('errors.invalidBudget'))
      return
    }

    const result = await window.api.categories.add({
      name: draft.name.trim(),
      icon: draft.icon,
      color: draft.color,
      budget
    })
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    setDraft(EMPTY_DRAFT)
    await onChange()
  }

  function startEdit(category: Category): void {
    setEditingId(category.id)
    setEditDraft({
      name: category.name,
      icon: category.icon as CategoryIcon | null,
      color: category.color as CategoryColor | null,
      budget: category.budget !== null ? String(category.budget) : ''
    })
    setEditError('')
  }

  function cancelEdit(): void {
    setEditingId(null)
  }

  async function handleEditSubmit(id: number): Promise<void> {
    setEditError('')

    if (!editDraft.name.trim()) {
      setEditError(t('errors.categoryRequired'))
      return
    }

    const budget = parseBudget(editDraft.budget)
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      setEditError(t('errors.invalidBudget'))
      return
    }

    const result = await window.api.categories.update(id, {
      name: editDraft.name.trim(),
      icon: editDraft.icon,
      color: editDraft.color,
      budget
    })
    if (!result.ok) {
      setEditError(t(result.error ?? 'errors.generic'))
      return
    }

    setEditingId(null)
    await onChange()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.categories.remove(id)
    await onChange()
  }

  return (
    <div className="category-manager">
      {categories.length === 0 ? (
        <p className="empty-state">{t('ledger.categoryManager.emptyState')}</p>
      ) : (
        <ul className="category-manager-list">
          {categories.map((c) => (
            <li key={c.id} className="category-manager-item">
              {editingId === c.id ? (
                <form
                  className="category-manager-edit-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleEditSubmit(c.id)
                  }}
                >
                  <input
                    type="text"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                    autoFocus
                  />
                  <div className="category-manager-item-actions">
                    <button type="submit" className="icon-button icon-button-save" aria-label={t('common.save')}>
                      <Check size={16} strokeWidth={2} />
                    </button>
                    <button type="button" className="icon-button" onClick={cancelEdit} aria-label={t('common.cancel')}>
                      <X size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                  <IconPicker value={editDraft.icon} onChange={(icon) => setEditDraft({ ...editDraft, icon })} />
                  <ColorPicker value={editDraft.color} onChange={(color) => setEditDraft({ ...editDraft, color })} />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="category-manager-budget-input"
                    placeholder={t('ledger.categoryManager.budgetPlaceholder')}
                    value={editDraft.budget}
                    onChange={(e) => setEditDraft({ ...editDraft, budget: e.target.value })}
                  />
                </form>
              ) : (
                <>
                  <CategoryBadge category={c} fallbackName={c.name} />
                  <div className="category-manager-item-info">
                    <span className="category-manager-item-name">{c.name}</span>
                    {c.budget !== null && (
                      <span className="category-manager-item-budget">
                        {t('ledger.categoryManager.budgetPerMonth', { amount: currency.format(c.budget) })}
                      </span>
                    )}
                  </div>
                  <div className="category-manager-item-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startEdit(c)}
                      aria-label={t('ledger.categoryManager.editAria')}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(c.id)}
                      aria-label={t('ledger.categoryManager.deleteAria')}
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {editError && <p className="error">{editError}</p>}

      <form className="category-manager-add-form" onSubmit={handleAdd}>
        <div className="category-manager-add-row">
          <input
            type="text"
            placeholder={t('ledger.categoryManager.namePlaceholder')}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <button type="submit" className="icon-button icon-button-save" aria-label={t('ledger.categoryManager.addAria')}>
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
        <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
        <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
        <input
          type="number"
          min="0"
          step="1000"
          className="category-manager-budget-input"
          placeholder={t('ledger.categoryManager.budgetPlaceholder')}
          value={draft.budget}
          onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
        />
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  )
}

interface IconPickerProps {
  value: CategoryIcon | null
  onChange: (icon: CategoryIcon | null) => void
}

function IconPicker({ value, onChange }: IconPickerProps): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="category-icon-picker" role="radiogroup" aria-label={t('ledger.categoryManager.iconLabel')}>
      {CATEGORY_ICONS.map((icon) => {
        const Icon = CATEGORY_ICON_COMPONENT[icon]
        const active = value === icon
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(CATEGORY_ICON_LABEL_KEY[icon])}
            title={t(CATEGORY_ICON_LABEL_KEY[icon])}
            className={`category-icon-swatch${active ? ' active' : ''}`}
            onClick={() => onChange(active ? null : icon)}
          >
            <Icon size={14} strokeWidth={1.75} />
          </button>
        )
      })}
    </div>
  )
}

interface ColorPickerProps {
  value: CategoryColor | null
  onChange: (color: CategoryColor | null) => void
}

function ColorPicker({ value, onChange }: ColorPickerProps): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="category-color-picker" role="radiogroup" aria-label={t('ledger.categoryManager.colorLabel')}>
      {CATEGORY_COLORS.map((c) => {
        const active = value === c
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(CATEGORY_COLOR_LABEL_KEY[c])}
            title={t(CATEGORY_COLOR_LABEL_KEY[c])}
            className={`category-color-dot category-color-dot-${c}${active ? ' active' : ''}`}
            onClick={() => onChange(active ? null : c)}
          />
        )
      })}
    </div>
  )
}
