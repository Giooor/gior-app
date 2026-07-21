import { FormEvent, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Check,
  DatabaseBackup,
  FileJson,
  Globe,
  HelpCircle,
  Info,
  KeyRound,
  Monitor,
  Moon,
  Pencil,
  RefreshCw,
  Sun,
  Upload,
  User,
  Volume2,
  VolumeX
} from 'lucide-react'
import PinInput from '../PinInput'
import { isSoundMuted, setSoundMuted } from '../../lib/sound'
import { modules } from '../../lib/modules'
import { SUPPORTED_LANGUAGES, getStoredLanguage, setAppLanguage } from '../../lib/i18n'
import { getStoredTheme, setAppTheme } from '../../lib/theme'
import { CUSTOM_QUESTION_VALUE, SECURITY_QUESTION_KEYS } from '../../lib/securityQuestions'
import type { AppLanguage } from '../../lib/i18n'
import type { ThemePreference } from '../../lib/theme'
import type { UpdateStatus } from '../../../../shared/updater'

type Message = { type: 'success' | 'error'; text: string }

function MessageBanner({ message }: { message: Message | null }): JSX.Element | null {
  if (!message) return null
  return <p className={`ajustes-message ajustes-message-${message.type}`}>{message.text}</p>
}

function ProfileSection(): JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    window.api.settings.getUserName().then(setName)
  }, [])

  function startEdit(): void {
    setInput(name ?? '')
    setMessage(null)
    setEditing(true)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const result = await window.api.settings.setUserName(trimmed)
    if (result.ok) {
      setName(trimmed)
      setEditing(false)
    } else {
      setMessage({ type: 'error', text: t(result.error ?? 'ajustes.profile.saveFailed') })
    }
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <User size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.profile.title')}</h2>
          <p>{t('ajustes.profile.desc')}</p>
        </div>
      </div>

      {editing ? (
        <form className="ajustes-inline-form" onSubmit={handleSubmit}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
          <button type="submit" className="icon-button icon-button-save" aria-label={t('common.save')}>
            <Check size={16} strokeWidth={2} />
          </button>
          <button type="button" className="pill-button" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </button>
        </form>
      ) : (
        <div className="ajustes-value-row">
          <span className="ajustes-value">{name ?? '—'}</span>
          <button type="button" className="icon-button" onClick={startEdit} aria-label={t('home.editNameAria')}>
            <Pencil size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <MessageBanner message={message} />
    </div>
  )
}

function PasswordSection(): JSX.Element {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const nextRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)

  async function submit(finalCurrent: string, finalNext: string, finalConfirm: string): Promise<void> {
    setMessage(null)

    if (finalNext.length !== 6) {
      setMessage({ type: 'error', text: t('errors.passwordTooShort') })
      return
    }
    if (finalNext !== finalConfirm) {
      setMessage({ type: 'error', text: t('errors.passwordMismatch') })
      return
    }

    const result = await window.api.auth.changePassword(finalCurrent, finalNext)
    if (result.ok) {
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ type: 'success', text: t('ajustes.password.updated') })
    } else {
      setMessage({ type: 'error', text: t(result.error ?? 'ajustes.password.changeFailed') })
    }
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    await submit(current, next, confirm)
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <KeyRound size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.password.title')}</h2>
          <p>{t('ajustes.password.desc')}</p>
        </div>
      </div>

      <form className="ajustes-password-form" onSubmit={handleSubmit}>
        <div className="ajustes-pin-field">
          <label>{t('ajustes.password.currentPlaceholder')}</label>
          <PinInput
            value={current}
            onChange={setCurrent}
            onComplete={() => nextRef.current?.querySelector('input')?.focus()}
            ariaLabel={t('ajustes.password.currentPlaceholder')}
          />
        </div>
        <div className="ajustes-pin-field" ref={nextRef}>
          <label>{t('ajustes.password.newPlaceholder')}</label>
          <PinInput
            value={next}
            onChange={setNext}
            onComplete={() => confirmRef.current?.querySelector('input')?.focus()}
            ariaLabel={t('ajustes.password.newPlaceholder')}
          />
        </div>
        <div className="ajustes-pin-field" ref={confirmRef}>
          <label>{t('ajustes.password.confirmPlaceholder')}</label>
          <PinInput
            value={confirm}
            onChange={setConfirm}
            onComplete={(v) => submit(current, next, v)}
            ariaLabel={t('ajustes.password.confirmPlaceholder')}
          />
        </div>
        <div className="backup-option-actions">
          <button type="submit" className="pill-button pill-button-accent">
            {t('ajustes.password.submit')}
          </button>
        </div>
      </form>

      <MessageBanner message={message} />
    </div>
  )
}

