import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useLocalStorage, { getStored, removeStored, setStored } from '../hooks/useLocalStorage.js'
import { normalizeProfile } from '../lib/profile.js'
import { buildIndex } from '../lib/stats.js'
import { goalProgress } from '../lib/goals.js'
import { badgesFor, levelFor, lifetimeStats, xpFor } from '../lib/achievements.js'
import { recommendations } from '../lib/coach.js'
import { generateDemo, generateSampleNutrition } from '../lib/demo.js'
import { dayKey, uid } from '../lib/date.js'
import { setCustomSports } from '../lib/sports.js'

export const KEYS = {
  profile: 'profile',
  activities: 'activities',
  sleep: 'sleep',
  daily: 'daily-metrics',
  meals: 'meals',
  water: 'water',
  goals: 'goals',
  habits: 'habits',
  habitLog: 'habit-log',
  devices: 'devices',
  mindful: 'mindful',
  seenBadges: 'seen-badges',
  seenLevel: 'seen-level',
  sampleWater: 'sample-water-days',
  journal: 'journal-entries',
  todos: 'todos',
  customSports: 'custom-sports',
  coachChat: 'coach-chat',
  reportReviews: 'report-reviews',
}
const EMPTY = []
const EMPTY_OBJ = {}

const HealthContext = createContext(null)
const FeedbackContext = createContext(null)

export const useHealth = () => useContext(HealthContext)
export const useFeedback = () => useContext(FeedbackContext)

const set = (key, fn, init = EMPTY) => setStored(key, fn, init)

