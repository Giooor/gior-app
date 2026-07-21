import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from '../locales/es.json'
import en from '../locales/en.json'
import pt from '../locales/pt.json'
import fr from '../locales/fr.json'

export type AppLanguage = 'es' | 'en' | 'pt' | 'fr'

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' }
]

export const LOCALE_TAGS: Record<AppLanguage, string> = {
  es: 'es-CO',
  en: 'en-US',
  pt: 'pt-BR',
  fr: 'fr-FR'
}

const LANGUAGE_KEY = 'appLanguage'

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'es' || value === 'en' || value === 'pt' || value === 'fr'
}

export function getStoredLanguage(): AppLanguage {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  return isAppLanguage(stored) ? stored : 'es'
}

export function setAppLanguage(lang: AppLanguage): void {
  localStorage.setItem(LANGUAGE_KEY, lang)
  i18n.changeLanguage(lang)
  window.api.settings.setLanguage(lang)
}

export function currentLocaleTag(): string {
  return LOCALE_TAGS[getStoredLanguage()]
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
    fr: { translation: fr }
  },
  lng: getStoredLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false }
})

export default i18n