function SecurityQuestionSection(): JSX.Element {
  const { t } = useTranslation()
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [questionChoice, setQuestionChoice] = useState<string>(SECURITY_QUESTION_KEYS[0])
  const [customQuestion, setCustomQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    window.api.auth.getSecurityQuestion().then(setCurrentQuestion)
  }, [])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setMessage(null)

    if (pin.length !== 6) {
      setMessage({ type: 'error', text: t('errors.incorrectPassword') })
      return
    }

    const verify = await window.api.auth.verifyPassword(pin)
    if (!verify.ok) {
      setMessage({ type: 'error', text: t(verify.error ?? 'errors.incorrectPassword') })
      setPin('')
      return
    }

    const question = questionChoice === CUSTOM_QUESTION_VALUE ? customQuestion.trim() : t(questionChoice)
    if (!question || !answer.trim()) {
      setMessage({ type: 'error', text: t('errors.securityQuestionRequired') })
      return
    }

    const result = await window.api.auth.setSecurityQuestion(question, answer.trim())
    if (!result.ok) {
      setMessage({ type: 'error', text: t(result.error ?? 'errors.generic') })
      return
    }

    setCurrentQuestion(question)
    setPin('')
    setAnswer('')
    setCustomQuestion('')
    setMessage({ type: 'success', text: t('ajustes.securityQuestion.updated') })
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <HelpCircle size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.securityQuestion.title')}</h2>
          <p>{t('ajustes.securityQuestion.desc')}</p>
        </div>
      </div>

      <p className="ajustes-value">{currentQuestion ?? t('ajustes.securityQuestion.notSet')}</p>

      <form className="ajustes-password-form" onSubmit={handleSubmit}>
        <div className="ajustes-pin-field">
          <label>{t('ajustes.securityQuestion.currentPinLabel')}</label>
          <PinInput value={pin} onChange={setPin} ariaLabel={t('ajustes.securityQuestion.currentPinLabel')} />
        </div>

        <label htmlFor="security-question-select">{t('auth.securityQuestionLabel')}</label>
        <select
          id="security-question-select"
          value={questionChoice}
          onChange={(e) => setQuestionChoice(e.target.value)}
        >
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

        <input
          type="text"
          placeholder={t('auth.securityAnswerLabel')}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div className="backup-option-actions">
          <button type="submit" className="pill-button pill-button-accent">
            {t('ajustes.securityQuestion.submit')}
          </button>
        </div>
      </form>

      <MessageBanner message={message} />
    </div>
  )
}

function SoundSection(): JSX.Element {
  const { t } = useTranslation()
  const [muted, setMuted] = useState(() => isSoundMuted())

  function toggle(): void {
    const next = !muted
    setSoundMuted(next)
    setMuted(next)
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          {muted ? <VolumeX size={20} strokeWidth={1.75} /> : <Volume2 size={20} strokeWidth={1.75} />}
        </div>
        <div>
          <h2>{t('ajustes.sound.title')}</h2>
          <p>{t('ajustes.sound.desc')}</p>
        </div>
      </div>

      <label className="toggle-switch-row">
        <span>{muted ? t('ajustes.sound.muted') : t('ajustes.sound.active')}</span>
        <span className="toggle-switch">
          <input type="checkbox" checked={!muted} onChange={toggle} />
          <span className="toggle-switch-track" />
        </span>
      </label>
    </div>
  )
}

function LanguageSection(): JSX.Element {
  const { t } = useTranslation()
  const [lang, setLang] = useState<AppLanguage>(() => getStoredLanguage())

  function handleSelect(code: AppLanguage): void {
    setAppLanguage(code)
    setLang(code)
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <Globe size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.language.title')}</h2>
          <p>{t('ajustes.language.desc')}</p>
        </div>
      </div>

      <div className="language-picker" role="radiogroup" aria-label={t('ajustes.language.title')}>
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={lang === l.code}
            className={`language-chip${lang === l.code ? ' active' : ''}`}
            onClick={() => handleSelect(l.code)}
          >
            <span className="language-chip-flag">{l.flag}</span>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'ajustes.theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'ajustes.theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'ajustes.theme.system' }
]

