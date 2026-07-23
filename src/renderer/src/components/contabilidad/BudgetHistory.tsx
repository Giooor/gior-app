import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { currency } from '../../lib/currency'
import { currentLocale, capitalize } from '../../lib/dateFormat'
import { shiftMonth, todayIso } from '../../../../shared/date'
import { toBaseAmount } from '../../../../shared/ledger'
import type { Category, Transaction } from '../../../../shared/ledger'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

interface Props {
  categories: Category[]
  transactions: Transaction[]
  exchangeRate: number
}

function last6Months(): string[] {
  const current = todayIso().slice(0, 7)
  const months: string[] = []
  for (let i = 5; i >= 0; i--) months.push(shiftMonth(current, -i))
  return months
}

export default function BudgetHistory({ categories, transactions, exchangeRate }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const locale = currentLocale()

  const totalBudget = useMemo(
    () => categories.reduce((sum, c) => sum + (c.budget && c.budget > 0 ? c.budget : 0), 0),
    [categories]
  )

  const months = useMemo(() => last6Months(), [])

  const spentByMonth = useMemo(() => {
    return months.map((month) =>
      transactions
        .filter((tx) => tx.type === 'gasto' && tx.date.startsWith(month))
        .reduce((sum, tx) => sum + toBaseAmount(tx.amount, tx.currency, exchangeRate), 0)
    )
  }, [months, transactions, exchangeRate])

  if (totalBudget === 0) return null

  const labels = months.map((m) => {
    const [year, mo] = m.split('-').map(Number)
    return capitalize(new Date(year, mo - 1, 1).toLocaleDateString(locale, { month: 'short' }))
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: t('ledger.budgetHistory.budgeted'),
        data: months.map(() => totalBudget),
        backgroundColor: 'rgba(99, 102, 241, 0.28)',
        borderRadius: 4
      },
      {
        label: t('ledger.budgetHistory.actual'),
        data: spentByMonth,
        backgroundColor: spentByMonth.map((spent) => (spent > totalBudget ? '#f87171' : '#34d399')),
        borderRadius: 4
      }
    ]
  }

  return (
    <div className="budget-history-card">
      <h2>{t('ledger.budgetHistory.title')}</h2>
      <div className="budget-history-canvas">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${currency.format(typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0)}`
                }
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { callback: (value) => currency.format(Number(value)) } }
            }
          }}
        />
      </div>
    </div>
  )
}
