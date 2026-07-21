import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore, Pin, PinOff, Search, StickyNote, Trash2, X } from 'lucide-react'
import { NOTE_COLOR_LABEL_KEY, NOTE_COLORS, noteHasContent } from '../../../../shared/notes'
import type { Note, NoteColor } from '../../../../shared/notes'
import { currentLocale } from '../../lib/dateFormat'

type Filter = 'todas' | 'fijadas' | 'archivadas'

interface FormState {
  title: string
  content: string
  color: NoteColor
}

function emptyForm(): FormState {
  return { title: '', content: '', color: 'default' }
}

function autoGrow(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function ColorPicker({
  value,
  onChange
}: {
  value: NoteColor
  onChange: (color: NoteColor) => void
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="note-color-picker" role="radiogroup" aria-label={t('notes.colorPickerAria')}>
      {NOTE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={t(NOTE_COLOR_LABEL_KEY[c])}
          title={t(NOTE_COLOR_LABEL_KEY[c])}
          className={`note-color-dot note-color-dot-${c}${value === c ? ' active' : ''}`}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}

export default function Notas(): JSX.Element {
  const { t } = useTranslation()
  const locale = currentLocale()

  function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return t('notes.justNow')
    if (minutes < 60) return t('notes.minutesAgo', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('notes.hoursAgo', { count: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t('notes.daysAgo', { count: days })
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return t('notes.weeksAgo', { count: weeks })
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('todas')

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeForm, setComposeForm] = useState<FormState>(emptyForm())
  const composeContentRef = useRef<HTMLTextAreaElement | null>(null)

  const [openNoteId, setOpenNoteId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const editContentRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    setLoading(true)
    const rows = await window.api.notes.list()
    setNotes(rows)
    setLoading(false)
  }

  useEffect(() => {
    if (composeOpen) autoGrow(composeContentRef.current)
  }, [composeOpen, composeForm.content])

  useEffect(() => {
    if (openNoteId !== null) autoGrow(editContentRef.current)
  }, [openNoteId, editForm.content])

  useEffect(() => {
    if (openNoteId === null) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeEditor()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId, editForm])

  const normalizedSearch = search.trim().toLowerCase()

  function matchesSearch(n: Note): boolean {
    if (!normalizedSearch) return true
    return n.title.toLowerCase().includes(normalizedSearch) || n.content.toLowerCase().includes(normalizedSearch)
  }

  const visible = useMemo(() => {
    return notes.filter((n) => {
      if (filter === 'archivadas') return n.archived
      if (n.archived) return false
      if (filter === 'fijadas') return n.pinned
      return true
    }).filter(matchesSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, filter, normalizedSearch])

  const pinnedNotes = filter === 'todas' ? visible.filter((n) => n.pinned) : []
  const otherNotes = filter === 'todas' ? visible.filter((n) => !n.pinned) : visible

  const activeCount = notes.filter((n) => !n.archived).length
  const pinnedCount = notes.filter((n) => !n.archived && n.pinned).length
  const archivedCount = notes.filter((n) => n.archived).length

  async function handleComposeSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!noteHasContent(composeForm)) return

    const result = await window.api.notes.add(composeForm)
    if (!result.ok) return

    setComposeForm(emptyForm())
    setComposeOpen(false)
    await load()
  }

  function cancelCompose(): void {
    setComposeForm(emptyForm())
    setComposeOpen(false)
  }

  function openNote(n: Note): void {
    setOpenNoteId(n.id)
    setEditForm({ title: n.title, content: n.content, color: n.color })
  }

  async function closeEditor(): Promise<void> {
    const id = openNoteId
    if (id === null) return
    const original = notes.find((n) => n.id === id)
    setOpenNoteId(null)
    if (!original) return

    const changed =
      original.title !== editForm.title || original.content !== editForm.content || original.color !== editForm.color

    if (!noteHasContent(editForm)) {
      if (noteHasContent(original)) {
        await window.api.notes.remove(id)
        await load()
      }
      return
    }

    if (changed) {
      await window.api.notes.update(id, editForm)
      await load()
    }
  }

  async function togglePin(n: Note, e?: MouseEvent): Promise<void> {
    e?.stopPropagation()
    await window.api.notes.togglePin(n.id)
    await load()
  }

  async function toggleArchive(n: Note, e?: MouseEvent): Promise<void> {
    e?.stopPropagation()
    await window.api.notes.toggleArchive(n.id)
    if (openNoteId === n.id) setOpenNoteId(null)
    await load()
  }

  async function removeNote(n: Note, e?: MouseEvent): Promise<void> {
    e?.stopPropagation()
    await window.api.notes.remove(n.id)
    if (openNoteId === n.id) setOpenNoteId(null)
    await load()
  }

  function renderCard(n: Note): JSX.Element {
    return (
      <div key={n.id} className={`note-card note-card-${n.color}`} onClick={() => openNote(n)}>
        {n.pinned && (
          <span className="note-card-pin-badge">
            <Pin size={11} strokeWidth={2} />
          </span>
        )}
        {n.title && <h3 className="note-card-title">{n.title}</h3>}
        {n.content && <p className="note-card-content">{n.content}</p>}
        <div className="note-card-footer">
          <span className="note-card-time">{formatRelative(n.updatedAt)}</span>
          <div className="note-card-actions">
            <button
              type="button"
              className="icon-button"
              onClick={(e) => togglePin(n, e)}
              aria-label={n.pinned ? t('notes.unpinAria') : t('notes.pinAria')}
            >
              {n.pinned ? <PinOff size={14} strokeWidth={1.75} /> : <Pin size={14} strokeWidth={1.75} />}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={(e) => toggleArchive(n, e)}
              aria-label={n.archived ? t('notes.restoreAria') : t('notes.archiveAria')}
            >
              {n.archived ? (
                <ArchiveRestore size={14} strokeWidth={1.75} />
              ) : (
                <Archive size={14} strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              className="icon-button icon-button-danger"
              onClick={(e) => removeNote(n, e)}
              aria-label={t('notes.deleteAria')}
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const openNoteData = openNoteId !== null ? notes.find((n) => n.id === openNoteId) ?? null : null

  return (
    <div className="notas-page">
      <div className="notas-header">
        <div>
          <h1>{t('notes.pageTitle')}</h1>
          <p className="notas-subtitle">{t('notes.subtitle')}</p>
        </div>
        <div className="notas-search">
          <Search size={15} strokeWidth={2} />
          <input
            type="text"
            placeholder={t('notes.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="notas-filter-pills" role="tablist" aria-label={t('notes.filterAria')}>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'todas'}
          className={`notas-filter-pill${filter === 'todas' ? ' active' : ''}`}
          onClick={() => setFilter('todas')}
        >
          {t('notes.filterAll')} <span className="notas-filter-count">{activeCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'fijadas'}
          className={`notas-filter-pill${filter === 'fijadas' ? ' active' : ''}`}
          onClick={() => setFilter('fijadas')}
        >
          {t('notes.filterPinned')} <span className="notas-filter-count">{pinnedCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'archivadas'}
          className={`notas-filter-pill${filter === 'archivadas' ? ' active' : ''}`}
          onClick={() => setFilter('archivadas')}
        >
          {t('notes.filterArchived')} <span className="notas-filter-count">{archivedCount}</span>
        </button>
      </div>

      {filter !== 'archivadas' && (
        <form
          className={`note-compose${composeOpen ? ' open' : ''}`}
          onSubmit={handleComposeSubmit}
        >
          {composeOpen && (
            <input
              type="text"
              className="note-compose-title"
              placeholder={t('notes.titlePlaceholder')}
              value={composeForm.title}
              onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })}
              autoFocus
            />
          )}
          <textarea
            ref={composeContentRef}
            className="note-compose-content"
            placeholder={t('notes.contentPlaceholder')}
            rows={1}
            value={composeForm.content}
            onFocus={() => setComposeOpen(true)}
            onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
          />
          {composeOpen && (
            <div className="note-compose-actions">
              <ColorPicker value={composeForm.color} onChange={(color) => setComposeForm({ ...composeForm, color })} />
              <div className="note-compose-buttons">
                <button type="button" className="pill-button" onClick={cancelCompose}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="ledger-submit">
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {loading ? (
        <p className="tasks-loading">{t('common.loading')}</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <StickyNote size={28} strokeWidth={1.5} />
          <p>
            {normalizedSearch
              ? t('notes.emptySearch')
              : filter === 'archivadas'
                ? t('notes.emptyArchived')
                : filter === 'fijadas'
                  ? t('notes.emptyPinned')
                  : t('notes.emptyAll')}
          </p>
        </div>
      ) : (
        <>
          {pinnedNotes.length > 0 && (
            <>
              <h2 className="notas-section-title">
                <Pin size={12} strokeWidth={2} /> {t('notes.pinnedSectionTitle')}
              </h2>
              <div className="notas-grid">{pinnedNotes.map(renderCard)}</div>
            </>
          )}
          {otherNotes.length > 0 && (
            <>
              {pinnedNotes.length > 0 && <h2 className="notas-section-title">{t('notes.otherNotesTitle')}</h2>}
              <div className="notas-grid">{otherNotes.map(renderCard)}</div>
            </>
          )}
        </>
      )}

      {openNoteData && (
        <div className="note-editor-backdrop" onClick={closeEditor}>
          <div
            className={`note-editor-card note-card-${editForm.color}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="note-editor-toolbar">
              <ColorPicker value={editForm.color} onChange={(color) => setEditForm({ ...editForm, color })} />
              <div className="note-editor-toolbar-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={(e) => togglePin(openNoteData, e)}
                  aria-label={openNoteData.pinned ? t('notes.unpinAria') : t('notes.pinAria')}
                >
                  {openNoteData.pinned ? <PinOff size={16} strokeWidth={1.75} /> : <Pin size={16} strokeWidth={1.75} />}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={(e) => toggleArchive(openNoteData, e)}
                  aria-label={openNoteData.archived ? t('notes.restoreAria') : t('notes.archiveAria')}
                >
                  {openNoteData.archived ? (
                    <ArchiveRestore size={16} strokeWidth={1.75} />
                  ) : (
                    <Archive size={16} strokeWidth={1.75} />
                  )}
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  onClick={(e) => removeNote(openNoteData, e)}
                  aria-label={t('notes.deleteAria')}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
                <button type="button" className="icon-button" onClick={closeEditor} aria-label={t('common.close')}>
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>
            <input
              type="text"
              className="note-editor-title"
              placeholder={t('notes.titlePlaceholder')}
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              autoFocus
            />
            <textarea
              ref={editContentRef}
              className="note-editor-content"
              placeholder={t('notes.editorContentPlaceholder')}
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            />
            <div className="note-editor-footer">
              {t('notes.editedAt', { time: formatRelative(openNoteData.updatedAt) })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
