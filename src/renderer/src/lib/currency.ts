import type { TransactionCurrency } from '../../../shared/ledger'

export const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
})

const CURRENCY_FORMATTERS: Record<TransactionCurrency, Intl.NumberFormat> = {
  COP: currency,
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  })
}

export function formatByCurrency(amount: number, currency: TransactionCurrency): string {
  return CURRENCY_FORMATTERS[currency].format(amount)
}