function ThemeSection(): JSX.Element {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<ThemePreference>(() => getStoredTheme())

  function handleSelect(value: ThemePreference): void {
    setAppTheme(value)
    setTheme(value)
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <Sun size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.theme.title')}</h2>
          <p>{t('ajustes.theme.desc')}</p>
        </div>
      </div>

      <div className="language-picker" role="radiogroup" aria-label={t('ajustes.theme.title')}>
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              className={`language-chip${theme === option.value ? ' active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <Icon size={15} strokeWidth={1.75} />
              {t(option.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BackupSection(): JSX.Element {
  const { t } = useTranslation()
  const [message, setMessage] = useState<Message | null>(null)
  const [confirmingRestore, setConfirmingRestore] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleExport(): Promise<void> {
    setMessage(null)
    setBusy(true)
    const result = await window.api.backup.export()
    setBusy(false)
    if (result.ok && result.path) {
      setMessage({ type: 'success', text: t('ajustes.backup.savedAt', { path: result.path }) })
    } else if (result.error) {
      setMessage({ type: 'error', text: t(result.error) })
    }
  }

  async function handleImport(): Promise<void> {
    setMessage(null)
    setBusy(true)
    const result = await window.api.backup.import()
    if (!result.ok) {
      setBusy(false)
      setConfirmingRestore(false)
      if (result.error) setMessage({ type: 'error', text: t(result.error) })
    }
    // On success the app relaunches itself — no further UI update needed.
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <DatabaseBackup size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.backup.title')}</h2>
          <p>{t('ajustes.backup.desc')}</p>
        </div>
      </div>

      <div className="backup-option">
        <div className="backup-option-icon">
          <DatabaseBackup size={18} strokeWidth={1.75} />
        </div>
        <div className="backup-option-body">
          <span className="backup-option-title">{t('ajustes.backup.exportTitle')}</span>
          <p className="backup-option-desc">{t('ajustes.backup.exportDesc')}</p>
          <div className="backup-option-actions">
            <button type="button" className="pill-button pill-button-accent" onClick={handleExport} disabled={busy}>
              {t('ajustes.backup.exportButton')}
            </button>
          </div>
        </div>
      </div>

      <div className="backup-option">
        <div className="backup-option-icon backup-option-icon-warn">
          <Upload size={18} strokeWidth={1.75} />
        </div>
        <div className="backup-option-body">
          <span className="backup-option-title">{t('ajustes.backup.importTitle')}</span>
          <p className="backup-option-desc">
            <Trans i18nKey="ajustes.backup.importDesc" components={{ b: <strong /> }} />
          </p>
          <div className="backup-option-actions">
            {confirmingRestore ? (
              <>
                <button type="button" className="pill-button" onClick={() => setConfirmingRestore(false)} disabled={busy}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="pill-button pill-button-danger" onClick={handleImport} disabled={busy}>
                  {t('ajustes.backup.confirmRestore')}
                </button>
              </>
            ) : (
              <button type="button" className="pill-button" onClick={() => setConfirmingRestore(true)} disabled={busy}>
                {t('ajustes.backup.restoreButton')}
              </button>
            )}
          </div>
        </div>
      </div>

      <MessageBanner message={message} />
    </div>
  )
}

function JsonBackupSection(): JSX.Element {
  const { t } = useTranslation()
  const [message, setMessage] = useState<Message | null>(null)
  const [confirmingRestore, setConfirmingRestore] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleExport(): Promise<void> {
    setMessage(null)
    setBusy(true)
    const result = await window.api.backup.exportJson()
    setBusy(false)
    if (result.ok && result.path) {
      setMessage({ type: 'success', text: t('ajustes.jsonBackup.savedAt', { path: result.path }) })
    } else if (result.error) {
      setMessage({ type: 'error', text: t(result.error) })
    }
  }

  async function handleImport(): Promise<void> {
    setMessage(null)
    setBusy(true)
    const result = await window.api.backup.importJson()
    if (!result.ok) {
      setBusy(false)
      setConfirmingRestore(false)
      if (result.error) setMessage({ type: 'error', text: t(result.error) })
    }
    // On success the app relaunches itself — no further UI update needed.
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <FileJson size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.jsonBackup.title')}</h2>
          <p>{t('ajustes.jsonBackup.desc')}</p>
        </div>
      </div>

      <div className="backup-option">
        <div className="backup-option-icon">
          <FileJson size={18} strokeWidth={1.75} />
        </div>
        <div className="backup-option-body">
          <span className="backup-option-title">{t('ajustes.jsonBackup.exportTitle')}</span>
          <p className="backup-option-desc">{t('ajustes.jsonBackup.exportDesc')}</p>
          <div className="backup-option-actions">
            <button type="button" className="pill-button pill-button-accent" onClick={handleExport} disabled={busy}>
              {t('ajustes.jsonBackup.exportButton')}
            </button>
          </div>
        </div>
      </div>

      <div className="backup-option">
        <div className="backup-option-icon backup-option-icon-warn">
          <Upload size={18} strokeWidth={1.75} />
        </div>
        <div className="backup-option-body">
          <span className="backup-option-title">{t('ajustes.jsonBackup.importTitle')}</span>
          <p className="backup-option-desc">
            <Trans i18nKey="ajustes.jsonBackup.importDesc" components={{ b: <strong /> }} />
          </p>
          <div className="backup-option-actions">
            {confirmingRestore ? (
              <>
                <button type="button" className="pill-button" onClick={() => setConfirmingRestore(false)} disabled={busy}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="pill-button pill-button-danger" onClick={handleImport} disabled={busy}>
                  {t('ajustes.jsonBackup.confirmRestore')}
                </button>
              </>
            ) : (
              <button type="button" className="pill-button" onClick={() => setConfirmingRestore(true)} disabled={busy}>
                {t('ajustes.jsonBackup.restoreButton')}
              </button>
            )}
          </div>
        </div>
      </div>

      <MessageBanner message={message} />
    </div>
  )
}

function UpdateSection(): JSX.Element {
  const { t } = useTranslation()
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    window.api.updater.getStatus().then(setStatus)
    const unsubscribe = window.api.updater.onStatus((s) => {
      setStatus(s)
      if (s.state !== 'checking') setChecking(false)
    })
    return unsubscribe
  }, [])

  async function handleCheck(): Promise<void> {
    setChecking(true)
    const result = await window.api.updater.check()
    if (!result.ok) {
      setChecking(false)
      setStatus({ state: 'error', message: result.error ?? 'errors.generic' })
    }
  }

  async function handleInstall(): Promise<void> {
    await window.api.updater.install()
  }

  function renderStatus(): JSX.Element | null {
    switch (status.state) {
      case 'checking':
        return <p className="update-status">{t('ajustes.updates.checking')}</p>
      case 'available':
        return <p className="update-status">{t('ajustes.updates.available', { version: status.version })}</p>
      case 'not-available':
        return <p className="update-status update-status-ok">{t('ajustes.updates.upToDate')}</p>
      case 'downloading':
        return (
          <div className="update-progress">
            <div className="update-progress-track">
              <div className="update-progress-fill" style={{ width: `${status.percent}%` }} />
            </div>
            <span>{t('ajustes.updates.downloading', { percent: status.percent })}</span>
          </div>
        )
      case 'downloaded':
        return (
          <div className="update-ready">
            <p className="update-status update-status-ok">
              {t('ajustes.updates.ready', { version: status.version })}
            </p>
            <button type="button" className="pill-button pill-button-accent" onClick={handleInstall}>
              {t('ajustes.updates.installButton')}
            </button>
          </div>
        )
      case 'error':
        return <p className="error">{t(status.message)}</p>
      default:
        return null
    }
  }

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <RefreshCw size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.updates.title')}</h2>
          <p>{t('ajustes.updates.desc')}</p>
        </div>
      </div>

      <div className="backup-option-actions">
        <button type="button" className="pill-button" onClick={handleCheck} disabled={checking}>
          {t('ajustes.updates.checkButton')}
        </button>
      </div>

      {renderStatus()}
    </div>
  )
}

function AboutSection(): JSX.Element {
  const { t } = useTranslation()
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    window.api.app.getVersion().then(setVersion)
  }, [])

  const features = modules.filter((m) => m.enabled && m.key !== 'ajustes')

  return (
    <div className="ajustes-section">
      <div className="ajustes-section-header">
        <div className="ajustes-section-icon">
          <Info size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h2>{t('ajustes.about.title')}</h2>
          <p>{t('ajustes.about.desc')}</p>
        </div>
      </div>

      <div className="about-card">
        <div className="about-card-top">
          <span className="about-app-name">{t('ajustes.about.appName')}</span>
          {version && <span className="about-version-badge">v{version}</span>}
        </div>
        <p className="about-author">
          <Trans i18nKey="ajustes.about.author" components={{ b: <strong /> }} />
        </p>
      </div>

      <ul className="about-feature-list">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <li key={f.key} className="about-feature-item">
              <Icon size={15} strokeWidth={1.75} />
              <div>
                <span className="about-feature-title">{t(f.nameKey)}</span>
                <span className="about-feature-desc">{t(f.descriptionKey)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Ajustes(): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="ajustes-page">
      <div className="ajustes-header">
        <h1>{t('ajustes.pageTitle')}</h1>
        <p className="ajustes-subtitle">{t('ajustes.pageSubtitle')}</p>
      </div>

      <ProfileSection />
      <PasswordSection />
      <SecurityQuestionSection />
      <SoundSection />
      <LanguageSection />
      <ThemeSection />
      <BackupSection />
      <JsonBackupSection />
      <UpdateSection />
      <AboutSection />
    </div>
  )
}
