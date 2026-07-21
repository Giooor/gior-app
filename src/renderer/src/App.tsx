import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SetupPassword from './components/SetupPassword'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

type Screen = 'loading' | 'setup' | 'login' | 'dashboard'

export default function App(): JSX.Element {
  const { t } = useTranslation()
  const [screen, setScreen] = useState<Screen>('loading')

  useEffect(() => {
    window.api.auth.hasMasterPassword().then((exists) => {
      setScreen(exists ? 'login' : 'setup')
    })
  }, [])

  if (screen === 'loading') {
    return (
      <div className="centered-screen">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (screen === 'setup') {
    return <SetupPassword onDone={() => setScreen('dashboard')} />
  }

  if (screen === 'login') {
    return <Login onSuccess={() => setScreen('dashboard')} />
  }

  return <Dashboard onLock={() => setScreen('login')} />
}
