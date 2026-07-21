import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Pencil,
  Repeat,
  Scale,
  Settings,
  Target,
  Trash2,
  X
} from 'lucide-react'
import { currency, formatByCurrency } from '../../lib/currency'
import RecurringTransactions from './RecurringTransactions'
import ContabilidadSettingsPanel from './ContabilidadSettingsPanel'
import CategoryBudgets from './CategoryBudgets'
import ExpenseCategoryChart from './ExpenseCategoryChart'
import CategoryBadge from './CategoryBadge'
import { currentLocale, capitalize } from '../../lib/dateFormat'
import { shiftMonth, todayIso } from '../../../../shared/date'
import { DEFAULT_USD_TO_COP_RATE, TRANSACTION_CURRENCIES, toBaseAmount } from '../../../../shared/ledger'
import type {
  Category,
  MonthlyGoal,
  NewTransaction,
  ReportPeriod,
  ReportPeriodType,
  Transaction,
  TransactionCurrency,
  TransactionType,
  UpdateTransaction
} from '../../../../shared/ledger'

const NEW_CATEGORY_VALUE = '__new__'

function currentMonth(): string {
  return todayIso().slice(0, 7)
}

export default function Contabilidad(): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()

  function formatHeaderMonth(month: string): string {
    const [year, m] = month.split('-').map(Number)
    const label = new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'long' })
    const capped = capitalize(label)
    return year === new Date().getFullYear() ? capped : `${capped} ${year}`
  }

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [exchangeRate, setExchangeRate] = useState(DEFAULT_USD_TO_COP_RATE)

  const [exportPeriodType, setExportPeriodType] = useState<ReportPeriodType>('month')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMessage, setExportMessage] = useState('')

  const [date, setDate] = useState(todayIso())
  const [type, setType] = useState<TransactionType>('gasto')
  const [category, setCategory] = useState('')
  const [isNewCategory, setIsNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [txCurrency, setTxCurrency] = useState<TransactionCurrency>('COP')

  const [categoryFilter, setCategoryFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState(currentMonth)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [amountMinFilter, setAmountMinFilter] = useState('')
  const [amountMaxFilter, setAmountMaxFilter] = useState('')

  const [goal, setGoal] = useState<MonthlyGoal | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [incomeGoalInput, setIncomeGoalInput] = useState('')
  const [expenseGoalInput, setExpenseGoalInput] = useState('')
  const [goalError, setGoalError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState<TransactionType>('gasto')
  const [editCategory, setEditCategory] = useState('')
  const [editIsNewCategory, setEditIsNewCategory] = useState(false)
  const [editNewCategoryName, setEditNewCategoryName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCurrency, setEditCurrency] = useState<TransactionCurrency>('COP')
  const [editError, setEditError] = useState('')

  useEffect(() => {
    loadTransactions()
    loadCategories()
    window.api.ledger.getExchangeRate().then(setExchangeRate)
  }, [])

  useEffect(() => {
    setEditingGoal(false)
    window.api.ledger.getGoal(monthFilter).then((g) => {
      setGoal(g)
      setIncomeGoalInput(g ? String(g.incomeGoal) : '')
      setExpenseGoalInput(g ? String(g.expenseGoal) : '')
    })
  }, [monthFilter])

  async function loadTransactions(): Promise<void> {
    setLoading(true)
    const rows = await window.api.ledger.list()
    setTransactions(rows)
    setLoading(false)
  }

  async function loadCategories(): Promise<void> {
    const rows = await window.api.categories.list()
    setCategories(rows)
  }

  function handleCategoryChange(value: string): void {
    if (value === NEW_CATEGORY_VALUE) {
      setIsNewCategory(true)
      setCategory('')
    } else {
      setCategory(value)
    }
  }

  function cancelNewCategory(): void {
    setIsNewCategory(false)
    setNewCategoryName('')
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    const effectiveCategory = isNewCategory ? newCategoryName.trim() : category
    const parsedAmount = Number(amount)

    if (!effectiveCategory) {
      setError(t('errors.categorySelectionRequired'))
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('errors.amountRequired'))
      return
    }

    const input: NewTransaction = {
      date,
      type,
      category: effectiveCategory,
      description: description.trim(),
      amount: parsedAmount,
      currency: txCurrency
    }

    const result = await window.api.ledger.add(input)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.transactionSaveFailed'))
      return
    }

    setCategory('')
    setIsNewCategory(false)
    setNewCategoryName('')
    setDescription('')
    setAmount('')
    setTxCurrency('COP')
    await loadTransactions()
    await loadCategories()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.ledger.remove(id)
    await loadTransactions()
  }

  function startEditTransaction(tx: Transaction): void {
    setEditingId(tx.id)
    setEditDate(tx.date)
    setEditType(tx.type)
    setEditCategory(tx.category)
    setEditIsNewCategory(false)
    setEditNewCategoryName('')
    setEditDescription(tx.description)
    setEditAmount(String(tx.amount))
    setEditCurrency(tx.currency)
    setEditError('')
  }

  function cancelEditTransaction(): void {
    setEditingId(null)
  }

  function handleEditCategoryChange(value: string): void {
    if (value === NEW_CATEGORY_VALUE) {
      setEditIsNewCategory(true)
      setEditCategory('')
    } else {
      setEditCategory(value)
    }
  }

  async function handleEditSubmit(id: number): Promise<void> {
    setEditError('')

    const effectiveCategory = editIsNewCategory ? editNewCategoryName.trim() : editCategory
    const parsedAmount = Number(editAmount)

    if (!effectiveCategory) {
      setEditError(t('errors.categorySelectionRequired'))
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditError(t('errors.amountRequired'))
      return
    }

    const input: UpdateTransaction = {
      date: editDate,
      type: editType,
      category: effectiveCategory,
      description: editDescription.trim(),
      amount: parsedAmount,
      currency: editCurrency
    }

    const result = await window.api.ledger.update(id, input)
    if (!result.ok) {
      setEditError(t(result.error ?? 'errors.transactionSaveFailed'))
      return
    }

    setEditingId(null)
    await loadTransactions()
    await loadCategories()
  }

  function startEditGoal(): void {
    setIncomeGoalInput(goal ? String(goal.incomeGoal) : '')
    setExpenseGoalInput(goal ? String(goal.expenseGoal) : '')
    setGoalError('')
    setEditingGoal(true)
  }

  async function handleGoalSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setGoalError('')

    const incomeGoal = Number(incomeGoalInput)
    const expenseGoal = Number(expenseGoalInput)
    if (!Number.isFinite(incomeGoal) || incomeGoal < 0 || !Number.isFinite(expenseGoal) || expenseGoal < 0) {
      setGoalError(t('errors.goalAmountsRequired'))
      return
    }

    const result = await window.api.ledger.setGoal(monthFilter, incomeGoal, expenseGoal)
    if (!result.ok) {
      setGoalError(t(result.error ?? 'errors.goalSaveFailed'))
      return
    }

    setGoal({ month: monthFilter, incomeGoal, expenseGoal })
    setEditingGoal(false)
  }

  const exportPeriod: ReportPeriod = useMemo(() => {
    if (exportPeriodType === 'year') {
      const year = monthFilter.slice(0, 4)
      return { type: 'year', value: year, label: year }
    }
    return { type: 'month', value: monthFilter, label: formatHeaderMonth(monthFilter) }
  }, [exportPeriodType, monthFilter, locale])

  async function handleExportPdf(): Promise<void> {
    setExportBusy(true)
    setExportMessage('')
    const result = await window.api.ledger.exportPdf(exportPeriod)
    setExportBusy(false)
    if (result.ok && result.path) {
      setExportMessage(t('ledger.export.savedAt', { path: result.path }))
    } else if (result.error) {
      setExportMessage(t(result.error))
    }
  }

  async function handleExportCsv(): Promise<void> {
    setExportBusy(true)
    setExportMessage('')
    const result = await window.api.ledger.exportCsv(exportPeriod)
    setExportBusy(false)
    if (result.ok && result.path) {
      setExportMessage(t('ledger.export.savedAt', { path: result.path }))
    } else if (result.error) {
      setExportMessage(t(result.error))
    }
  }

  const usedCategories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))).sort((a, b) => a.localeCompare(b)),
    [transactions]
  )

  const categoryByName = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c])),
    [categories]
  )

  const monthTransactions = useMemo(
    () => (showAllHistory ? transactions : transactions.filter((t) => t.date.startsWith(monthFilter))),
    [transactions, monthFilter, showAllHistory]
  )

  const filteredTransactions = useMemo(() => {
    const min = amountMinFilter.trim() ? Number(amountMinFilter) : null
    const max = amountMaxFilter.trim() ? Number(amountMaxFilter) : null
    return monthTransactions.filter((t) => {
      if (categoryFilter && t.category !== categoryFilter) return false
      if (dateFromFilter && t.date < dateFromFilter) return false
      if (dateToFilter && t.date > dateToFilter) return false
      if (min !== null && Number.isFinite(min) && t.amount < min) return false
      if (max !== null && Number.isFinite(max) && t.amount > max) return false
      return true
    })
  }, [monthTransactions, categoryFilter, dateFromFilter, dateToFilter, amountMinFilter, amountMaxFilter])

  const hasActiveFilters = Boolean(
    categoryFilter || dateFromFilter || dateToFilter || amountMinFilter || amountMaxFilter
  )

  function clearFilters(): void {
    setCategoryFilter('')
    setDateFromFilter('')
    setDateToFilter('')
    setAmountMinFilter('')
    setAmountMaxFilter('')
  }

  const { totalIngresos, totalGastos, balance } = useMemo(() => {
    const ingresos = filteredTransactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + toBaseAmount(t.amount, t.currency, exchangeRate), 0)
    const gastos = filteredTransactions
      .filter((t) => t.type === 'gasto')
      .reduce((sum, t) => sum + toBaseAmount(t.amount, t.currency, exchangeRate), 0)
    return { totalIngresos: ingresos, totalGastos: gastos, balance: ingresos - gastos }
  }, [filteredTransactions, exchangeRate])

  const { monthIngresos, monthGastos } = useMemo(() => {
    const ingresos = monthTransactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + toBaseAmount(t.amount, t.currency, exchangeRate), 0)
    const gastos = monthTransactions
      .filter((t) => t.type === 'gasto')
      .reduce((sum, t) => sum + toBaseAmount(t.amount, t.currency, exchangeRate), 0)
    return { monthIngresos: ingresos, monthGastos: gastos }
  }, [monthTransactions, exchangeRate])

  const incomePct = goal && goal.incomeGoal > 0 ? (monthIngresos / goal.incomeGoal) * 100 : 0
  const expensePct = goal && goal.expenseGoal > 0 ? (monthGastos / goal.expenseGoal) * 100 : 0

  return (
    <div className="ledger">
      <div className="ledger-month-nav">
        <button
          type="button"
          className="date-nav-button"
          onClick={() => setMonthFilter(shiftMonth(monthFilter, -1))}
          disabled={showAllHistory}
          aria-label={t('ledger.prevMonthAria')}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <h1>
          {t('ledger.pageTitle')} {showAllHistory ? t('ledger.allHistorySuffix') : formatHeaderMonth(monthFilter)}
        </h1>
        <button
          type="button"
          className="date-nav-button"
          onClick={() => setMonthFilter(shiftMonth(monthFilter, 1))}
          disabled={showAllHistory || monthFilter >= currentMonth()}
          aria-label={t('ledger.nextMonthAria')}
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
        {!showAllHistory && monthFilter !== currentMonth() && (
          <button type="button" className="pill-button pill-button-accent" onClick={() => setMonthFilter(currentMonth())}>
            {t('ledger.currentMonth')}
          </button>
        )}
        <button
          type="button"
          className="icon-button ledger-settings-trigger"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('ledger.settings.triggerAria')}
        >
          <Settings size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="export-bar">
        <div className="export-period-toggle" role="radiogroup" aria-label={t('ledger.export.periodAria')}>
          <button
            type="button"
            role="radio"
            aria-checked={exportPeriodType === 'month'}
            className={`export-period-chip${exportPeriodType === 'month' ? ' active' : ''}`}
            onClick={() => setExportPeriodType('month')}
          >
            {t('ledger.export.periodMonth')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={exportPeriodType === 'year'}
            className={`export-period-chip${exportPeriodType === 'year' ? ' active' : ''}`}
            onClick={() => setExportPeriodType('year')}
          >
            {t('ledger.export.periodYear')}
          </button>
        </div>
        <button type="button" className="pill-button" onClick={handleExportPdf} disabled={exportBusy}>
          <FileText size={14} strokeWidth={1.75} />
          {t('ledger.export.pdfButton')}
        </button>
        <button type="button" className="pill-button" onClick={handleExportCsv} disabled={exportBusy}>
          <FileSpreadsheet size={14} strokeWidth={1.75} />
          {t('ledger.export.csvButton')}
        </button>
        {exportMessage && <span className="export-message">{exportMessage}</span>}
      </div>

      <div className="ledger-summary">
        <div className="stat-card stat-income">
          <ArrowUpCircle size={20} strokeWidth={1.75} />
          <div>
            <span className="stat-label">{t('ledger.income')}</span>
            <span className="stat-value">{currency.format(totalIngresos)}</span>
          </div>
        </div>
        <div className="stat-card stat-expense">
          <ArrowDownCircle size={20} strokeWidth={1.75} />
          <div>
            <span className="stat-label">{t('ledger.expenses')}</span>
            <span className="stat-value">{currency.format(totalGastos)}</span>
          </div>
        </div>
        <div className="stat-card stat-balance">
          <Scale size={20} strokeWidth={1.75} />
          <div>
            <span className="stat-label">{t('ledger.balance')}</span>
            <span className="stat-value">{currency.format(balance)}</span>
          </div>
        </div>
      </div>

      {!showAllHistory && (goal || monthFilter === currentMonth()) && (
        <div className="goal-section">
          {!goal || editingGoal ? (
            <form className="goal-prompt" onSubmit={handleGoalSubmit}>
              <div className="goal-prompt-icon">
                <Target size={22} strokeWidth={1.75} />
              </div>
              <div className="goal-prompt-body">
                <span className="goal-prompt-title">
                  {goal
                    ? t('ledger.goalTitleEdit', { month: formatHeaderMonth(monthFilter) })
                    : t('ledger.goalTitleNew', { month: formatHeaderMonth(monthFilter) })}
                </span>
                <p className="goal-prompt-desc">{t('ledger.goalDesc')}</p>
                <div className="goal-prompt-fields">
                  <div className="field">
                    <label htmlFor="income-goal">{t('ledger.expectedIncome')}</label>
                    <input
                      id="income-goal"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={incomeGoalInput}
                      onChange={(e) => setIncomeGoalInput(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="expense-goal">{t('ledger.expenseLimit')}</label>
                    <input
                      id="expense-goal"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={expenseGoalInput}
                      onChange={(e) => setExpenseGoalInput(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="ledger-submit">
                    {t('ledger.saveGoal')}
                  </button>
                  {goal && (
                    <button type="button" className="pill-button" onClick={() => setEditingGoal(false)}>
                      {t('common.cancel')}
                    </button>
                  )}
                </div>
                {goalError && <p className="error">{goalError}</p>}
              </div>
            </form>
          ) : (
            <div className="goal-card">
              <div className="goal-card-header">
                <span className="goal-card-title">
                  <Target size={15} strokeWidth={1.75} />
                  {t('ledger.monthGoalTitle')}
                </span>
                <button type="button" className="icon-button" onClick={startEditGoal} aria-label={t('ledger.editGoalAria')}>
                  <Pencil size={14} strokeWidth={1.75} />
                </button>
              </div>

              <div className="goal-row">
                <div className="goal-row-header">
                  <span className="goal-label">{t('ledger.income')}</span>
                  <span className="goal-values">
                    {t('ledger.progressOfGoal', {
                      amount: currency.format(monthIngresos),
                      goal: currency.format(goal.incomeGoal)
                    })}
                  </span>
                </div>
                <div className="goal-track-row">
                  <div className="goal-track">
                    <div className="goal-fill goal-fill-income" style={{ width: `${Math.min(100, incomePct)}%` }} />
                  </div>
                  <span className={`goal-status${incomePct >= 100 ? ' goal-status-success' : ''}`}>
                    {incomePct >= 100 ? t('ledger.goalMet') : `${Math.round(incomePct)}%`}
                  </span>
                </div>
              </div>

              <div className="goal-row">
                <div className="goal-row-header">
                  <span className="goal-label">{t('ledger.expenses')}</span>
                  <span className="goal-values">
                    {t('ledger.progressOfGoal', {
                      amount: currency.format(monthGastos),
                      goal: currency.format(goal.expenseGoal)
                    })}
                  </span>
                </div>
                <div className="goal-track-row">
                  <div className="goal-track">
                    <div
                      className={`goal-fill${expensePct > 100 ? ' goal-fill-danger' : ' goal-fill-expense'}`}
                      style={{ width: `${Math.min(100, expensePct)}%` }}
                    />
                  </div>
                  <span className={`goal-status${expensePct > 100 ? ' goal-status-danger' : ''}`}>
                    {expensePct > 100 ? t('ledger.goalExceeded') : `${Math.round(expensePct)}%`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ExpenseCategoryChart categories={categories} monthTransactions={monthTransactions} exchangeRate={exchangeRate} />

      {!showAllHistory && (
        <CategoryBudgets categories={categories} monthTransactions={monthTransactions} exchangeRate={exchangeRate} />
      )}

      <form className="ledger-form" onSubmit={handleSubmit}>
        <div className="ledger-form-row">
          <div className="field">
            <label htmlFor="date">{t('ledger.dateLabel')}</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="type">{t('ledger.typeLabel')}</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="gasto">{t('ledger.expenseType')}</option>
              <option value="ingreso">{t('ledger.incomeType')}</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="category">{t('ledger.categoryLabel')}</label>
            {!isNewCategory ? (
              <select
                id="category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="" disabled>
                  {t('ledger.selectPlaceholder')}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>{t('ledger.newCategory')}</option>
              </select>
            ) : (
              <div className="new-category-row">
                <input
                  id="category"
                  type="text"
                  placeholder={t('ledger.newCategoryPlaceholder')}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={cancelNewCategory}
                  aria-label={t('ledger.cancelNewCategoryAria')}
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="amount">{t('ledger.amountLabel')}</label>
            <div className="amount-currency-row">
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select
                value={txCurrency}
                onChange={(e) => setTxCurrency(e.target.value as TransactionCurrency)}
                aria-label={t('ledger.currencyLabel')}
              >
                {TRANSACTION_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="ledger-form-row">
          <div className="field field-grow">
            <label htmlFor="description">{t('ledger.descriptionLabel')}</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="ledger-submit">
            {t('common.add')}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </form>

      <div className="ledger-toolbar">
        <div className="field">
          <label>&nbsp;</label>
          <button type="button" className="pill-button" onClick={() => setShowAllHistory((v) => !v)}>
            {showAllHistory ? t('ledger.viewOneMonth') : t('ledger.viewAllHistory')}
          </button>
        </div>

        <div className="field">
          <label htmlFor="category-filter">{t('ledger.filterByCategory')}</label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">{t('ledger.allCategories')}</option>
            {usedCategories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="date-from-filter">{t('ledger.dateFrom')}</label>
          <input
            id="date-from-filter"
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="date-to-filter">{t('ledger.dateTo')}</label>
          <input
            id="date-to-filter"
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="amount-min-filter">{t('ledger.amountMin')}</label>
          <input
            id="amount-min-filter"
            type="number"
            min="0"
            placeholder="0"
            value={amountMinFilter}
            onChange={(e) => setAmountMinFilter(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="amount-max-filter">{t('ledger.amountMax')}</label>
          <input
            id="amount-max-filter"
            type="number"
            min="0"
            placeholder="0"
            value={amountMaxFilter}
            onChange={(e) => setAmountMaxFilter(e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <div className="field">
            <label>&nbsp;</label>
            <button type="button" className="pill-button" onClick={clearFilters}>
              {t('ledger.clearFilters')}
            </button>
          </div>
        )}
      </div>

      <div className="ledger-table-wrapper">
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="empty-state">
            {transactions.length === 0 ? t('ledger.noTransactions') : t('ledger.noMatchingTransactions')}
          </p>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>{t('ledger.dateLabel')}</th>
                <th>{t('ledger.typeLabel')}</th>
                <th>{t('ledger.categoryLabel')}</th>
                <th>{t('ledger.descriptionLabel')}</th>
                <th>{t('ledger.amountLabel')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                if (editingId === tx.id) {
                  return (
                    <tr key={tx.id} className="ledger-row-editing">
                      <td>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                      </td>
                      <td>
                        <select value={editType} onChange={(e) => setEditType(e.target.value as TransactionType)}>
                          <option value="gasto">{t('ledger.expenseType')}</option>
                          <option value="ingreso">{t('ledger.incomeType')}</option>
                        </select>
                      </td>
                      <td>
                        {!editIsNewCategory ? (
                          <select value={editCategory} onChange={(e) => handleEditCategoryChange(e.target.value)}>
                            <option value="" disabled>
                              {t('ledger.selectPlaceholder')}
                            </option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                            <option value={NEW_CATEGORY_VALUE}>{t('ledger.newCategory')}</option>
                          </select>
                        ) : (
                          <div className="new-category-row">
                            <input
                              type="text"
                              placeholder={t('ledger.newCategoryPlaceholder')}
                              value={editNewCategoryName}
                              onChange={(e) => setEditNewCategoryName(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => setEditIsNewCategory(false)}
                              aria-label={t('ledger.cancelNewCategoryAria')}
                            >
                              <X size={14} strokeWidth={1.75} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && cancelEditTransaction()}
                        />
                      </td>
                      <td>
                        <div className="amount-currency-row">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSubmit(tx.id)
                              if (e.key === 'Escape') cancelEditTransaction()
                            }}
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
                        </div>
                      </td>
                      <td>
                        <div className="ledger-row-actions">
                          <button
                            className="icon-button icon-button-save"
                            onClick={() => handleEditSubmit(tx.id)}
                            aria-label={t('common.save')}
                          >
                            <Check size={16} strokeWidth={2} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={cancelEditTransaction}
                            aria-label={t('common.cancel')}
                          >
                            <X size={16} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={tx.id}>
                    <td>{tx.date}</td>
                    <td>
                      <span className={`type-badge type-${tx.type}`}>
                        {tx.type === 'ingreso' ? t('ledger.incomeType') : t('ledger.expenseType')}
                      </span>
                    </td>
                    <td>
                      <span className="ledger-category-cell">
                        <CategoryBadge category={categoryByName.get(tx.category.toLowerCase())} fallbackName={tx.category} size={20} />
                        {tx.category}
                      </span>
                    </td>
                    <td>
                      {tx.recurringId !== null && (
                        <span className="recurring-mark" title={t('ledger.autoGeneratedTitle')}>
                          <Repeat size={13} strokeWidth={2} />
                        </span>
                      )}
                      {tx.description}
                    </td>
                    <td className={tx.type === 'ingreso' ? 'amount-positive' : 'amount-negative'}>
                      {tx.type === 'ingreso' ? '+' : '-'}
                      {formatByCurrency(tx.amount, tx.currency)}
                      {tx.currency === 'USD' && <span className="currency-tag">USD</span>}
                    </td>
                    <td>
                      <div className="ledger-row-actions">
                        <button
                          className="icon-button"
                          onClick={() => startEditTransaction(tx)}
                          aria-label={t('ledger.editTransactionAria')}
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        <button
                          className="icon-button icon-button-danger"
                          onClick={() => handleDelete(tx.id)}
                          aria-label={t('ledger.deleteAria')}
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {editError && (
                <tr className="ledger-row-error">
                  <td colSpan={6}>
                    <p className="error">{editError}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <RecurringTransactions categories={categories} />

      <ContabilidadSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={categories}
        onCategoriesChange={loadCategories}
        exchangeRate={exchangeRate}
        onExchangeRateChange={setExchangeRate}
      />
    </div>
  )
}
