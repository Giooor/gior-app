import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarRange, ChefHat, ShoppingCart } from 'lucide-react'
import PlanSemanal from './PlanSemanal'
import Recetario from './Recetario'
import ListaMercado from './ListaMercado'
import { mondayOf } from '../../../../shared/recipes'
import { todayIso } from '../../../../shared/date'

type Tab = 'plan' | 'recetario' | 'mercado'

export default function Recetas(): JSX.Element {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('plan')
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayIso()))
  const [focusRecipeId, setFocusRecipeId] = useState<number | null>(null)

  function handleViewRecipe(recipeId: number): void {
    setFocusRecipeId(recipeId)
    setTab('recetario')
  }

  return (
    <div className="recetas-page">
      <div className="recetas-header">
        <div>
          <h1>{t('recipes.pageTitle')}</h1>
          <p className="recetas-subtitle">{t('recipes.subtitle')}</p>
        </div>
        <div className="recetas-tab-picker" role="tablist" aria-label={t('recipes.viewAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'plan'}
            className={`recetas-tab${tab === 'plan' ? ' active' : ''}`}
            onClick={() => setTab('plan')}
          >
            <CalendarRange size={14} strokeWidth={1.75} />
            {t('recipes.tabWeekPlan')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'recetario'}
            className={`recetas-tab${tab === 'recetario' ? ' active' : ''}`}
            onClick={() => setTab('recetario')}
          >
            <ChefHat size={14} strokeWidth={1.75} />
            {t('recipes.tabRecipeBook')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mercado'}
            className={`recetas-tab${tab === 'mercado' ? ' active' : ''}`}
            onClick={() => setTab('mercado')}
          >
            <ShoppingCart size={14} strokeWidth={1.75} />
            {t('recipes.tabShoppingList')}
          </button>
        </div>
      </div>

      {tab === 'plan' && (
        <PlanSemanal weekStart={weekStart} onWeekChange={setWeekStart} onViewRecipe={handleViewRecipe} />
      )}
      {tab === 'recetario' && (
        <Recetario focusRecipeId={focusRecipeId} onFocusHandled={() => setFocusRecipeId(null)} />
      )}
      {tab === 'mercado' && <ListaMercado weekStart={weekStart} onWeekChange={setWeekStart} />}
    </div>
  )
}
