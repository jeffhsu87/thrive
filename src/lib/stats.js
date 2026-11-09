import { addDays, dayKey, parseDayKey, rangeKeys, bedtimeMinutes } from './date.js'
import { activityStrain, dayStrainFromTrimp, estimateCalories, estimateRecovery, mean, sleepScore, stdDev, sum, trimpOf } from './metrics.js'
import { sportFor } from './sports.js'

/** When two sources report the same metric for the same day, the earlier one in this list wins. */
export const SOURCE_PRIORITY = ['manual', 'live', 'whoop', 'oura', 'garmin', 'polar', 'apple', 'coros', 'suunto', 'fitbit', 'samsung', 'google', 'wahoo', 'peloton', 'strava', 'withings', 'import', 'demo']
const rank = (src) => {
  const i = SOURCE_PRIORITY.indexOf(src || 'manual')
  return i === -1 ? SOURCE_PRIORITY.length : i
}

const DAILY_FIELDS = ['steps', 'rhr', 'hrv', 'recovery', 'strain', 'spo2', 'skinTemp', 'respRate', 'weightKg', 'bodyFat']

function emptyDay(key) {
  return {
    key,
    activities: [],
    activeMin: 0,
    distanceKm: 0,
    caloriesOut: 0,
    trimp: 0,
    strain: null,
    sleep: null,
    sleepMin: null,
    sleepScore: null,
    meals: [],
    calIn: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    waterMl: 0,
    habitsDone: 0,
    journalCount: 0,
    mood: null,
    mindfulMin: 0,
    recovery: null,
    recoveryEstimated: false,
    ...Object.fromEntries(DAILY_FIELDS.map((f) => [f, null])),
  }
}

/** Remove the same workout recorded by two devices (same sport, starts within 15 minutes). */
export function dedupeActivities(list) {
  const sorted = [...list].sort((a, b) => rank(a.source) - rank(b.source))
  const kept = []
  for (const a of sorted) {
    const t = new Date(a.start).getTime()
    const dup = kept.some((k) => sportFor(k.sport).cat === sportFor(a.sport).cat && Math.abs(new Date(k.start).getTime() - t) < 15 * 60000)
    if (!dup) kept.push(a)
  }
  return kept.sort((a, b) => b.start.localeCompare(a.start))
}

export function buildIndex({ profile, activities, sleep, daily, meals, water, habitLog, journal, mindful }) {
  const days = new Map()
  const get = (key) => {
    if (!days.has(key)) days.set(key, emptyDay(key))
    return days.get(key)
  }

  const acts = dedupeActivities(activities).map((a) => ({
    ...a,
    calories: a.calories ?? estimateCalories(a, profile),
    strain: activityStrain(a, profile),
  }))
  acts.forEach((a) => {
    const d = get(dayKey(a.start))
    d.activities.push(a)
    d.activeMin += a.durationMin || 0
    d.distanceKm += a.distanceKm || 0
    d.caloriesOut += a.calories || 0
    d.trimp += trimpOf(a, profile)
  })

  const target = profile.targets.sleepHours
  const bestSleep = new Map()
  sleep.forEach((s) => {
    const cur = bestSleep.get(s.date)
    if (!cur || rank(s.source) < rank(cur.source)) bestSleep.set(s.date, s)
  })
  bestSleep.forEach((s, key) => {
    const d = get(key)
    d.sleep = s
    d.sleepMin = s.durationMin
    d.sleepScore = sleepScore(s, target)
  })

  const dailyByDay = new Map()
  daily.forEach((r) => {
    if (!dailyByDay.has(r.day)) dailyByDay.set(r.day, [])
    dailyByDay.get(r.day).push(r)
  })
  dailyByDay.forEach((records, key) => {
    const d = get(key)
    records.sort((a, b) => rank(a.source) - rank(b.source))
    DAILY_FIELDS.forEach((f) => {
      const r = records.find((x) => x[f] != null && x[f] !== '')
      if (r) d[f] = Number(r[f])
    })
  })

  meals.forEach((m) => {
    const d = get(m.day)
    const n = m.servings || 1
    d.meals.push(m)
    d.calIn += (m.cal || 0) * n
    d.protein += (m.p || 0) * n
    d.carbs += (m.c || 0) * n
    d.fat += (m.f || 0) * n
  })
  Object.entries(water || {}).forEach(([key, ml]) => {
    if (ml) get(key).waterMl = ml
  })
  Object.entries(habitLog || {}).forEach(([key, ids]) => {
    if (ids?.length) get(key).habitsDone = ids.length
  })
  const moods = new Map()
  journal.forEach((e) => {
    const key = dayKey(e.createdAt || e.date)
    const d = get(key)
    d.journalCount++
    if (e.mood) moods.set(key, [...(moods.get(key) || []), e.mood])
  })
  moods.forEach((list, key) => (get(key).mood = mean(list)))
  mindful.forEach((m) => (get(m.day).mindfulMin += m.minutes || 0))

  // Strain and recovery need history, so walk forward in time with rolling baselines.
  const sortedKeys = [...days.keys()].sort()
  const today = dayKey()
  if (sortedKeys.length) {
    const all = rangeKeys(parseDayKey(sortedKeys[0]), Math.max(1, Math.round((parseDayKey(today) - parseDayKey(sortedKeys[0])) / 864e5) + 1))
    const hrvHist = []
    const rhrHist = []
    let prevStrain = null
    all.forEach((key) => {
      const d = days.get(key)
      if (!d) {
        prevStrain = null
        return
      }
      if (d.strain == null && (d.activities.length || d.steps)) d.strain = dayStrainFromTrimp(d.trimp)
      if (d.recovery == null) {
        const est = estimateRecovery({
          hrv: d.hrv,
          hrvBase: mean(hrvHist.slice(-30)),
          rhr: d.rhr,
          rhrBase: mean(rhrHist.slice(-30)),
          sleepScore: d.sleepScore,
          prevStrain,
        })
        if (est != null) {
          d.recovery = est
          d.recoveryEstimated = true
        }
      }
      d.hrvBase = mean(hrvHist.slice(-30))
      d.rhrBase = mean(rhrHist.slice(-30))
      if (d.hrv) hrvHist.push(d.hrv)
      if (d.rhr) rhrHist.push(d.rhr)
      prevStrain = d.strain
    })
  }

  return {
    days,
    activities: acts,
    get: (key) => days.get(key) || emptyDay(key),
    has: (key) => days.has(key),
    firstKey: sortedKeys[0] || today,
  }
}

