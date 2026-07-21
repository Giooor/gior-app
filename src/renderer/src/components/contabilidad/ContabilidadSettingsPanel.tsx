import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CategoryManager from './CategoryManager'
import ExchangeRateSettings from './ExchangeRateSettings'
import type { Category } from '../../../../shared/ledger'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  onCategoriesChange: () => Promise<void>
  exchangeRate: number
  onExchangeRateChange: (rate: number) => void
}

export default function ContabilidadSettingsPanel({
  open,
  onClose,
  categories,
  onCategoriesChange,
  exchangeRate,
  onExchangeRateChange
}: Props): JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <div className={`settings-backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`settings-panel${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="settings-panel-header">
          <h2>{t('ledger.settings.title')}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="settings-panel-body">
          <section className="settings-section">
            <h3 className="settings-section-title">{t('ledger.categoryManager.title')}</h3>
            <CategoryManager categories={categories} onChange={onCategoriesChange} />
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">{t('ledger.currencySettings.title')}</h3>
            <ExchangeRateSettings exchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} />
          </section>
        </div>
      </aside>
    </>
  )
}
