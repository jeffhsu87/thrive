import { addDays, dayKey, parseDayKey, rangeKeys, startOfWeek } from './date.js'
import { mean, sum } from './metrics.js'
import { sportFor } from './sports.js'
import { fmtDist, fmtDuration, fmtNum, fmtWater, fmtWeight, kgTo, kmTo, distUnit, weightUnit, toKm, toKg, mlTo, toMl, waterUnit } from './units.js'

// period: 'week' sums over Mon–Sun, 'day' checks each day, 'avg' averages over the week,
// 'target' moves a value toward a number, 'once' is a one-time milestone, 'count' is a manual counter.
export const GOAL_TYPES = {
  workouts_week: { label: 'Workouts per week', emoji: '💪', period: 'week', unit: 'workouts', def: 3, hint: 'Any logged activity counts.' },
  active_min_week: { label: 'Active minutes per week', emoji: '⏱️', period: 'week', unit: 'minutes', def: 150, hint: 'Health guidelines suggest 150 minutes of moderate activity a week.' },
  distance_week: { label: 'Distance per week', emoji: '📏', period: 'week', unit: 'distance', def: 15, sportFilter: true, hint: 'Pick a sport or count everything.' },
  strength_week: { label: 'Strength sessions per week', emoji: '🏋️', period: 'week', unit: 'sessions', def: 2, hint: 'Two sessions a week keeps muscles and bones strong.' },
  steps_day: { label: 'Daily steps', emoji: '👟', period: 'day', unit: 'steps', def: 8000, hint: 'Counted from a connected device or manual check-ins.' },
  sleep_avg: { label: 'Average sleep', emoji: '😴', period: 'avg', unit: 'hours', def: 7.5, hint: 'Most adults need 7–9 hours.' },
  protein_day: { label: 'Daily protein', emoji: '🥚', period: 'day', unit: 'grams', def: 100, hint: 'Around 1.2–2 g per kg of body weight supports active people.' },
  water_day: { label: 'Daily water', emoji: '💧', period: 'day', unit: 'water', def: 2000, hint: 'Food provides some water too; this is what you drink.' },
  journal_week: { label: 'Journal entries per week', emoji: '📓', period: 'week', unit: 'entries', def: 3, hint: 'A sentence and a mood counts.' },
  mindful_week: { label: 'Mindful minutes per week', emoji: '🧘', period: 'week', unit: 'minutes', def: 30, hint: 'Breathing exercises and meditation count.' },
  weight_target: { label: 'Reach a weight', emoji: '⚖️', period: 'target', unit: 'weight', def: 70, hint: 'Aim for a gentle 0.25–1% of body weight per week.' },
  longest_once: { label: 'Distance milestone', emoji: '🏁', period: 'once', unit: 'distance', def: 5, sportFilter: true, hint: 'For example: run your first 5K in a single session.' },
  custom: { label: 'Something else', emoji: '⭐', period: 'count', unit: 'times', def: 10, hint: 'Track anything by tapping +1.' },
}

export const GOAL_TEMPLATES = [
  { type: 'workouts_week', title: 'Work out 3× a week', target: 3 },
  { type: 'active_min_week', title: 'Move 150 minutes a week', target: 150 },
  { type: 'steps_day', title: 'Walk 8,000 steps a day', target: 8000 },
  { type: 'sleep_avg', title: 'Sleep 7.5 hours a night', target: 7.5 },
  { type: 'longest_once', title: 'Run my first 5K', target: 5, sport: 'run' },
  { type: 'protein_day', title: 'Eat enough protein', target: 100 },
  { type: 'water_day', title: 'Drink 2 L of water a day', target: 2000 },
  { type: 'strength_week', title: 'Strength train twice a week', target: 2 },
  { type: 'mindful_week', title: 'Breathe and reset 30 min a week', target: 30 },
]

/** Convert between stored (metric) and displayed goal targets. */
export function targetToDisplay(goal, units) {
  const u = GOAL_TYPES[goal.type]?.unit
  if (u === 'distance') return Math.round(kmTo(goal.target, units) * 10) / 10
  if (u === 'weight') return Math.round(kgTo(goal.target, units) * 10) / 10
  if (u === 'water') return Math.round(mlTo(goal.target, units))
  return goal.target
}
export function targetFromDisplay(type, v, units) {
  const u = GOAL_TYPES[type]?.unit
  if (u === 'distance') return toKm(v, units)
  if (u === 'weight') return toKg(v, units)
  if (u === 'water') return toMl(v, units)
  return v
}
export function unitLabel(type, units) {
  const u = GOAL_TYPES[type]?.unit
  if (u === 'distance') return distUnit(units)
  if (u === 'weight') return weightUnit(units)
  if (u === 'water') return waterUnit(units)
  return u
}

function fmtValue(goal, v, units) {
  const u = GOAL_TYPES[goal.type].unit
  if (v == null) return '—'
  if (u === 'distance') return fmtDist(v, units)
  if (u === 'weight') return fmtWeight(v, units)
  if (u === 'water') return fmtWater(v, units)
  if (u === 'minutes') return fmtDuration(v)
  if (u === 'hours') return `${fmtNum(v, 1)} h`
  if (u === 'grams') return `${fmtNum(v)} g`
  return `${fmtNum(v, u === 'times' ? 0 : 1)} ${u}`
}