/** Summary of a span of days: totals for activity, averages over days that have data for everything else. */
export function summarize(index, start, n, profile) {
  const keys = rangeKeys(start, n)
  const ds = keys.map((k) => index.get(k))
  const avgOf = (f) => mean(ds.map((d) => d[f]))
  const nutritionDays = ds.filter((d) => d.meals.length)
  const bedtimes = ds.filter((d) => d.sleep?.bedtime).map((d) => bedtimeMinutes(d.sleep.bedtime))
  const sleepNeed = profile.targets.sleepHours * 60
  const sleepDays = ds.filter((d) => d.sleepMin != null)
  return {
    keys,
    days: ds,
    workouts: sum(ds.map((d) => d.activities.length)),
    activeMin: sum(ds.map((d) => d.activeMin)),
    distanceKm: sum(ds.map((d) => d.distanceKm)),
    caloriesOut: sum(ds.map((d) => d.caloriesOut)),
    activeDays: ds.filter((d) => d.activities.length).length,
    avgStrain: avgOf('strain'),
    avgSleepMin: avgOf('sleepMin'),
    avgSleepScore: avgOf('sleepScore'),
    sleepNights: sleepDays.length,
    sleepDebtMin: sum(sleepDays.map((d) => Math.max(0, sleepNeed - d.sleepMin))),
    bedtimeSd: stdDev(bedtimes),
    avgBedtime: mean(bedtimes),
    avgRecovery: avgOf('recovery'),
    avgHrv: avgOf('hrv'),
    avgRhr: avgOf('rhr'),
    avgSteps: avgOf('steps'),
    totalSteps: sum(ds.map((d) => d.steps)),
    avgWeight: avgOf('weightKg'),
    avgCalIn: mean(nutritionDays.map((d) => d.calIn)),
    avgProtein: mean(nutritionDays.map((d) => d.protein)),
    avgCarbs: mean(nutritionDays.map((d) => d.carbs)),
    avgFat: mean(nutritionDays.map((d) => d.fat)),
    nutritionDays: nutritionDays.length,
    avgWaterMl: mean(ds.filter((d) => d.waterMl).map((d) => d.waterMl)),
    journalCount: sum(ds.map((d) => d.journalCount)),
    avgMood: avgOf('mood'),
    habitsDone: sum(ds.map((d) => d.habitsDone)),
    mindfulMin: sum(ds.map((d) => d.mindfulMin)),
  }
}

/** Sleep consistency as a friendly 0–100 percentage from the spread of bedtimes. */
export const consistencyPct = (sdMin) => (sdMin == null ? null : Math.round(Math.max(0, 100 - sdMin * 0.9)))

export function lastNDays(n, end = new Date()) {
  return addDays(end, -(n - 1))
}

export function latestValue(index, field, maxBack = 60) {
  for (let i = 0; i < maxBack; i++) {
    const key = dayKey(addDays(new Date(), -i))
    const v = index.get(key)[field]
    if (v != null) return { value: v, key }
  }
  return null
}
