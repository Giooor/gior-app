import { FormEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PinInput from './PinInput'
import { CUSTOM_QUESTION_VALUE, SECURITY_QUESTION_KEYS } from '../lib/securityQuestions'

interface Props {
  onDone: () => void
}

export default function SetupPassword({ onDone }: Props): JSX.Element {
  const { t } = useTranslation()
  const [step, setStep] = useState<'credentials' | 'security'>('credentials')

  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const confirmRef = useRef<HTMLDivElement>(null)

  const [questionChoice, setQuestionChoice] = useState<string>(SECURITY_QUESTION_KEYS[0])
  const [customQuestion, setCustomQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [securityError, setSecurityError] = useState('')

  function advanceToSecurity(finalConfirm: string): void {
    setError('')

    if (!name.trim()) {
      setError(t('errors.nameRequired'))
      return
    }
    if (pin.length !== 6) {
      setError(t('errors.passwordTooShort'))
      return
    }
    if (pin !== finalConfirm) {
      setError(t('errors.passwordMismatch'))
      return
    }

    setStep('security')
  }

  function handleCredentialsSubmit(e: FormEvent): void {
    e.preventDefault()
    advanceToSecurity(confirmPin)
  }

  function handlePinComplete(): void {
    confirmRef.current?.querySelector('input')?.focus()
  }

  async function handleSecuritySubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSecurityError('')

    const question = questionChoice === CUSTOM_QUESTION_VALUE ? customQuestion.trim() : t(questionChoice)
    if (!question || !answer.trim()) {
      setSecurityError(t('errors.securityQuestionRequired'))
      return
    }

    const result = await window.api.auth.setup(pin)
    if (!result.ok) {
      setSecurityError(t(result.error ?? 'errors.setupFailed'))
      return
    }
    await window.api.auth.setSecurityQuestion(question, answer.trim())
    await window.api.settings.setUserName(name.trim())
    onDone()
  }

  if (step === 'security') {
    return (
      <div className="centered-screen">
        <form className="auth-card" onSubmit={handleSecuritySubmit}>
          <h1>{t('auth.securityTitle')}</h1>
          <p className="subtitle">{t('auth.securitySubtitle')}</p>

          <label htmlFor="question">{t('auth.securityQuestionLabel')}</label>
          <select id="question" value={questionChoice} onChange={(e) => setQuestionChoice(e.target.value)} autoFocus>
            {SECURITY_QUESTION_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
            <option value={CUSTOM_QUESTION_VALUE}>{t('auth.securityQuestionCustom')}</option>
          </select>

          {questionChoice === CUSTOM_QUESTION_VALUE && (
            <input
              type="text"
              placeholder={t('auth.securityQuestionCustomPlaceholder')}
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
            />
          )}

          <label htmlFor="answer">{t('auth.securityAnswerLabel')}</label>
          <input id="answer" type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} />

          {securityError && <p className="error">{securityError}</p>}

          <button type="submit">{t('auth.createPassword')}</button>
        </form>
      </div>
    )
  }

  return (
    <div className="centered-screen">
      <form className="auth-card" onSubmit={handleCredentialsSubmit}>
        <h1>{t('auth.setupTitle')}</h1>
        <p className="subtitle">{t('auth.setupSubtitle')}</p>

        <label htmlFor="name">{t('auth.yourName')}</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <label>{t('auth.pin')}</label>
        <PinInput value={pin} onChange={setPin} onComplete={handlePinComplete} ariaLabel={t('auth.pin')} />

        <label>{t('auth.confirmPin')}</label>
        <div ref={confirmRef}>
          <PinInput
            value={confirmPin}
            onChange={setConfirmPin}
            onComplete={advanceToSecurity}
            ariaLabel={t('auth.confirmPin')}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit">{t('auth.continue')}</button>
      </form>
    </div>
  )
}
