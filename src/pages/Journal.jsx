import { useCallback, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import EntryEditor, { EMPTY_ENTRY, isBlank } from '../components/EntryEditor.jsx'
import EntryCard from '../components/EntryCard.jsx'
import MoodChart from '../components/MoodChart.jsx'
import Toast from '../components/Toast.jsx'
import { SearchIcon, XIcon } from '../components/Icons.jsx'
import useJournal from '../hooks/useJournal.js'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { MOODS, moodFor } from '../lib/moods.js'
import { addDays, currentStreak, dayHeading, dayKey, greeting, longDate, timestampForDay } from '../lib/date.js'

export default function Journal() {
  const { entries, allTags, addEntry, updateEntry, removeEntry, restoreEntry } = useJournal()
  const [draft, setDraft] = useLocalStorage('journal-draft', EMPTY_ENTRY)
  const [query, setQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  function saveDraft() {
    const { day, ...rest } = draft
    addEntry({ ...rest, createdAt: timestampForDay(day) })
    setDraft(EMPTY_ENTRY)
    setToast({ message: 'Entry saved' })
  }

  function deleteEntry(entry) {
    removeEntry(entry.id)
    setToast({ message: 'Entry deleted', action: () => restoreEntry(entry) })
  }

  const stats = useMemo(() => {
    const weekAgo = addDays(new Date(), -6)
    weekAgo.setHours(0, 0, 0, 0)
    const recentMoods = entries.filter((e) => e.mood && new Date(e.createdAt) >= weekAgo).map((e) => e.mood)
    const avg = recentMoods.length ? recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length : null
    return {
      total: entries.length,
      streak: currentStreak(entries.map((e) => dayKey(e.createdAt))),
      avgMood: avg ? moodFor(Math.round(avg)) : null,
    }
  }, [entries])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = entries.filter((e) => {
      if (moodFilter && e.mood !== moodFilter) return false
      if (tagFilter && !e.tags.includes(tagFilter)) return false
      if (q && ![e.title, e.body, e.gratitude, ...e.tags].join(' ').toLowerCase().includes(q)) return false
      return true
    })
    const map = new Map()
    filtered.forEach((e) => {
      const k = dayKey(e.createdAt)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(e)
    })
    return [...map.entries()]
  }, [entries, query, moodFilter, tagFilter])

  const filtering = query || moodFilter || tagFilter
  const clearFilters = () => {
    setQuery('')
    setMoodFilter(null)
    setTagFilter(null)
  }

  return (
    <section className="page narrow journal">
      <PageHeader eyebrow={longDate()} title={greeting()}>
        Take a minute to check in with yourself.
      </PageHeader>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">{stats.total === 1 ? 'Entry' : 'Entries'}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.streak}<small> day{stats.streak === 1 ? '' : 's'}</small></span>
          <span className="stat-label">Current streak</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.avgMood ? <>{stats.avgMood.emoji} <small>{stats.avgMood.label}</small></> : '—'}</span>
          <span className="stat-label">Mood this week</span>
        </div>
        <div className="stat stat-chart">
          <MoodChart entries={entries} />
          <span className="stat-label">Last 14 days</span>
        </div>
      </div>

      <div className="card composer">
        <EntryEditor
          value={draft}
          onChange={setDraft}
          onSubmit={saveDraft}
          tagSuggestions={allTags}
          status={isBlank(draft) ? '' : 'Draft saved automatically'}
        />
      </div>

      {entries.length > 0 && (
        <div className="toolbar">
          <label className="search">
            <SearchIcon width={16} height={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search entries" />
          </label>
          <div className="filter-chips">
            {MOODS.map((m) => (
              <button
                key={m.value}
                className={'chip' + (moodFilter === m.value ? ' active' : '')}
                style={{ '--mood': m.color }}
                onClick={() => setMoodFilter(moodFilter === m.value ? null : m.value)}
                title={`Show ${m.label} entries`}
              >
                {m.emoji}
              </button>
            ))}
            {tagFilter && (
              <button className="chip active tag-chip" onClick={() => setTagFilter(null)}>
                #{tagFilter} <XIcon width={12} height={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Your journal is empty</p>
          <p>Log your first entry above. Even a mood and one sentence counts.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No matching entries</p>
          <button className="btn ghost" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="timeline">
          {filtering && (
            <p className="results-note">
              {groups.reduce((n, [, list]) => n + list.length, 0)} matching entries ·{' '}
              <button className="link-btn" onClick={clearFilters}>Clear</button>
            </p>
          )}
          {groups.map(([key, list]) => (
            <div key={key} className="day-group">
              <h2 className="day-heading">{dayHeading(key)}</h2>
              <div className="day-entries">
                {list.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onUpdate={updateEntry}
                    onDelete={deleteEntry}
                    onTagClick={setTagFilter}
                    tagSuggestions={allTags}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </section>
  )
}
