import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ExternalLink, Pencil, Trash2, X } from 'lucide-react'
import { formatByCurrency } from '../../lib/currency'
import { TRANSACTION_CURRENCIES } from '../../../../shared/ledger'
import type {
  Category,
  NewRecurringTransaction,
  RecurringTransaction,
  TransactionCurrency,
  TransactionType,
  UpdateRecurringTransaction
} from '../../../../shared/ledger'

interface Props {
  categories: Category[]
}

export default function RecurringTransactions({ categories }: Props): JSX.Element {
  const { t } = useTranslation()
  const [rules, setRules] = useState<RecurringTransaction[]>([])
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('gasto')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<TransactionCurrency>('COP')
  const [paymentUrl, setPaymentUrl] = useState('')
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editType, setEditType] = useState<TransactionType>('gasto')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCurrency, setEditCurrency] = useState<TransactionCurrency>('COP')
  const [editPaymentUrl, setEditPaymentUrl] = useState('')
  const [editError, setEditError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    const rows = await window.api.recurringTransactions.list()
    setRules(rows)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const parsedAmount = Number(amount)
    if (!category.trim()) {
      setError(t('errors.categorySelectRequired'))
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('errors.amountRequired'))
      return
    }

    const input: NewRecurringTransaction = {
      type,
      category: category.trim(),
      description: description.trim(),
      amount: parsedAmount,
      currency,
      paymentUrl: paymentUrl.trim() || null
    }

    const result = await window.api.recurringTransactions.add(input)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    setCategory('')
    setDescription('')
    setAmount('')
    setCurrency('COP')
    setPaymentUrl('')
    await load()
  }

  async function handleToggle(id: number): Promise<void> {
    await window.api.recurringTransactions.toggle(id)
    await load()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.recurringTransactions.remove(id)
    await load()
  }

  function startEdit(rule: RecurringTransaction): void {
    setEditingId(rule.id)
    setEditType(rule.type)
    setEditCategory(rule.category)
    setEditDescription(rule.description)
    setEditAmount(String(rule.amount))
    setEditCurrency(rule.currency)
    setEditPaymentUrl(rule.paymentUrl ?? '')
    setEditError('')
  }

  function cancelEdit(): void {
    setEditingId(null)
  }

  async function handleEditSubmit(id: number): Promise<void> {
    setEditError('')

    const parsedAmount = Number(editAmount)
    if (!editCategory.trim()) {
      setEditError(t('errors.categorySelectRequired'))
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditError(t('errors.amountRequired'))
      return
    }

    const input: UpdateRecurringTransaction = {
      type: editType,
      category: editCategory.trim(),
      description: editDescription.trim(),
      amount: parsedAmount,
      currency: editCurrency,
      paymentUrl: editPaymentUrl.trim() || null
    }

    const result = await window.api.recurringTransactions.update(id, input)
    if (!result.ok) {
      setEditError(t(result.error ?? 'errors.generic'))
      return
    }

    setEditingId(null)
    await load()
  }

  function openPaymentLink(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="recurring-panel">
      <button type="button" className="recurring-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} {t('ledger.recurring.title')}
        {rules.length > 0 && ` (${rules.length})`}
      </button>

      {open && (
        <div className="recurring-body">
          <form className="recurring-form" onSubmit={handleSubmit}>
            <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="gasto">{t('ledger.expenseType')}</option>
              <option value="ingreso">{t('ledger.incomeType')}</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>
                {t('ledger.recurring.categoryPlaceholder')}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={t('ledger.recurring.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={t('ledger.recurring.amountPlaceholder')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              type="url"
              placeholder={t('ledger.recurring.paymentUrlPlaceholder')}
              value={paymentUrl}
              onChange={(e) => setPaymentUrl(e.target.value)}
              className="recurring-payment-url-input"
            />
            <button type="submit" className="ledger-submit">
              {t('common.add')}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {rules.length === 0 ? (
            <p className="empty-state">{t('ledger.recurring.emptyState')}</p>
          ) : (
            <ul className="recurring-list">
              {rules.map((r) => {
                if (editingId === r.id) {
                  return (
                    <li key={r.id} className="recurring-item recurring-item-editing">
                      <div className="recurring-edit-row">
                        <select value={editType} onChange={(e) => setEditType(e.target.value as TransactionType)}>
                          <option value="gasto">{t('ledger.expenseType')}</option>
                          <option value="ingreso">{t('ledger.incomeType')}</option>
                        </select>
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                          <option value="" disabled>
                            {t('ledger.recurring.categoryPlaceholder')}
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder={t('ledger.recurring.descriptionPlaceholder')}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t('ledger.recurring.amountPlaceholder')}
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                        <select
                          value={editCurrency}
                          onChange={(e) => setEditCurrency(e.target.value as TransactionCurrency)}
                          aria-label={t('ledger.currencyLabel')}
                        >
                          {TRANSACTION_CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          type="url"
                          placeholder={t('ledger.recurring.paymentUrlPlaceholder')}
                          value={editPaymentUrl}
                          onChange={(e) => setEditPaymentUrl(e.target.value)}
                          className="recurring-payment-url-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSubmit(r.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <div className="recurring-edit-actions">
                          <button
                            type="button"
                            className="icon-button icon-button-save"
                            onClick={() => handleEditSubmit(r.id)}
                            aria-label={t('common.save')}
                          >
                            <Check size={16} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={cancelEdit}
                            aria-label={t('common.cancel')}
                          >
                            <X size={16} strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                      {editError && <p className="error">{editError}</p>}
                    </li>
                  )
                }

                return (
                  <li key={r.id} className={r.active ? 'recurring-item' : 'recurring-item inactive'}>
                    <label className="recurring-check">
                      <input type="checkbox" checked={r.active} onChange={() => handleToggle(r.id)} />
                      <span>
                        <span className={`type-badge type-${r.type}`}>
                          {r.type === 'ingreso' ? t('ledger.incomeType') : t('ledger.expenseType')}
                        </span>{' '}
                        {r.category}
                        {r.description && ` · ${r.description}`}
                      </span>
                    </label>
                    <span className="recurring-amount">
                      {formatByCurrency(r.amount, r.currency)}
                      {r.currency === 'USD' && <span className="currency-tag">USD</span>}
                    </span>
                    {r.paymentUrl && (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => openPaymentLink(r.paymentUrl as string)}
                        aria-label={t('ledger.recurring.payAria')}
                        title={t('ledger.recurring.payAria')}
                      >
                        <ExternalLink size={16} strokeWidth={1.75} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startEdit(r)}
                      aria-label={t('ledger.recurring.editAria')}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(r.id)}
                      aria-label={t('ledger.recurring.deleteAria')}
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="recurring-hint">{t('ledger.recurring.hint')}</p>
        </div>
      )}
    </div>
  )
}
