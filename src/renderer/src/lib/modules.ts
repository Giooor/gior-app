import { CalendarHeart, ChefHat, Home, ListChecks, Settings, StickyNote, Wallet } from 'lucide-react'

export type ModuleKey = 'inicio' | 'contabilidad' | 'tareas' | 'recordatorios' | 'recetas' | 'notas' | 'ajustes'

export interface ModuleInfo {
  key: ModuleKey
  nameKey: string
  descriptionKey: string
  icon: typeof Wallet
  enabled: boolean
}

export const modules: ModuleInfo[] = [
  { key: 'inicio', nameKey: 'nav.inicio.name', descriptionKey: 'nav.inicio.description', icon: Home, enabled: true },
  {
    key: 'contabilidad',
    nameKey: 'nav.contabilidad.name',
    descriptionKey: 'nav.contabilidad.description',
    icon: Wallet,
    enabled: true
  },
  {
    key: 'tareas',
    nameKey: 'nav.tareas.name',
    descriptionKey: 'nav.tareas.description',
    icon: ListChecks,
    enabled: true
  },
  {
    key: 'recordatorios',
    nameKey: 'nav.recordatorios.name',
    descriptionKey: 'nav.recordatorios.description',
    icon: CalendarHeart,
    enabled: true
  },
  {
    key: 'recetas',
    nameKey: 'nav.recetas.name',
    descriptionKey: 'nav.recetas.description',
    icon: ChefHat,
    enabled: true
  },
  {
    key: 'notas',
    nameKey: 'nav.notas.name',
    descriptionKey: 'nav.notas.description',
    icon: StickyNote,
    enabled: true
  },
  {
    key: 'ajustes',
    nameKey: 'nav.ajustes.name',
    descriptionKey: 'nav.ajustes.description',
    icon: Settings,
    enabled: true
  }
]
