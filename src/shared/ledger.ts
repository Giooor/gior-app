export type TransactionType = 'ingreso' | 'gasto'

export const TRANSACTION_CURRENCIES = ['COP', 'USD'] as const

export type TransactionCurrency = (typeof TRANSACTION_CURRENCIES)[number]

export const DEFAULT_USD_TO_COP_RATE = 4000

export function toBaseAmount(amount: number, currency: TransactionCurrency, usdToCopRate: number): number {
  return currency === 'USD' ? amount * usdToCopRate : amount
}

export interface Transaction {
  id: number
  date: string
  type: TransactionType
  category: string
  description: string
  amount: number
  currency: TransactionCurrency
  recurringId: number | null
}

export interface NewTransaction {
  date: string
  type: TransactionType
  category: string
  description: string
  amount: number
  currency: TransactionCurrency
}

export type UpdateTransaction = NewTransaction

export interface Category {
  id: number
  name: string
  icon: string | null
  color: string | null
  budget: number | null
}

export interface NewCategory {
  name: string
  icon: string | null
  color: string | null
  budget: number | null
}

export type UpdateCategory = NewCategory

export const CATEGORY_ICONS = [
  'wallet',
  'shopping-cart',
  'home',
  'car',
  'utensils',
  'heart-pulse',
  'film',
  'briefcase',
  'graduation-cap',
  'plane',
  'gift',
  'zap',
  'dog',
  'dumbbell',
  'smartphone',
  'coffee',
  'book-open',
  'more-horizontal'
] as const

export type CategoryIcon = (typeof CATEGORY_ICONS)[number]

export const CATEGORY_COLORS = ['indigo', 'rose', 'amber', 'emerald', 'sky', 'violet', 'slate'] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export const CATEGORY_ICON_LABEL_KEY: Record<CategoryIcon, string> = {
  wallet: 'ledger.categoryManager.icon.wallet',
  'shopping-cart': 'ledger.categoryManager.icon.shoppingCart',
  home: 'ledger.categoryManager.icon.home',
  car: 'ledger.categoryManager.icon.car',
  utensils: 'ledger.categoryManager.icon.utensils',
  'heart-pulse': 'ledger.categoryManager.icon.heartPulse',
  film: 'ledger.categoryManager.icon.film',
  briefcase: 'ledger.categoryManager.icon.briefcase',
  'graduation-cap': 'ledger.categoryManager.icon.graduationCap',
  plane: 'ledger.categoryManager.icon.plane',
  gift: 'ledger.categoryManager.icon.gift',
  zap: 'ledger.categoryManager.icon.zap',
  dog: 'ledger.categoryManager.icon.dog',
  dumbbell: 'ledger.categoryManager.icon.dumbbell',
  smartphone: 'ledger.categoryManager.icon.smartphone',
  coffee: 'ledger.categoryManager.icon.coffee',
  'book-open': 'ledger.categoryManager.icon.bookOpen',
  'more-horizontal': 'ledger.categoryManager.icon.moreHorizontal'
}

export const CATEGORY_COLOR_LABEL_KEY: Record<CategoryColor, string> = {
  indigo: 'ledger.categoryManager.color.indigo',
  rose: 'ledger.categoryManager.color.rose',
  amber: 'ledger.categoryManager.color.amber',
  emerald: 'ledger.categoryManager.color.emerald',
  sky: 'ledger.categoryManager.color.sky',
  violet: 'ledger.categoryManager.color.violet',
  slate: 'ledger.categoryManager.color.slate'
}

export interface RecurringTransaction {
  id: number
  type: TransactionType
  category: string
  description: string
  amount: number
  currency: TransactionCurrency
  active: boolean
}

export interface NewRecurringTransaction {
  type: TransactionType
  category: string
  description: string
  amount: number
  currency: TransactionCurrency
}

export interface MonthlyGoal {
  month: string
  incomeGoal: number
  expenseGoal: number
}

export type ReportPeriodType = 'month' | 'year'

export interface ReportPeriod {
  type: ReportPeriodType
  value: string
  label: string
}
