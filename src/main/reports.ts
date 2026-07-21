import { writeFileSync } from 'fs'
import { BrowserWindow } from 'electron'
import { listCategories } from './categories'
import { getExchangeRate, listTransactions } from './ledger'
import { toBaseAmount } from '../shared/ledger'
import { mt } from './i18n'
import type { Category, ReportPeriod, Transaction } from '../shared/ledger'

function transactionsInPeriod(period: ReportPeriod): Transaction[] {
  return listTransactions()
    .filter((t) => t.date.startsWith(period.value))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportLedgerCsvTo(period: ReportPeriod, destPath: string): void {
  const transactions = transactionsInPeriod(period)

  const header = [
    mt('reportDate'),
    mt('reportType'),
    mt('reportCategory'),
    mt('reportDescription'),
    mt('reportAmount'),
    mt('reportCurrency')
  ]
  const lines = [header.join(',')]

  for (const t of transactions) {
    lines.push(
      [
        t.date,
        t.type === 'ingreso' ? mt('reportIngreso') : mt('reportGasto'),
        csvEscape(t.category),
        csvEscape(t.description),
        String(t.amount),
        t.currency
      ].join(',')
    )
  }

  writeFileSync(destPath, `﻿${lines.join('\n')}`, 'utf8')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function buildReportHtml(period: ReportPeriod, transactions: Transaction[], categories: Category[], exchangeRate: number): string {
  const categoryColor = new Map(categories.map((c) => [c.name.toLowerCase(), c.color]))
  const COLOR_HEX: Record<string, string> = {
    indigo: '#6366f1',
    rose: '#fb7185',
    amber: '#fbbf24',
    emerald: '#34d399',
    sky: '#38bdf8',
    violet: '#a78bfa',
    slate: '#94a3b8'
  }

  let ingresos = 0
  let gastos = 0
  const spendByCategory = new Map<string, number>()

  for (const t of transactions) {
    const amount = toBaseAmount(t.amount, t.currency, exchangeRate)
    if (t.type === 'ingreso') {
      ingresos += amount
    } else {
      gastos += amount
      spendByCategory.set(t.category, (spendByCategory.get(t.category) ?? 0) + amount)
    }
  }

  const categoryRows = Array.from(spendByCategory, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount
  )

  const categoryRowsHtml = categoryRows
    .map((c) => {
      const color = COLOR_HEX[categoryColor.get(c.category.toLowerCase()) ?? ''] ?? '#94a3b8'
      const pct = gastos > 0 ? Math.round((c.amount / gastos) * 100) : 0
      return `<tr>
        <td><span class="dot" style="background:${color}"></span>${escapeHtml(c.category)}</td>
        <td class="num">${formatMoney(c.amount)}</td>
        <td class="num">${pct}%</td>
      </tr>`
    })
    .join('')

  const transactionRowsHtml = transactions
    .map(
      (t) => `<tr>
        <td>${t.date}</td>
        <td>${t.type === 'ingreso' ? mt('reportIngreso') : mt('reportGasto')}</td>
        <td>${escapeHtml(t.category)}</td>
        <td>${escapeHtml(t.description)}</td>
        <td class="num">${t.type === 'ingreso' ? '+' : '-'}${t.amount.toLocaleString('es-CO')} ${t.currency}</td>
      </tr>`
    )
    .join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { color: #6b7280; font-size: 12px; margin: 0 0 24px; }
  .summary { display: flex; gap: 16px; margin-bottom: 28px; }
  .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; }
  .stat-label { font-size: 11px; color: #6b7280; display: block; margin-bottom: 4px; }
  .stat-value { font-size: 16px; font-weight: 700; }
  h2 { font-size: 14px; margin: 24px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
  th { color: #6b7280; font-weight: 700; }
  td.num, th.num { text-align: right; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
</style>
</head>
<body>
  <h1>${mt('reportTitle')}</h1>
  <p class="subtitle">${escapeHtml(period.label)} &middot; ${mt('reportGeneratedOn', { date: new Date().toLocaleDateString() })}</p>

  <div class="summary">
    <div class="stat"><span class="stat-label">${mt('reportIncome')}</span><span class="stat-value">${formatMoney(ingresos)}</span></div>
    <div class="stat"><span class="stat-label">${mt('reportExpenses')}</span><span class="stat-value">${formatMoney(gastos)}</span></div>
    <div class="stat"><span class="stat-label">${mt('reportBalance')}</span><span class="stat-value">${formatMoney(ingresos - gastos)}</span></div>
  </div>

  ${
    categoryRows.length > 0
      ? `<h2>${mt('reportCategoryBreakdown')}</h2>
  <table>
    <thead><tr><th>${mt('reportCategory')}</th><th class="num">${mt('reportAmount')}</th><th class="num">%</th></tr></thead>
    <tbody>${categoryRowsHtml}</tbody>
  </table>`
      : ''
  }

  <h2>${mt('reportTransactions')}</h2>
  <table>
    <thead>
      <tr>
        <th>${mt('reportDate')}</th>
        <th>${mt('reportType')}</th>
        <th>${mt('reportCategory')}</th>
        <th>${mt('reportDescription')}</th>
        <th class="num">${mt('reportAmount')}</th>
      </tr>
    </thead>
    <tbody>${transactionRowsHtml}</tbody>
  </table>
</body>
</html>`
}

export async function exportLedgerPdfTo(period: ReportPeriod, destPath: string): Promise<void> {
  const transactions = transactionsInPeriod(period)
  const categories = listCategories()
  const exchangeRate = getExchangeRate()
  const html = buildReportHtml(period, transactions, categories, exchangeRate)

  const win = new BrowserWindow({ show: false })
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    })
    writeFileSync(destPath, pdfBuffer)
  } finally {
    win.destroy()
  }
}
