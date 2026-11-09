import { useCallback, useSyncExternalStore } from 'react'

// A tiny shared store over localStorage: every component using the same key sees the same value
// and re-renders together. Values are cached in memory, so reads are cheap and references stable.
const cache = new Map()
const subscribers = new Map()

function read(key, initialValue) {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : initialValue
  } catch {
    return initialValue
  }
}

export function getStored(key, initialValue) {
  if (!cache.has(key)) cache.set(key, read(key, initialValue))
  return cache.get(key)
}

function notify(key) {
  subscribers.get(key)?.forEach((fn) => fn())
}

export function setStored(key, next, initialValue) {
  const prev = getStored(key, initialValue)
  const value = typeof next === 'function' ? next(prev) : next
  cache.set(key, value)
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable or full — keep in memory only */
  }
  notify(key)
}

export function removeStored(key) {
  cache.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  notify(key)
}

if (typeof window !== 'undefined') {
  // Keep other open tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key && cache.has(e.key)) {
      cache.delete(e.key)
      notify(e.key)
    }
  })
}

export default function useLocalStorage(key, initialValue) {
  const subscribe = useCallback(
    (cb) => {
      if (!subscribers.has(key)) subscribers.set(key, new Set())
      subscribers.get(key).add(cb)
      return () => subscribers.get(key).delete(cb)
    },
    [key]
  )
  const value = useSyncExternalStore(subscribe, () => getStored(key, initialValue))
  const setValue = useCallback((next) => setStored(key, next, initialValue), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return [value, setValue]
}
