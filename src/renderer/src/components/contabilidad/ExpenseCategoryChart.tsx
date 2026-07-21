import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Doughnut } from 'react-chartjs-2'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import CategoryBadge from './CategoryBadge'
import { currency } from '../../lib/currency'
import { CATEGORY_COLOR_HEX } from '../../lib/categoryIcons'
import { toBaseAmount } from '../../../../shared/ledger'
import type { Category, Transaction } from '../../../../shared/ledger'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  categories: Category[]
  monthTransactions: Transaction[]
  exchangeRate: number
}

const FALLBACK_COLOR = '#94a3b8'

export default function ExpenseCategoryChart({ categories, monthTransactions, exchangeRate }: Props): JSX.Element | null {
  const { t } = useTranslation()

  const categoryByName = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c])),
    [categories]
  )

  const spend = useMemo(() => {
    const totals = new Map<string, number>()
    for (const tx of monthTransactions) {
      if (tx.type !== 'gasto') continue
      const amount = toBaseAmount(tx.amount, tx.currency, exchangeRate)
      totals.set(tx.category, (totals.get(tx.category) ?? 0) + amount)
    }
    return Array.from(totals, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
  }, [monthTransactions, exchangeRate])

  if (spend.length === 0) return null

  const total = spend.reduce((sum, s) => sum + s.amount, 0)
  const colors = spend.map((s) => {
    const category = categoryByName.get(s.category.toLowerCase())
    return category?.color ? CATEGORY_COLOR_HEX[category.color] : FALLBACK_COLOR
  })

  const chartData = {
    labels: spend.map((s) => s.category),
    datasets: [
      {
        data: spend.map((s) => s.amount),
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 6
      }
    ]
  }

  return (
    <div className="expense-chart-card">
      <h2>{t('ledger.expenseChart.title')}</h2>
      <div className="expense-chart-row">
        <div className="expense-chart-canvas">
          <Doughnut
            data={chartData}
            options={{
              cutout: '68%',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const value = typeof ctx.parsed === 'number' ? ctx.parsed : 0
                      const pct = total > 0 ? Math.round((value / total) * 100) : 0
                      return `${ctx.label}: ${currency.format(value)} (${pct}%)`
                    }
                  }
                }
              }
            }}
          />
        </div>
        <ul className="expense-chart-legend">
          {spend.map((s) => {
            const category = categoryByName.get(s.category.toLowerCase())
            const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0
            return (
              <li key={s.category} className="expense-chart-legend-row">
                <CategoryBadge category={category} fallbackName={s.category} size={22} />
                <div className="expense-chart-legend-body">
                  <span className="expense-chart-legend-name">{s.category}</span>
                  <span className="expense-chart-legend-value">
                    {currency.format(s.amount)} · {pct}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
