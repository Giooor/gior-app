import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

interface Props {
  exchangeRate: number
  onExchangeRateChange: (rate: number) => void
}

export default function ExchangeRateSettings({ exchangeRate, onExchangeRateChange }: Props): JSX.Element {
  const { t } = useTranslation()
  const [value, setValue] = useState(String(exchangeRate))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(String(exchangeRate))
  }, [exchangeRate])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setSaved(false)

    const rate = Number(value)
    if (!Number.isFinite(rate) || rate <= 0) {
      setError(t('errors.invalidExchangeRate'))
      return
    }

    const result = await window.api.ledger.setExchangeRate(rate)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.generic'))
      return
    }

    onExchangeRateChange(rate)
    setSaved(true)
  }

  return (
    <form className="exchange-rate-form" onSubmit={handleSubmit}>
      <p className="exchange-rate-desc">{t('ledger.currencySettings.desc')}</p>
      <div className="exchange-rate-row">
        <span className="exchange-rate-label">{t('ledger.currencySettings.oneUsd')}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
        />
        <span className="exchange-rate-label">{t('ledger.currencySettings.cop')}</span>
        <button type="submit" className="icon-button icon-button-save" aria-label={t('common.save')}>
          <Check size={16} strokeWidth={2} />
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {saved && !error && <p className="exchange-rate-saved">{t('ledger.currencySettings.saved')}</p>}
    </form>
  )
}
