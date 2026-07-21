import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PinInput from './PinInput'

interface Props {
  onSuccess: () => void
}

type Mode = 'login' | 'question' | 'reset' | 'unavailable'

export default function Login({ onSuccess }: Props): JSX.Element {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('login')

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [questionError, setQuestionError] = useState('')

  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [resetError, setResetError] = useState('')

  async function submitLogin(value: string): Promise<void> {
    setError('')

    const result = await window.api.auth.login(value)
    if (!result.ok) {
      setError(t(result.error ?? 'errors.incorrectPassword'))
      setPin('')
      return
    }
    onSuccess()
  }

  async function handleLoginSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (pin.length === 6) await submitLogin(pin)
  }

  async function startRecovery(): Promise<void> {
    setError('')
    const has = await window.api.auth.hasSecurityQuestion()
    if (!has) {
      setMode('unavailable')
      return
    }
    const q = await window.api.auth.getSecurityQuestion()
    setQuestion(q ?? '')
    setMode('question')
  }

  async function submitAnswer(e: FormEvent): Promise<void> {
    e.preventDefault()
    setQuestionError('')

    const result = await window.api.auth.verifySecurityAnswer(answer.trim())
    if (!result.ok) {
      setQuestionError(t(result.error ?? 'errors.securityAnswerIncorrect'))
      return
    }
    setMode('reset')
  }

  async function submitReset(value: string): Promise<void> {
    setResetError('')

    const result = await window.api.auth.resetWithSecurityAnswer(answer.trim(), value)
    if (!result.ok) {
      setResetError(t(result.error ?? 'errors.generic'))
      setNewPin('')
      setConfirmNewPin('')
      return
    }
    onSuccess()
  }

  function backToLogin(): void {
    setMode('login')
    setAnswer('')
    setQuestionError('')
    setNewPin('')
    setConfirmNewPin('')
    setResetError('')
  }

  if (mode === 'unavailable') {
    return (
      <div className="centered-screen">
        <div className="auth-card">
          <h1>{t('auth.recoveryUnavailableTitle')}</h1>
          <p className="subtitle">{t('auth.recoveryUnavailableDesc')}</p>
          <button type="button" onClick={backToLogin}>
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'question') {
    return (
      <div className="centered-screen">
        <form className="auth-card" onSubmit={submitAnswer}>
          <h1>{t('auth.recoveryTitle')}</h1>
          <p className="subtitle">{question}</p>

          <label htmlFor="answer">{t('auth.securityAnswerLabel')}</label>
          <input id="answer" type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />

          {questionError && <p className="error">{questionError}</p>}

          <button type="submit">{t('auth.continue')}</button>
          <button type="button" className="auth-link-button" onClick={backToLogin}>
            {t('auth.backToLogin')}
          </button>
        </form>
      </div>
    )
  }

  if (mode === 'reset') {
    return (
      <div className="centered-screen">
        <div className="auth-card">
          <h1>{t('auth.resetTitle')}</h1>
          <p className="subtitle">{t('auth.resetSubtitle')}</p>

          <label>{t('auth.pin')}</label>
          <PinInput value={newPin} onChange={setNewPin} autoFocus ariaLabel={t('auth.pin')} />

          <label>{t('auth.confirmPin')}</label>
          <PinInput
            value={confirmNewPin}
            onChange={setConfirmNewPin}
            onComplete={(v) => {
              if (newPin.length === 6 && newPin === v) submitReset(v)
              else setResetError(t('errors.passwordMismatch'))
            }}
            ariaLabel={t('auth.confirmPin')}
          />

          {resetError && <p className="error">{resetError}</p>}

          <button type="button" className="auth-link-button" onClick={backToLogin}>
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="centered-screen">
      <form className="auth-card" onSubmit={handleLoginSubmit}>
        <h1>{t('auth.loginTitle')}</h1>
        <p className="subtitle">{t('auth.loginSubtitle')}</p>

        <label>{t('auth.pin')}</label>
        <PinInput value={pin} onChange={setPin} onComplete={submitLogin} autoFocus ariaLabel={t('auth.pin')} hasError={!!error} />

        {error && <p className="error">{error}</p>}

        <button type="submit">{t('auth.enter')}</button>
        <button type="button" className="auth-link-button" onClick={startRecovery}>
          {t('auth.forgotPin')}
        </button>
      </form>
    </div>
  )
}
