import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LockKeyhole, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Contabilidad from './contabilidad/Contabilidad'
import Tareas from './tareas/Tareas'
import Recordatorios from './recordatorios/Recordatorios'
import Recetas from './recetas/Recetas'
import Notas from './notas/Notas'
import Home from './Home'
import Ajustes from './ajustes/Ajustes'
import { modules, type ModuleKey } from '../lib/modules'
import { todayIso } from '../../../shared/date'
import { daysUntilReminder, isReminderPast } from '../../../shared/reminders'

interface Props {
  onLock: () => void
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'

type Counts = Partial<Record<ModuleKey, number>>

async function loadCounts(): Promise<Counts> {
  const [tasks, reminders, notes] = await Promise.all([
    window.api.tasks.list(todayIso()),
    window.api.reminders.list(),
    window.api.notes.list()
  ])
  return {
    tareas: tasks.filter((t) => !t.completed).length,
    recordatorios: reminders.filter((r) => !isReminderPast(r) && daysUntilReminder(r) <= 7).length,
    notas: notes.filter((n) => !n.archived).length
  }
}

export default function Dashboard({ onLock }: Props): JSX.Element {
  const { t } = useTranslation()
  const [active, setActive] = useState<ModuleKey>('inicio')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  const [counts, setCounts] = useState<Counts>({})

  useEffect(() => {
    loadCounts().then(setCounts)
  }, [active])

  function toggleCollapsed(): void {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="dashboard">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && <h2>{t('common.appName')}</h2>}
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('sidebar.showNames') : t('sidebar.showIconsOnly')}
            title={collapsed ? t('sidebar.showNames') : t('sidebar.showIconsOnly')}
          >
            {collapsed ? <PanelLeftOpen size={17} strokeWidth={1.75} /> : <PanelLeftClose size={17} strokeWidth={1.75} />}
          </button>
        </div>
        <nav>
          {modules.map((m) => {
            const Icon = m.icon
            const count = counts[m.key] ?? 0
            const name = t(m.nameKey)
            return (
              <button
                key={m.key}
                className={`nav-item${active === m.key ? ' active' : ''}`}
                disabled={!m.enabled}
                onClick={() => setActive(m.key)}
                title={collapsed ? name : undefined}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{name}</span>
                {!m.enabled && <span className="soon-badge">{t('common.comingSoon')}</span>}
                {count > 0 && <span className="nav-item-badge">{count > 99 ? '99+' : count}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="lock-button" onClick={onLock} title={collapsed ? t('common.lock') : undefined}>
            <LockKeyhole size={16} strokeWidth={1.75} />
            <span>{t('common.lock')}</span>
          </button>
        </div>
      </aside>
      <main className="content">
        {active === 'inicio' && <Home onNavigate={setActive} />}
        {active === 'contabilidad' && <Contabilidad />}
        {active === 'tareas' && <Tareas />}
        {active === 'recordatorios' && <Recordatorios />}
        {active === 'recetas' && <Recetas />}
        {active === 'notas' && <Notas />}
        {active === 'ajustes' && <Ajustes />}
      </main>
    </div>
  )
}
