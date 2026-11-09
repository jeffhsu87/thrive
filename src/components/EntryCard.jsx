import { useState } from 'react'
import EntryEditor from './EntryEditor.jsx'
import { PencilIcon, TrashIcon, HeartIcon } from './Icons.jsx'
import { moodFor, ENERGY_LABELS } from '../lib/moods.js'
import { dayKey, formatTime, timestampForDay } from '../lib/date.js'

export default function EntryCard({ entry, onUpdate, onDelete, onTagClick, tagSuggestions }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const mood = moodFor(entry.mood)
  const long = entry.body.length > 320 || entry.body.split('\n').length > 5

  function startEdit() {
    setDraft({ ...entry, day: dayKey(entry.createdAt) })
    setEditing(true)
  }

  function save() {
    const { day, ...rest } = draft
    const createdAt = day === dayKey(entry.createdAt) ? entry.createdAt : timestampForDay(day)
    onUpdate(entry.id, { ...rest, createdAt })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="card editing">
        <EntryEditor
          value={draft}
          onChange={setDraft}
          onSubmit={save}
          onCancel={() => setEditing(false)}
          submitLabel="Save changes"
          tagSuggestions={tagSuggestions}
          autoFocus
        />
      </div>
    )
  }

  return (
    <article className="card entry" style={{ '--mood': mood?.color || 'var(--border-strong)' }}>
      <div className="entry-meta">
        {mood && (
          <span className="mood-badge">
            <span>{mood.emoji}</span> {mood.label}
          </span>
        )}
        <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
        {entry.energy && (
          <span className="energy-chip" title="Energy">
            <span className="mini-bars" aria-hidden>
              {[1, 2, 3, 4, 5].map((l) => <i key={l} className={l <= entry.energy ? 'on' : ''} />)}
            </span>
            {ENERGY_LABELS[entry.energy - 1]}
          </span>
        )}
        <div className="entry-actions">
          <button className="icon-btn" onClick={startEdit} aria-label="Edit entry" title="Edit"><PencilIcon width={16} height={16} /></button>
          <button className="icon-btn" onClick={() => onDelete(entry)} aria-label="Delete entry" title="Delete"><TrashIcon width={16} height={16} /></button>
        </div>
      </div>

      {entry.title && <h3 className="entry-title">{entry.title}</h3>}
      {entry.body && <p className={'entry-body' + (long && !expanded ? ' clamped' : '')}>{entry.body}</p>}
      {long && (
        <button className="link-btn" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {entry.gratitude && (
        <p className="gratitude">
          <HeartIcon width={15} height={15} /> {entry.gratitude}
        </p>
      )}

      {entry.tags.length > 0 && (
        <div className="tag-row">
          {entry.tags.map((t) => (
            <button key={t} className="tag tag-btn" onClick={() => onTagClick(t)}>#{t}</button>
          ))}
        </div>
      )}
    </article>
  )
}
