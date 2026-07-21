import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import { currency } from '../../lib/currency'
import { toBaseAmount } from '../../../../shared/ledger'
import type { Category, Transaction } from '../../../../shared/ledger'

interface Props {
  categories: Category[]
  monthTransactions: Transaction[]
  exchangeRate: number
}

type BudgetStatus = 'ok' | 'warning' | 'danger'

function statusFor(pct: number): BudgetStatus {
  if (pct >= 100) return 'danger'
  if (pct >= 80) return 'warning'
  return 'ok'
}

export default function CategoryBudgets({ categories, monthTransactions, exchangeRate }: Props): JSX.Element | null {
  const { t } = useTranslation()

  const budgeted = categories.filter((c): c is Category & { budget: number } => !!c.budget && c.budget > 0)
  if (budgeted.length === 0) return null

  const spentByCategory = new Map<string, number>()
  for (const tx of monthTransactions) {
    if (tx.type !== 'gasto') continue
    const key = tx.category.toLowerCase()
    const amount = toBaseAmount(tx.amount, tx.currency, exchangeRate)
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + amount)
  }

  return (
    <div className="budgets-card">
      <h2>{t('ledger.budgets.title')}</h2>
      <ul className="budgets-list">
        {budgeted.map((c) => {
          const spent = spentByCategory.get(c.name.toLowerCase()) ?? 0
          const pct = (spent / c.budget) * 100
          const status = statusFor(pct)
          return (
            <li key={c.id} className="budgets-row">
              <CategoryBadge category={c} fallbackName={c.name} size={26} />
              <div className="budgets-row-body">
                <div className="budgets-row-header">
                  <span className="budgets-row-name">{c.name}</span>
                  <span className="budgets-row-amounts">
                    {t('ledger.budgets.spentOf', { spent: currency.format(spent), budget: currency.format(c.budget) })}
                  </span>
                </div>
                <div className="budgets-track">
                  <div className={`budgets-fill budgets-fill-${status}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                {status !== 'ok' && (
                  <p className={`budgets-alert budgets-alert-${status}`}>
                    <AlertTriangle size={12} strokeWidth={2} />
                    {status === 'danger'
                      ? t('ledger.budgets.overBudget', { amount: currency.format(spent - c.budget) })
                      : t('ledger.budgets.nearLimit')}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
