import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChefHat, ChevronDown, ChevronRight, Clock, Pencil, Plus, Star, Trash2, Users, X } from 'lucide-react'
import { RECIPE_CATEGORIES, RECIPE_CATEGORY_LABEL_KEY } from '../../../../shared/recipes'
import type { NewRecipe, NewRecipeIngredient, Recipe, RecipeCategory } from '../../../../shared/recipes'

interface FormState {
  title: string
  categories: RecipeCategory[]
  prepMinutes: string
  servings: string
  steps: string
  notes: string
  ingredients: NewRecipeIngredient[]
}

function emptyForm(): FormState {
  return {
    title: '',
    categories: ['almuerzo'],
    prepMinutes: '',
    servings: '',
    steps: '',
    notes: '',
    ingredients: [{ name: '', quantity: null, unit: '' }]
  }
}

function toNewRecipe(form: FormState): NewRecipe {
  return {
    title: form.title.trim(),
    categories: form.categories,
    prepMinutes: form.prepMinutes ? Number(form.prepMinutes) : null,
    servings: form.servings ? Number(form.servings) : null,
    steps: form.steps.trim(),
    notes: form.notes.trim(),
    ingredients: form.ingredients.filter((i) => i.name.trim())
  }
}

interface Props {
  focusRecipeId?: number | null
  onFocusHandled?: () => void
}

