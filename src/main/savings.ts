import { getDb, persistDb } from './db'
import { TRANSACTION_CURRENCIES } from '../shared/ledger'
import type { TransactionCurrency } from '../shared/ledger'
import type { NewSavingsContribution, NewSavingsGoal, SavingsGoal } from '../shared/savings'

export function listSavingsGoals(): SavingsGoal[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT g.id, g.title, g.target_amount, g.currency, g.target_date,
      (SELECT COALESCE(SUM(c.amount), 0) FROM savings_contributions c WHERE c.goal_id = g.id) AS saved_amount
    FROM savings_goals g ORDER BY g.id ASC
  `)

  const rows: SavingsGoal[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      title: row.title as string,
      targetAmount: row.target_amount as number,
      currency: row.currency as TransactionCurrency,
      targetDate: (row.target_date as string | null) ?? null,
      savedAmount: row.saved_amount as number
    })
  }
  stmt.free()
  return rows
}

export function addSavingsGoal(input: NewSavingsGoal): void {
  if (!input.title.trim()) {
    throw new Error('errors.titleRequired')
  }
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
    throw new Error('errors.amountRequired')
  }
  if (!(TRANSACTION_CURRENCIES as readonly string[]).includes(input.currency)) {
    throw new Error('errors.invalidCurrency')
  }

  getDb().run(
    'INSERT INTO savings_goals (title, target_amount, currency, target_date) VALUES (:title, :targetAmount, :currency, :targetDate)',
    {
      ':title': input.title.trim(),
      ':targetAmount': input.targetAmount,
      ':currency': input.currency,
      ':targetDate': input.targetDate
    }
  )
  persistDb()
}

export function deleteSavingsGoal(id: number): void {
  const db = getDb()
  db.run('DELETE FROM savings_contributions WHERE goal_id = :id', { ':id': id })
  db.run('DELETE FROM savings_goals WHERE id = :id', { ':id': id })
  persistDb()
}

export function addSavingsContribution(input: NewSavingsContribution): void {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('errors.amountRequired')
  }
  if (!input.date) {
    throw new Error('errors.invalidDate')
  }

  getDb().run('INSERT INTO savings_contributions (goal_id, amount, date) VALUES (:goalId, :amount, :date)', {
    ':goalId': input.goalId,
    ':amount': input.amount,
    ':date': input.date
  })
  persistDb()
}
