import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PomodoroWidget from './components/tareas/PomodoroWidget'
import '@fontsource-variable/inter'
import './styles/global.css'
import './lib/i18n'
import { initTheme } from './lib/theme'

initTheme()

const isPomodoroWidget = window.location.hash === '#pomodoro-widget'

if (isPomodoroWidget) {
  document.body.classList.add('widget-shell')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isPomodoroWidget ? <PomodoroWidget /> : <App />}</React.StrictMode>
)