export default function Recetario({ focusRecipeId, onFocusHandled }: Props): JSX.Element {
  const { t } = useTranslation()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | ''>('')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (focusRecipeId == null) return
    if (!recipes.some((r) => r.id === focusRecipeId)) return

    setExpandedId(focusRecipeId)
    setCategoryFilter('')
    document.getElementById(`recipe-${focusRecipeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    onFocusHandled?.()
  }, [focusRecipeId, recipes])

  async function load(): Promise<void> {
    setLoading(true)
    const rows = await window.api.recipes.list()
    setRecipes(rows)
    setLoading(false)
  }

  function updateIngredient(index: number, patch: Partial<NewRecipeIngredient>): void {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing))
    }))
  }

  function addIngredientRow(): void {
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name: '', quantity: null, unit: '' }] }))
  }

  function toggleFormCategory(category: RecipeCategory): void {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(category)
        ? f.categories.filter((c) => c !== category)
        : [...f.categories, category]
    }))
  }

  function removeIngredientRow(index: number): void {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== index) }))
  }

  function startAdd(): void {
    setForm(emptyForm())
    setEditingId(null)
    setError('')
    setShowForm(true)
  }

  function startEdit(r: Recipe): void {
    setForm({
      title: r.title,
      categories: r.categories.length > 0 ? r.categories : ['almuerzo'],
      prepMinutes: r.prepMinutes !== null ? String(r.prepMinutes) : '',
      servings: r.servings !== null ? String(r.servings) : '',
      steps: r.steps,
      notes: r.notes,
      ingredients:
        r.ingredients.length > 0
          ? r.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
          : [{ name: '', quantity: null, unit: '' }]
    })
    setEditingId(r.id)
    setError('')
    setShowForm(true)
  }

  function cancelForm(): void {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    if (!form.title.trim()) {
      setError(t('errors.recipeTitleRequired'))
      return
    }
    if (form.categories.length === 0) {
      setError(t('errors.recipeCategoriesRequired'))
      return
    }

    const input = toNewRecipe(form)
    if (input.ingredients.length === 0) {
      setError(t('errors.ingredientNameRequired'))
      return
    }

    const result =
      editingId !== null ? await window.api.recipes.update(editingId, input) : await window.api.recipes.add(input)

    if (!result.ok) {
      setError(t(result.error ?? 'errors.recipeSaveFailed'))
      return
    }

    setShowForm(false)
    setEditingId(null)
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.recipes.remove(id)
    if (expandedId === id) setExpandedId(null)
    await load()
  }

  async function handleToggleFavorite(id: number): Promise<void> {
    await window.api.recipes.toggleFavorite(id)
    await load()
  }

  const filtered = categoryFilter ? recipes.filter((r) => r.categories.includes(categoryFilter)) : recipes
  const sorted = [...filtered].sort(
    (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || a.title.localeCompare(b.title)
  )

  return (
    <div className="recetario">
      <div className="recetario-toolbar">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as RecipeCategory | '')}>
          <option value="">{t('recipes.allCategories')}</option>
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(RECIPE_CATEGORY_LABEL_KEY[c])}
            </option>
          ))}
        </select>
        <button type="button" className="icon-button-primary" onClick={startAdd} aria-label={t('recipes.addAria')}>
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {showForm && (
        <form className="recipe-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('recipes.titlePlaceholder')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />

          <div className="field">
            <label>{t('recipes.categoriesLabel')}</label>
            <div className="recipe-category-picker" role="group" aria-label={t('recipes.categoriesLabel')}>
              {RECIPE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={form.categories.includes(c)}
                  className={`recipe-category-chip${form.categories.includes(c) ? ' active' : ''}`}
                  onClick={() => toggleFormCategory(c)}
                >
                  {t(RECIPE_CATEGORY_LABEL_KEY[c])}
                </button>
              ))}
            </div>
          </div>

          <div className="recipe-form-row">
            <div className="field">
              <label htmlFor="recipe-prep">{t('recipes.prepTimeLabel')}</label>
              <input
                id="recipe-prep"
                type="number"
                min="0"
                value={form.prepMinutes}
                onChange={(e) => setForm({ ...form, prepMinutes: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="recipe-servings">{t('recipes.servingsLabel')}</label>
              <input
                id="recipe-servings"
                type="number"
                min="0"
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: e.target.value })}
              />
            </div>
          </div>

          <div className="recipe-ingredients-editor">
            <label>{t('recipes.ingredientsLabel')}</label>
            {form.ingredients.map((ing, i) => (
              <div className="recipe-ingredient-row" key={i}>
                <input
                  type="text"
                  placeholder={t('recipes.ingredientPlaceholder')}
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={t('recipes.quantityPlaceholder')}
                  value={ing.quantity ?? ''}
                  onChange={(e) => updateIngredient(i, { quantity: e.target.value ? Number(e.target.value) : null })}
                />
                <input
                  type="text"
                  placeholder={t('recipes.unitPlaceholder')}
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  onClick={() => removeIngredientRow(i)}
                  aria-label={t('recipes.removeIngredientAria')}
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>
            ))}
            <button type="button" className="pill-button" onClick={addIngredientRow}>
              {t('recipes.addIngredient')}
            </button>
          </div>

          <div className="field">
            <label htmlFor="recipe-steps">{t('recipes.stepsLabel')}</label>
            <textarea
              id="recipe-steps"
              rows={4}
              placeholder={t('recipes.stepsPlaceholder')}
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="recipe-notes">{t('recipes.notesLabel')}</label>
            <input
              id="recipe-notes"
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="reminder-form-actions">
            <button type="submit" className="ledger-submit">
              {t('recipes.saveRecipe')}
            </button>
            <button type="button" className="pill-button" onClick={cancelForm}>
              {t('common.cancel')}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </form>
      )}

      {loading ? (
        <p className="tasks-loading">{t('common.loading')}</p>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <ChefHat size={28} strokeWidth={1.5} />
          <p>{t('recipes.emptyState')}</p>
        </div>
      ) : (
        <ul className="recipe-list">
          {sorted.map((r) => {
            const expanded = expandedId === r.id
            return (
              <li key={r.id} id={`recipe-${r.id}`} className="recipe-item">
                <div className="recipe-item-row" onClick={() => setExpandedId(expanded ? null : r.id)}>
                  {expanded ? (
                    <ChevronDown size={16} strokeWidth={1.75} />
                  ) : (
                    <ChevronRight size={16} strokeWidth={1.75} />
                  )}
                  <span className="recipe-item-title">{r.title}</span>
                  <span className="recipe-category-badges">
                    {r.categories.map((c) => (
                      <span key={c} className="recipe-category-badge">
                        {t(RECIPE_CATEGORY_LABEL_KEY[c])}
                      </span>
                    ))}
                  </span>
                  {r.prepMinutes !== null && (
                    <span className="recipe-meta">
                      <Clock size={12} strokeWidth={1.75} />
                      {t('recipes.minutesShort', { n: r.prepMinutes })}
                    </span>
                  )}
                  {r.servings !== null && (
                    <span className="recipe-meta">
                      <Users size={12} strokeWidth={1.75} />
                      {r.servings}
                    </span>
                  )}
                  <div className="recipe-item-actions">
                    <button
                      type="button"
                      className={`icon-button recipe-favorite${r.favorite ? ' active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(r.id)
                      }}
                      aria-label={t('recipes.favoriteAria')}
                    >
                      <Star size={15} strokeWidth={1.75} fill={r.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(r)
                      }}
                      aria-label={t('recipes.editAria')}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(r.id)
                      }}
                      aria-label={t('recipes.deleteAria')}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="recipe-details">
                    <div className="recipe-details-ingredients">
                      <h3>{t('recipes.ingredientsLabel')}</h3>
                      <ul>
                        {r.ingredients.map((ing) => (
                          <li key={ing.id}>
                            {ing.quantity !== null && `${ing.quantity} `}
                            {ing.unit} {ing.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {r.steps && (
                      <div className="recipe-details-steps">
                        <h3>{t('recipes.stepsLabel')}</h3>
                        <ol>
                          {r.steps
                            .split('\n')
                            .filter((s) => s.trim())
                            .map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                        </ol>
                      </div>
                    )}
                    {r.notes && <p className="recipe-details-notes">{r.notes}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