function weekValue(goal, index, weekStart) {
  const ds = rangeKeys(weekStart, 7).map((k) => index.get(k))
  const matches = (a) => !goal.sport || a.sport === goal.sport
  switch (goal.type) {
    case 'workouts_week':
      return sum(ds.map((d) => d.activities.length))
    case 'active_min_week':
      return sum(ds.map((d) => d.activeMin))
    case 'distance_week':
      return sum(ds.flatMap((d) => d.activities.filter(matches).map((a) => a.distanceKm || 0)))
    case 'strength_week':
      return sum(ds.map((d) => d.activities.filter((a) => sportFor(a.sport).cat === 'strength').length))
    case 'journal_week':
      return sum(ds.map((d) => d.journalCount))
    case 'mindful_week':
      return sum(ds.map((d) => d.mindfulMin))
    case 'sleep_avg': {
      const m = mean(ds.map((d) => d.sleepMin))
      return m == null ? null : m / 60
    }
    default:
      return 0
  }
}

const dayValue = (goal, d) =>
  ({ steps_day: d.steps, protein_day: d.meals.length ? d.protein : null, water_day: d.waterMl || null })[goal.type] ?? null

/** Progress snapshot for one goal: current value, percent, status and a short history. */
export function goalProgress(goal, index, profile) {
  const def = GOAL_TYPES[goal.type]
  const units = profile.units
  const today = dayKey()
  const base = { goal, def, pct: 0, done: false, status: 'progress', history: [] }

  if (def.period === 'week' || def.period === 'avg') {
    const ws = startOfWeek()
    const current = weekValue(goal, index, ws) || 0
    const dayOfWeek = (new Date().getDay() + 6) % 7
    const history = Array.from({ length: 8 }, (_, i) => {
      const start = addDays(ws, -7 * (7 - i))
      const v = weekValue(goal, index, start)
      return { label: start, value: v, hit: v != null && v >= goal.target }
    })
    let streak = 0
    for (let i = history.length - 1; i >= 0 && history[i].hit; i--) streak++
    const pct = Math.min(current / goal.target, 1)
    const done = current >= goal.target
    const expected = def.period === 'avg' ? goal.target : goal.target * ((dayOfWeek + 1) / 7)
    const status = done ? 'done' : current >= expected * 0.8 ? 'on-track' : 'behind'
    const left = goal.target - current
    const daysLeft = 6 - dayOfWeek
    let note
    if (done) note = 'Goal reached this week. Brilliant!'
    else if (def.period === 'avg') note = `${fmtValue(goal, current, units)} so far this week`
    else note = `${fmtValue(goal, left, units)} to go · ${daysLeft === 0 ? 'last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}`
    return { ...base, current, pct, done, status, history, streak, note, currentText: fmtValue(goal, current, units), targetText: fmtValue(goal, goal.target, units), periodLabel: 'this week' }
  }

  if (def.period === 'day') {
    const keys = rangeKeys(addDays(new Date(), -6), 7)
    const history = keys.map((k) => {
      const v = dayValue(goal, index.get(k))
      return { label: parseDayKey(k), value: v, hit: v != null && v >= goal.target }
    })
    const current = dayValue(goal, index.get(today)) || 0
    const hits = history.filter((h) => h.hit).length
    let streak = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].hit) streak++
      else if (i !== history.length - 1) break
    }
    const done = current >= goal.target
    return {
      ...base,
      current,
      pct: Math.min(current / goal.target, 1),
      done,
      status: done ? 'done' : hits >= 4 ? 'on-track' : 'behind',
      history,
      streak,
      note: done ? 'Done for today!' : `${fmtValue(goal, goal.target - current, units)} to go today · hit ${hits} of the last 7 days`,
      currentText: fmtValue(goal, current, units),
      targetText: fmtValue(goal, goal.target, units),
      periodLabel: 'today',
    }
  }

  if (def.period === 'target') {
    let latest = null
    for (let i = 0; i < 120 && latest == null; i++) latest = index.get(dayKey(addDays(new Date(), -i))).weightKg
    const start = goal.startValue ?? latest
    if (latest == null || start == null) return { ...base, current: null, note: 'Log your weight to start tracking.', currentText: '—', targetText: fmtValue(goal, goal.target, units) }
    const total = Math.abs(start - goal.target) || 1
    const moved = start > goal.target ? start - latest : latest - start
    const pct = Math.max(0, Math.min(moved / total, 1))
    const done = start > goal.target ? latest <= goal.target : latest >= goal.target
    return {
      ...base,
      current: latest,
      pct,
      done,
      status: done ? 'done' : pct > 0 ? 'on-track' : 'progress',
      note: done ? 'You reached your target weight!' : `${fmtValue(goal, Math.abs(latest - goal.target), units)} to go · started at ${fmtValue(goal, start, units)}`,
      currentText: fmtValue(goal, latest, units),
      targetText: fmtValue(goal, goal.target, units),
    }
  }

  if (def.period === 'once') {
    const since = goal.createdAt ? dayKey(goal.createdAt) : '0000'
    const best = Math.max(0, ...index.activities.filter((a) => (!goal.sport || a.sport === goal.sport) && dayKey(a.start) >= since).map((a) => a.distanceKm || 0))
    const done = best >= goal.target
    return {
      ...base,
      current: best,
      pct: Math.min(best / goal.target, 1),
      done,
      status: done ? 'done' : 'progress',
      note: done ? 'Milestone unlocked!' : best ? `Longest so far: ${fmtValue(goal, best, units)}` : 'Your longest session will show here.',
      currentText: fmtValue(goal, best, units),
      targetText: fmtValue(goal, goal.target, units),
    }
  }

  const current = goal.count || 0
  const done = current >= goal.target
  return { ...base, current, pct: Math.min(current / goal.target, 1), done, status: done ? 'done' : 'progress', note: done ? 'Completed!' : `${goal.target - current} to go`, currentText: fmtValue(goal, current, units), targetText: fmtValue(goal, goal.target, units), manual: true }
}

export const STATUS_TEXT = { done: 'Done', 'on-track': 'On track', behind: 'Behind', progress: 'In progress' }
