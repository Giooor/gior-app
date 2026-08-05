import type { ProjectColor } from './projects'

export type BoardStatus = 'todo' | 'in_progress' | 'done'

export const BOARD_STATUSES: BoardStatus[] = ['todo', 'in_progress', 'done']

export interface BoardProject {
  id: number
  name: string
  color: ProjectColor
  taskTotal: number
  taskDone: number
}

export interface NewBoardProject {
  name: string
  color: ProjectColor
}

export type UpdateBoardProject = NewBoardProject

export interface BoardTask {
  id: number
  boardProjectId: number
  title: string
  status: BoardStatus
  position: number
}

export interface NewBoardTask {
  boardProjectId: number
  title: string
}

export interface UpdateBoardTask {
  title: string
}
