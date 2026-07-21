import { getDb, getSetting, persistDb, setSetting } from './db'
import { upsertCategory } from './categories'
import { todayIso } from '../shared/date'
import { DEFAULT_USD_TO_COP_RATE, TRANSACTION_CURRENCIES } from '../shared/ledger'
import type {
  MonthlyGoal,
  NewRecurringTransaction,
  NewTransaction,
  RecurringTransaction,
  Transaction,
  TransactionCurrency,
  TransactionType,
  UpdateTransaction
} from '../shared/ledger'

function validateTransaction(input: {
  date: string
  category: string
  amount: number
  type: TransactionType
  currency: TransactionCurrency
}): void {
  if (!input.date || !input.category?.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('errors.invalidTransactionData')
  }
  if (input.type !== 'ingreso' && input.type !== 'gasto') {
    throw new Error('errors.invalidTransactionType')
  }
  if (!(TRANSACTION_CURRENCIES as readonly string[]).includes(input.currency)) {
    throw new Error('errors.invalidCurrency')
  }
}

export function listTransactions(): Transaction[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, date, type, category, description, amount, currency, recurring_id FROM transactions ORDER BY date DESC, id DESC'
  )

  const rows: Transaction[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      date: row.date as string,
      type: row.type as TransactionType,
      category: row.category as string,
      description: row.description as string,
      amount: row.amount as number,
      currency: row.currency as TransactionCurrency,
      recurringId: (row.recurring_id as number | null) ?? null
    })
  }
  stmt.free()
  return rows
}

function insertTransaction(
  date: string,
  type: TransactionType,
  category: string,
  description: string,
  amount: number,
  currency: TransactionCurrency,
  recurringId: number | null
): void {
  getDb().run(
    'INSERT INTO transactions (date, type, category, description, amount, currency, recurring_id) VALUES (:date, :type, :category, :description, :amount, :currency, :recurringId)',
    {
      ':date': date,
      ':type': type,
      ':category': category,
      ':description': description,
      ':amount': amount,
      ':currency': currency,
      ':recurringId': recurringId
    }
  )
}

export function addTransaction(input: NewTransaction): void {
  validateTransaction(input)

  const category = input.category.trim()
  upsertCategory(category)
  insertTransaction(input.date, input.type, category, input.description?.trim() ?? '', input.amount, input.currency, null)
  persistDb()
}

export function updateTransaction(id: number, input: UpdateTransaction): void {
  validateTransaction(input)

  const category = input.category.trim()
  upsertCategory(category)
  getDb().run(
    'UPDATE transactions SET date = :date, type = :type, category = :category, description = :description, amount = :amount, currency = :currency WHERE id = :id',
    {
      ':date': input.date,
      ':type': input.type,
      ':category': category,
      ':description': input.description?.trim() ?? '',
      ':amount': input.amount,
      ':currency': input.currency,
      ':id': id
    }
  )
  persistDb()
}

export function deleteTransaction(id: number): void {
  getDb().run('DELETE FROM transactions WHERE id = :id', { ':id': id })
  persistDb()
}

// --- Recurring transactions ---

export function listRecurringTransactions(): RecurringTransaction[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, type, category, description, amount, currency, active FROM recurring_transactions ORDER BY id ASC'
  )

  const rows: RecurringTransaction[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      type: row.type as TransactionType,
      category: row.category as string,
      description: row.description as string,
      amount: row.amount as number,
      currency: row.currency as TransactionCurrency,
      active: Boolean(row.active)
    })
  }
  stmt.free()
  return rows
}

export function addRecurringTransaction(input: NewRecurringTransaction): void {
  if (!input.category?.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('errors.invalidRecurringTransactionData')
  }
  if (input.type !== 'ingreso' && input.type !== 'gasto') {
    throw new Error('errors.invalidTransactionType')
  }
  if (!(TRANSACTION_CURRENCIES as readonly string[]).includes(input.currency)) {
    throw new Error('errors.invalidCurrency')
  }

  const category = input.category.trim()
  upsertCategory(category)

  getDb().run(
    'INSERT INTO recurring_transactions (type, category, description, amount, currency, active) VALUES (:type, :category, :description, :amount, :currency, 1)',
    {
      ':type': input.type,
      ':category': category,
      ':description': input.description?.trim() ?? '',
      ':amount': input.amount,
      ':currency': input.currency
    }
  )
  persistDb()
}

export function toggleRecurringTransaction(id: number): void {
  getDb().run('UPDATE recurring_transactions SET active = NOT active WHERE id = :id', { ':id': id })
  persistDb()
}

export function deleteRecurringTransaction(id: number): void {
  getDb().run('DELETE FROM recurring_transactions WHERE id = :id', { ':id': id })
  persistDb()
}

export function generateDueRecurringTransactions(): void {
  const db = getDb()
  const today = todayIso()
  const currentMonth = today.slice(0, 7)

  const rules = listRecurringTransactions().filter((r) => r.active)
  let generated = false

  for (const rule of rules) {
    const checkStmt = db.prepare(
      'SELECT 1 FROM transactions WHERE recurring_id = :id AND date LIKE :pattern LIMIT 1'
    )
    checkStmt.bind({ ':id': rule.id, ':pattern': `${currentMonth}%` })
    const alreadyGenerated = checkStmt.step()
    checkStmt.free()

    if (!alreadyGenerated) {
      insertTransaction(today, rule.type, rule.category, rule.description, rule.amount, rule.currency, rule.id)
      generated = true
    }
  }

  if (generated) persistDb()
}

// --- Exchange rate ---

const EXCHANGE_RATE_KEY = 'usd_to_cop_rate'

export function getExchangeRate(): number {
  const stored = getSetting(EXCHANGE_RATE_KEY)
  const rate = stored ? Number(stored) : DEFAULT_USD_TO_COP_RATE
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_COP_RATE
}

export function setExchangeRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('errors.invalidExchangeRate')
  }
  setSetting(EXCHANGE_RATE_KEY, String(rate))
}

// --- Monthly goals ---

export function getMonthlyGoal(month: string): MonthlyGoal | null {
  const stmt = getDb().prepare('SELECT month, income_goal, expense_goal FROM monthly_goals WHERE month = :month')
  stmt.bind({ ':month': month })

  let goal: MonthlyGoal | null = null
  if (stmt.step()) {
    const row = stmt.getAsObject()
    goal = {
      month: row.month as string,
      incomeGoal: row.income_goal as number,
      expenseGoal: row.expense_goal as number
    }
  }
  stmt.free()
  return goal
}

export function setMonthlyGoal(month: string, incomeGoal: number, expenseGoal: number): void {
  if (!Number.isFinite(incomeGoal) || incomeGoal < 0 || !Number.isFinite(expenseGoal) || expenseGoal < 0) {
    throw new Error('errors.invalidGoalAmounts')
  }

  getDb().run(
    `INSERT INTO monthly_goals (month, income_goal, expense_goal) VALUES (:month, :incomeGoal, :expenseGoal)
     ON CONFLICT(month) DO UPDATE SET income_goal = excluded.income_goal, expense_goal = excluded.expense_goal`,
    { ':month': month, ':incomeGoal': incomeGoal, ':expenseGoal': expenseGoal }
  )
  persistDb()
}
