import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'

interface Props {
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({ message, onCancel, onConfirm }: Props): JSX.Element {
  const { t } = useTranslation()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <TriangleAlert size={22} strokeWidth={1.75} className="confirm-icon" />
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="pill-button" onClick={onCancel} autoFocus>
            {t('common.cancel')}
          </button>
          <button type="button" className="pill-button pill-button-danger" onClick={onConfirm}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
