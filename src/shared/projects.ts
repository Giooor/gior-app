export type ProjectColor = 'rose' | 'amber' | 'emerald' | 'sky' | 'violet'

export interface Project {
  id: number
  name: string
  color: ProjectColor
}

export interface NewProject {
  name: string
  color: ProjectColor
}

export type UpdateProject = NewProject

export const PROJECT_COLORS: ProjectColor[] = ['rose', 'amber', 'emerald', 'sky', 'violet']

export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
  violet: '#8b5cf6'
}
