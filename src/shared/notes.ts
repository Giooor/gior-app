export type NoteColor = 'default' | 'rose' | 'amber' | 'emerald' | 'sky' | 'violet' | 'slate'

export interface Note {
  id: number
  title: string
  content: string
  color: NoteColor
  pinned: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface NewNote {
  title: string
  content: string
  color: NoteColor
}

export type UpdateNote = NewNote

export const NOTE_COLORS: NoteColor[] = ['default', 'rose', 'amber', 'emerald', 'sky', 'violet', 'slate']

export const NOTE_COLOR_LABEL_KEY: Record<NoteColor, string> = {
  default: 'notes.color.default',
  rose: 'notes.color.rose',
  amber: 'notes.color.amber',
  emerald: 'notes.color.emerald',
  sky: 'notes.color.sky',
  violet: 'notes.color.violet',
  slate: 'notes.color.slate'
}

export function noteHasContent(note: { title: string; content: string }): boolean {
  return note.title.trim().length > 0 || note.content.trim().length > 0
}