export function HealthProvider({ children }) {
  const [rawProfile, setRawProfile] = useLocalStorage(KEYS.profile, null)
  const [activities] = useLocalStorage(KEYS.activities, EMPTY)
  const [sleep] = useLocalStorage(KEYS.sleep, EMPTY)
  const [daily] = useLocalStorage(KEYS.daily, EMPTY)
  const [meals] = useLocalStorage(KEYS.meals, EMPTY)
  const [water] = useLocalStorage(KEYS.water, EMPTY_OBJ)
  const [goals] = useLocalStorage(KEYS.goals, EMPTY)
  const [habits] = useLocalStorage(KEYS.habits, EMPTY)
  const [habitLog] = useLocalStorage(KEYS.habitLog, EMPTY_OBJ)
  const [devices] = useLocalStorage(KEYS.devices, EMPTY_OBJ)
  const [mindful] = useLocalStorage(KEYS.mindful, EMPTY)
  const [journal] = useLocalStorage(KEYS.journal, EMPTY)
  const [customSports] = useLocalStorage(KEYS.customSports, EMPTY)
  // Register custom sports before anything looks sports up by id.
  useMemo(() => setCustomSports(customSports), [customSports])

  const profile = useMemo(() => normalizeProfile(rawProfile), [rawProfile])
  const setProfile = useCallback((patch) => setRawProfile((p) => {
    const cur = normalizeProfile(p)
    const next = typeof patch === 'function' ? patch(cur) : patch
    return { ...cur, ...next, targets: { ...cur.targets, ...(next.targets || {}) }, reminders: { ...cur.reminders, ...(next.reminders || {}) } }
  }), [setRawProfile])

  const index = useMemo(
    () => buildIndex({ profile, activities, sleep, daily, meals, water, habitLog, journal, mindful }),
    [profile, activities, sleep, daily, meals, water, habitLog, journal, mindful, customSports] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const goalsProgress = useMemo(() => goals.map((g) => goalProgress(g, index, profile)), [goals, index, profile])
  const devicesConnected = Object.keys(devices).length
  const habitChecks = useMemo(() => Object.values(habitLog).reduce((s, l) => s + (l?.length || 0), 0), [habitLog])
  const stats = useMemo(
    () =>
      lifetimeStats({
        index,
        profile,
        goalsDone: goalsProgress.filter((g) => g.done || g.history?.some((h) => h.hit)).length,
        devicesConnected,
        mealsLogged: meals.length,
        habitChecks,
      }),
    [index, profile, goalsProgress, devicesConnected, meals.length, habitChecks]
  )
  const badges = useMemo(() => badgesFor(stats), [stats])
  const level = useMemo(() => levelFor(xpFor(stats, badges.filter((b) => b.earned).length)), [stats, badges])
  const recs = useMemo(() => recommendations({ index, profile, goals: goalsProgress, devicesConnected }), [index, profile, goalsProgress, devicesConnected])

  // ---------- Feedback: toasts and celebrations ----------
  const [toast, setToast] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const notify = useCallback((message, opts = {}) => setToast({ id: uid(), message, ...opts }), [])
  const celebrate = useCallback((c) => setCelebration(c), [])

  const seenRef = useRef(false)
  useEffect(() => {
    const earned = badges.filter((b) => b.earned).map((b) => b.id)
    const seen = getStored(KEYS.seenBadges, null)
    const seenLevel = getStored(KEYS.seenLevel, null)
    if (seen === null) {
      set(KEYS.seenBadges, earned)
      set(KEYS.seenLevel, level.level)
      seenRef.current = true
      return
    }
    const fresh = badges.filter((b) => b.earned && !seen.includes(b.id))
    if (fresh.length) {
      set(KEYS.seenBadges, earned)
      celebrate({
        emoji: fresh[0].emoji,
        title: fresh.length === 1 ? `Badge unlocked: ${fresh[0].name}` : `${fresh.length} new badges unlocked!`,
        body: fresh.length === 1 ? fresh[0].desc : fresh.map((b) => `${b.emoji} ${b.name}`).join('  ·  '),
        to: '/rewards',
      })
    } else if (seenLevel != null && level.level > seenLevel) {
      celebrate({ emoji: '⭐', title: `Level ${level.level}: ${level.name}`, body: 'You levelled up. Every log, workout and good night adds up.', to: '/rewards' })
    }
    if (seenLevel == null || level.level !== seenLevel) set(KEYS.seenLevel, level.level)
  }, [badges, level.level, level.name, celebrate])

  // ---------- Actions ----------
  const actions = useMemo(() => {
    const addActivity = (a) => {
      const rec = { source: 'manual', ...a, id: a.id || uid() }
      set(KEYS.activities, (l) => [rec, ...l])
      return rec
    }
    const updateActivity = (id, patch) => set(KEYS.activities, (l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    const removeActivity = (id) => {
      const found = getStored(KEYS.activities, EMPTY).find((a) => a.id === id)
      set(KEYS.activities, (l) => l.filter((a) => a.id !== id))
      return found
    }
    const restoreActivity = (a) => a && set(KEYS.activities, (l) => [a, ...l])

    const addSleep = (s) => {
      const rec = { source: 'manual', ...s, id: s.id || uid() }
      set(KEYS.sleep, (l) => [rec, ...l.filter((x) => !(x.date === rec.date && x.source === rec.source && x.id !== rec.id) && x.id !== rec.id)])
      return rec
    }
    const removeSleep = (id) => set(KEYS.sleep, (l) => l.filter((s) => s.id !== id))

    const upsertDaily = (day, patch, source = 'manual') =>
      set(KEYS.daily, (l) => {
        const i = l.findIndex((r) => r.day === day && r.source === source)
        if (i === -1) return [...l, { id: uid(), day, source, ...patch }]
        const copy = [...l]
        copy[i] = { ...copy[i], ...patch }
        return copy
      })

    const addMeals = (items) => set(KEYS.meals, (l) => [...l, ...items.map((m) => ({ source: 'manual', ...m, id: uid() }))])
    const removeMeal = (id) => {
      const found = getStored(KEYS.meals, EMPTY).find((m) => m.id === id)
      set(KEYS.meals, (l) => l.filter((m) => m.id !== id))
      return found
    }
    const restoreMeal = (m) => m && set(KEYS.meals, (l) => [...l, m])
    const addWater = (day, delta) => set(KEYS.water, (w) => ({ ...w, [day]: Math.max(0, (w[day] || 0) + delta) }), EMPTY_OBJ)

    const addGoal = (g) => set(KEYS.goals, (l) => [...l, { id: uid(), createdAt: new Date().toISOString(), ...g }])
    const updateGoal = (id, patch) => set(KEYS.goals, (l) => l.map((g) => (g.id === id ? { ...g, ...patch } : g)))
    const removeGoal = (id) => set(KEYS.goals, (l) => l.filter((g) => g.id !== id))

    const addHabit = (h) => set(KEYS.habits, (l) => [...l, { id: uid(), createdAt: new Date().toISOString(), ...h }])
    const removeHabit = (id) => set(KEYS.habits, (l) => l.filter((h) => h.id !== id))
    const toggleHabit = (day, id) =>
      set(KEYS.habitLog, (log) => {
        const cur = log[day] || []
        return { ...log, [day]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
      }, EMPTY_OBJ)

    const addCustomSport = (sp) => {
      const rec = { ...sp, id: sp.id || `c_${uid().slice(0, 8)}` }
      set(KEYS.customSports, (l) => [...l.filter((x) => x.id !== rec.id), rec])
      setCustomSports(getStored(KEYS.customSports, EMPTY))
      return rec
    }
    const removeCustomSport = (id) => set(KEYS.customSports, (l) => l.filter((x) => x.id !== id))

    const addMindful = (m) => set(KEYS.mindful, (l) => [...l, { id: uid(), day: dayKey(), ...m }])

    const removeSource = (src) => {
      set(KEYS.activities, (l) => l.filter((a) => a.source !== src))
      set(KEYS.sleep, (l) => l.filter((a) => a.source !== src))
      set(KEYS.daily, (l) => l.filter((a) => a.source !== src))
    }

    const mergeRecords = ({ activities: acts = [], sleep: sl = [], daily: dl = [] }) => {
      const actKey = (a) => `${a.sport}|${a.start}`
      set(KEYS.activities, (l) => {
        const seen = new Set(l.map(actKey))
        return [...acts.filter((a) => !seen.has(actKey(a))), ...l]
      })
      set(KEYS.sleep, (l) => {
        const seen = new Set(sl.map((s) => `${s.date}|${s.source}`))
        return [...l.filter((s) => !seen.has(`${s.date}|${s.source}`)), ...sl]
      })
      set(KEYS.daily, (l) => {
        const incoming = new Map(dl.map((r) => [`${r.day}|${r.source}`, r]))
        const merged = l.map((r) => {
          const k = `${r.day}|${r.source}`
          if (!incoming.has(k)) return r
          const patch = Object.fromEntries(Object.entries(incoming.get(k)).filter(([f, v]) => v != null && f !== 'id'))
          incoming.delete(k)
          return { ...r, ...patch }
        })
        return [...merged, ...incoming.values()]
      })
    }

    const connectDemo = (id) => {
      removeSource(id)
      const data = generateDemo(id, normalizeProfile(getStored(KEYS.profile, null)))
      mergeRecords(data)
      const now = new Date().toISOString()
      set(KEYS.devices, (d) => ({ ...d, [id]: { connected: true, demo: true, connectedAt: d[id]?.connectedAt || now, lastSync: now } }), EMPTY_OBJ)
      return data
    }
    const disconnect = (id) => {
      removeSource(id)
      set(KEYS.devices, (d) => {
        const copy = { ...d }
        delete copy[id]
        return copy
      }, EMPTY_OBJ)
    }
    const importRecords = (data, label) => {
      mergeRecords(data)
      const now = new Date().toISOString()
      set(KEYS.devices, (d) => ({ ...d, import: { connected: true, connectedAt: d.import?.connectedAt || now, lastSync: now, label } }), EMPTY_OBJ)
    }

    const loadSampleData = () => {
      connectDemo('whoop')
      const { meals: m, water: w } = generateSampleNutrition()
      set(KEYS.meals, (l) => [...l.filter((x) => x.source !== 'demo'), ...m])
      const existing = getStored(KEYS.water, EMPTY_OBJ)
      const added = Object.keys(w).filter((k) => !existing[k])
      set(KEYS.water, (cur) => ({ ...cur, ...Object.fromEntries(added.map((k) => [k, w[k]])) }), EMPTY_OBJ)
      set(KEYS.sampleWater, added)
    }
    const removeSampleData = () => {
      Object.entries(getStored(KEYS.devices, EMPTY_OBJ)).forEach(([id, d]) => d.demo && disconnect(id))
      set(KEYS.meals, (l) => l.filter((x) => x.source !== 'demo'))
      const keys = getStored(KEYS.sampleWater, EMPTY)
      set(KEYS.water, (w) => Object.fromEntries(Object.entries(w).filter(([k]) => !keys.includes(k))), EMPTY_OBJ)
      set(KEYS.sampleWater, [])
    }

    const exportAll = () => {
      const out = { app: 'thrive', version: 1, exportedAt: new Date().toISOString(), data: {} }
      ;[...Object.values(KEYS), 'journal-draft'].forEach((k) => {
        try {
          const v = localStorage.getItem(k)
          if (v != null) out.data[k] = JSON.parse(v)
        } catch {
          /* skip */
        }
      })
      return out
    }
    const importBackup = (obj) => {
      if (!obj || obj.app !== 'thrive' || typeof obj.data !== 'object') throw new Error('This is not a Thrive backup file.')
      Object.entries(obj.data).forEach(([k, v]) => setStored(k, v))
    }
    const resetAll = () => {
      ;[...Object.values(KEYS), 'journal-draft'].forEach((k) => removeStored(k))
    }

    return { addActivity, updateActivity, removeActivity, restoreActivity, addSleep, removeSleep, upsertDaily, addMeals, removeMeal, restoreMeal, addWater, addGoal, updateGoal, removeGoal, addHabit, removeHabit, toggleHabit, addMindful, addCustomSport, removeCustomSport, connectDemo, disconnect, importRecords, removeSource, loadSampleData, removeSampleData, exportAll, importBackup, resetAll }
  }, [])

  const value = { profile, setProfile, activities, sleep, daily, meals, water, goals, habits, habitLog, devices, mindful, journal, customSports, index, goalsProgress, stats, badges, level, recs, actions }
  const feedback = useMemo(() => ({ toast, setToast, notify, celebration, setCelebration, celebrate }), [toast, notify, celebration, celebrate])

  return (
    <HealthContext.Provider value={value}>
      <FeedbackContext.Provider value={feedback}>{children}</FeedbackContext.Provider>
    </HealthContext.Provider>
  )
}
