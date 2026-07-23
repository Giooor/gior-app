import type { TransactionCurrency } from './ledger'

export interface SavingsGoal {
  id: number
  title: string
  targetAmount: number
  currency: TransactionCurrency
  targetDate: string | null
  savedAmount: number
}

export interface NewSavingsGoal {
  title: string
  targetAmount: number
  currency: TransactionCurrency
  targetDate: string | null
}

export interface NewSavingsContribution {
  goalId: number
  amount: number
  date: string
}
