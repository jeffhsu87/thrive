import { useCallback, useMemo } from 'react'
import useLocalStorage from './useLocalStorage.js'

// Accepts entries from the original scaffold ({ id, text, date }) as well as the current shape.
function normalize(e) {
  const createdAt = e.createdAt || e.date || new Date().toISOString()
  return {
    id: e.id,
    title: e.title || '',
    body: e.body ?? e.text ?? '',
    mood: e.mood ?? null,
    energy: e.energy ?? null,
    tags: Array.isArray(e.tags) ? e.tags : [],
    gratitude: e.gratitude || '',
    createdAt,
    updatedAt: e.updatedAt || createdAt,
  }
}

export default function useJournal() {
  const [raw, setRaw] = useLocalStorage('journal-entries', [])

  const entries = useMemo(
    () => raw.map(normalize).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [raw]
  )

  const allTags = useMemo(() => {
    const counts = new Map()
    entries.forEach((e) => e.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [entries])

  const addEntry = useCallback(
    (data) => {
      const now = new Date().toISOString()
      setRaw((prev) => [{ createdAt: now, ...data, id: crypto.randomUUID(), updatedAt: now }, ...prev])
    },
    [setRaw]
  )

  const updateEntry = useCallback(
    (id, data) =>
      setRaw((prev) =>
        prev.map((e) => (e.id === id ? { ...normalize(e), ...data, updatedAt: new Date().toISOString() } : e))
      ),
    [setRaw]
  )

  const removeEntry = useCallback((id) => setRaw((prev) => prev.filter((e) => e.id !== id)), [setRaw])
  const restoreEntry = useCallback((entry) => setRaw((prev) => [...prev, entry]), [setRaw])

  return { entries, allTags, addEntry, updateEntry, removeEntry, restoreEntry }
}
