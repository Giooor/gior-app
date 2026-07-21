export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_KEY = 'appTheme'

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

function applyTheme(pref: ThemePreference): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(pref))
}

export function setAppTheme(pref: ThemePreference): void {
  localStorage.setItem(THEME_KEY, pref)
  applyTheme(pref)
}

export function initTheme(): void {
  applyTheme(getStoredTheme())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}
