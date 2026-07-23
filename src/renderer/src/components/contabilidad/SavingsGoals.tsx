import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { formatByCurrency } from '../../lib/currency'
import { todayIso } from '../../../../shared/date'
import { TRANSACTION_CURRENCIES } from '../../../../shared/ledger'
import type { TransactionCurrency } from '../../../../shared/ledger'
import type { SavingsGoal } from '../../../../shared/savings'

export default function SavingsGoals(): JSX.Element {
  const { t } = useTranslation()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currency, setCurrency] = useState<TransactionCurrency>('COP')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState('')
  const [contributionInputs, setContributionInputs] = useState<Record<number, string>>({})

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    const rows = await window.api.savingsGoals.list()
    setGoals(rows)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const parsedAmount = Number(targetAmount)
    if (!title.trim()) {
      setError(t('errors.titleRequired'))
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('errors.amountRequired'))
      return
    }

    const result = await window.api.savingsGoals.add({
      title: title.trim(),
      targetAmount: parsedAmount,
      currency,
      targetDate: targetDate || null
    })
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    setTitle('')
    setTargetAmount('')
    setCurrency('COP')
    setTargetDate('')
    setShowForm(false)
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.savingsGoals.remove(id)
    await load()
  }

  async function handleContribute(goalId: number): Promise<void> {
    const raw = contributionInputs[goalId]
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount <= 0) return

    await window.api.savingsContributions.add({ goalId, amount, date: todayIso() })
    setContributionInputs((current) => ({ ...current, [goalId]: '' }))
    await load()
  }

  return (
    <div className="savings-card">
      <div className="savings-card-header">
        <h2>{t('ledger.savings.title')}</h2>
        <button
          type="button"
          className="icon-button-primary"
          onClick={() => setShowForm((v) => !v)}
          aria-label={t('ledger.savings.addAria')}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      {showForm && (
        <form className="savings-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('ledger.savings.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={t('ledger.savings.targetPlaceholder')}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as TransactionCurrency)}
            aria-label={t('ledger.currencyLabel')}
          >
            {TRANSACTION_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            aria-label={t('ledger.savings.targetDateAria')}
          />
          <button type="submit" className="ledger-submit">
            {t('common.add')}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}

      {goals.length === 0 ? (
        <p className="empty-state">{t('ledger.savings.emptyState')}</p>
      ) : (
        <ul className="savings-list">
          {goals.map((g) => {
            const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100)
            const reached = g.savedAmount >= g.targetAmount

            return (
              <li key={g.id} className="savings-row">
                <div className="savings-row-header">
                  <span className="savings-row-icon">
                    <PiggyBank size={16} strokeWidth={1.75} />
                  </span>
                  <span className="savings-row-name">{g.title}</span>
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => handleDelete(g.id)}
                    aria-label={t('ledger.savings.deleteAria')}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>

                <div className="savings-track">
                  <div className={`savings-fill${reached ? ' savings-fill-done' : ''}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="savings-row-meta">
                  <span>
                    {formatByCurrency(g.savedAmount, g.currency)} / {formatByCurrency(g.targetAmount, g.currency)}
                  </span>
                  <span>{reached ? t('ledger.savings.reached') : `${Math.round(pct)}%`}</span>
                </div>

                {g.targetDate && (
                  <span className="savings-row-date">{t('ledger.savings.targetDateLabel', { date: g.targetDate })}</span>
                )}

                {!reached && (
                  <div className="savings-contribute-row">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('ledger.savings.contributePlaceholder')}
                      value={contributionInputs[g.id] ?? ''}
                      onChange={(e) => setContributionInputs((c) => ({ ...c, [g.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleContribute(g.id)}
                    />
                    <button type="button" className="pill-button" onClick={() => handleContribute(g.id)}>
                      {t('ledger.savings.contributeButton')}
                    </button>
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
