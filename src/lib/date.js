const pad = (n) => String(n).padStart(2, '0')

export function dayKey(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export const addDaysKey = (key, n) => dayKey(addDays(parseDayKey(key), n))

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Monday-based week start. */
export function startOfWeek(date = new Date()) {
  const d = startOfDay(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function startOfMonth(date = new Date()) {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

export function addMonths(date, n) {
  const d = new Date(date)
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  return d
}

/** Day keys for `n` consecutive days starting at `start`. */
export function rangeKeys(start, n) {
  return Array.from({ length: n }, (_, i) => dayKey(addDays(start, i)))
}

export const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

export function dayHeading(key) {
  const today = dayKey()
  if (key === today) return 'Today'
  if (key === dayKey(addDays(new Date(), -1))) return 'Yesterday'
  const d = parseDayKey(key)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export const shortDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export const weekdayShort = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })
export const monthShort = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short' })

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

export const longDate = (date = new Date()) =>
  date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Still up?'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Consecutive days present in `keys`, ending today (or yesterday if today is empty). */
export function currentStreak(keys) {
  const set = new Set(keys)
  let cursor = new Date()
  if (!set.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (set.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive days present in `keys`. */
export function longestStreak(keys) {
  const sorted = [...new Set(keys)].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of sorted) {
    run = prev && addDaysKey(prev, 1) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

/** Build an ISO timestamp for a chosen day, keeping the current time of day. */
export function timestampForDay(key) {
  if (!key || key === dayKey()) return new Date().toISOString()
  const now = new Date()
  const d = parseDayKey(key)
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
  return d.toISOString()
}

/** Combine a day key and "HH:MM" into an ISO string. */
export function combineDayTime(key, hhmm) {
  const d = parseDayKey(key)
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  d.setHours(h || 0, m || 0, 0, 0)
  return d.toISOString()
}

export const timeOfDay = (iso) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Minutes after 18:00 the previous evening, so bedtimes around midnight compare sensibly. */
export function bedtimeMinutes(iso) {
  const d = new Date(iso)
  const m = d.getHours() * 60 + d.getMinutes()
  return m < 18 * 60 ? m + 6 * 60 : m - 18 * 60
}

export function clockFromBedMinutes(min) {
  const total = (Math.round(min) + 18 * 60) % (24 * 60)
  const d = new Date()
  d.setHours(Math.floor(total / 60), total % 60, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
