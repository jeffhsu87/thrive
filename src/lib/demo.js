// Realistic sample data for demo device connections. The workout schedule is seeded by date (not by
// device) so two connected devices produce the same sessions, which the index then de-duplicates.
import { addDays, dayKey, uid } from './date.js'
import { deviceFor } from './devices.js'
import { dayStrainFromTrimp, estimateCalories, maxHrOf, trimpOf } from './metrics.js'
import { FOODS } from './foods.js'

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}
function rng(seed) {
  let a = hash(seed)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const between = (r, lo, hi) => lo + r() * (hi - lo)
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d

// [sport, hour, minutes range, intensity]
const WEEK_PLAN = [
  [['strength', 18, [40, 55], 'strength']],
  [['run', 6.75, [30, 45], 'easy']],
  [['yoga', 19, [25, 40], 'gentle']],
  [['run', 17.5, [35, 45], 'intervals'], ['indoor_ride', 18, [40, 55], 'intervals']],
  [['walk', 12.5, [30, 45], 'gentle']],
  [['ride', 9, [90, 150], 'long'], ['hike', 9.5, [120, 180], 'long']],
  [['run', 8.5, [55, 80], 'long'], ['swim', 8, [35, 50], 'easy']],
]

const INTENSITY = { gentle: 0.55, easy: 0.68, long: 0.7, intervals: 0.78, strength: 0.7 }

function hrSeries(r, minutes, intensity, maxHr) {
  const base = INTENSITY[intensity]
  return Array.from({ length: minutes }, (_, m) => {
    let f = base
    if (m < 5) f = 0.52 + (base - 0.52) * (m / 5)
    else if (intensity === 'intervals') f = Math.floor((m - 5) / 3) % 2 === 0 ? 0.9 : 0.7
    else if (intensity === 'strength') f = m % 4 < 2 ? 0.76 : 0.62
    else if (intensity === 'long') f = base + (m / minutes) * 0.05
    if (m > minutes - 4) f = Math.max(0.55, f - 0.1)
    return Math.round(clamp(f + between(r, -0.025, 0.025), 0.4, 0.99) * maxHr)
  })
}

function workoutFor(key, dow, profile, caps) {
  const r = rng(`plan-${key}`)
  if (r() < 0.15) return null
  const options = WEEK_PLAN[dow]
  const [sport, hour, [lo, hi], intensity] = pick(r, options)
  if (sport === 'yoga' && r() < 0.3) return null
  const minutes = Math.round(between(r, lo, hi))
  const start = new Date(`${key}T00:00:00`)
  start.setMinutes(Math.round(hour * 60 + between(r, -20, 20)))
  const maxHr = maxHrOf(profile)
  const a = { id: uid(), sport, start: start.toISOString(), durationMin: minutes, rpe: { gentle: 3, easy: 4, long: 6, intervals: 8, strength: 6 }[intensity] }
  if (caps.includes('hr')) {
    const bpm = hrSeries(r, minutes, intensity, maxHr)
    a.hr = { interval: 60, bpm }
    a.avgHr = Math.round(bpm.reduce((s, b) => s + b, 0) / bpm.length)
    a.maxHr = Math.max(...bpm)
  }
  const speed = { run: intensity === 'intervals' ? 11.2 : intensity === 'long' ? 9.8 : 10.2, ride: 26, indoor_ride: 30, hike: 4, walk: 5.2, swim: 3 }[sport]
  if (speed) a.distanceKm = round((speed * between(r, 0.92, 1.08) * minutes) / 60, 2)
  if (sport === 'swim') a.poolM = 25
  if (caps.includes('elevation') && ['run', 'ride', 'hike', 'walk'].includes(sport))
    a.elevationM = Math.round({ run: 60, ride: 650, hike: 520, walk: 25 }[sport] * between(r, 0.6, 1.5))
  if (caps.includes('cadence')) {
    if (sport === 'run') a.cadence = Math.round(between(r, 162, 178))
    if (sport.includes('ride')) a.cadence = Math.round(between(r, 82, 94))
  }
  if (caps.includes('power') && sport.includes('ride')) a.avgPower = Math.round(between(r, 165, 215) * (intensity === 'intervals' ? 1.15 : 1))
  if (sport === 'strength')
    a.sets = [
      { exercise: 'Back squat', sets: 4, reps: 6, weightKg: round(between(r, 70, 85)) },
      { exercise: 'Bench press', sets: 4, reps: 8, weightKg: round(between(r, 55, 65)) },
      { exercise: 'Barbell row', sets: 3, reps: 10, weightKg: round(between(r, 45, 55)) },
      { exercise: 'Plank', sets: 3, reps: 1, weightKg: 0 },
    ]
  a.calories = estimateCalories(a, profile)
  return a
}

function sleepFor(key, profile, caps, r) {
  const weekend = [0, 6].includes(new Date(`${key}T12:00:00`).getDay())
  const bed = new Date(`${key}T00:00:00`)
  bed.setDate(bed.getDate() - 1)
  bed.setMinutes(22 * 60 + 35 + (weekend ? 40 : 0) + Math.round(between(r, -35, 35)))
  const segments = []
  let deep = 0, rem = 0, light = 0, awake = 0
  const targetAsleep = between(r, 375, 495)
  let asleep = 0
  let cycle = 0
  const push = (stage, min) => {
    min = Math.max(1, Math.round(min))
    segments.push({ stage, min })
    if (stage === 'deep') deep += min
    else if (stage === 'rem') rem += min
    else if (stage === 'light') light += min
    else awake += min
    if (stage !== 'awake') asleep += min
  }
  push('awake', between(r, 5, 15))
  while (asleep < targetAsleep) {
    push('light', between(r, 18, 30))
    push('deep', Math.max(5, between(r, 30, 42) - cycle * 8))
    push('light', between(r, 8, 15))
    push('rem', Math.min(40, between(r, 10, 16) + cycle * 6))
    if (r() < 0.45) push('awake', between(r, 2, 8))
    cycle++
  }
  const total = deep + rem + light + awake
  const wake = new Date(bed.getTime() + total * 60000)
  const s = { id: uid(), date: key, bedtime: bed.toISOString(), wake: wake.toISOString(), durationMin: asleep }
  if (caps.includes('stages')) {
    s.stages = { deep, rem, light, awake }
    s.segments = segments
  }
  if (caps.includes('resp')) s.respRate = round(between(r, 14, 16.2), 1)
  s.quality = asleep > 450 ? 5 : asleep > 410 ? 4 : asleep > 370 ? 3 : 2
  return s
}

/** Generate `days` of sample data for one device. */
export function generateDemo(deviceId, profile, days = 120) {
  const dev = deviceFor(deviceId)
  const caps = dev.caps
  const activities = []
  const sleep = []
  const daily = []
  let prevTrimp = 0
  const baseRhr = 55
  const baseHrv = 64
  const startKg = profile.weightKg || 75
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(new Date(), -i)
    const key = dayKey(date)
    const r = rng(`${deviceId}-${key}`)
    const dow = (date.getDay() + 6) % 7
    let todayTrimp = 0
    if (caps.includes('workouts')) {
      const w = workoutFor(key, dow, profile, caps)
      if (w && new Date(w.start) < new Date()) {
        w.source = deviceId
        activities.push(w)
        todayTrimp = trimpOf(w, profile)
      }
    } else {
      const w = workoutFor(key, dow, profile, ['hr'])
      if (w) todayTrimp = trimpOf(w, profile)
    }
    let sleepMin = 440
    if (caps.includes('sleep')) {
      const s = sleepFor(key, profile, caps, r)
      s.source = deviceId
      sleep.push(s)
      sleepMin = s.durationMin
    }
    const fatigue = dayStrainFromTrimp(prevTrimp) - 9
    const rec = { id: uid(), day: key, source: deviceId }
    const rhr = Math.round(baseRhr + fatigue * 0.45 + (420 - sleepMin) / 40 + between(r, -2, 2))
    const hrv = Math.round(baseHrv - fatigue * 1.6 + (sleepMin - 420) / 12 + between(r, -7, 7))
    if (caps.includes('rhr')) rec.rhr = rhr
    if (caps.includes('hrv')) rec.hrv = hrv
    if (caps.includes('recovery')) rec.recovery = Math.round(clamp(58 + (hrv - baseHrv) * 1.8 + (baseRhr - rhr) * 2.2 + (sleepMin - 430) / 6 + between(r, -6, 6), 8, 99))
    if (caps.includes('strain')) rec.strain = dayStrainFromTrimp(todayTrimp)
    if (caps.includes('steps')) rec.steps = Math.round(between(r, 4500, 9000) + (todayTrimp ? between(r, 1500, 5000) : 0))
    if (caps.includes('spo2')) rec.spo2 = round(between(r, 95.5, 98.8), 1)
    if (caps.includes('temp')) rec.skinTemp = round(between(r, -0.4, 0.4), 2)
    if (caps.includes('weight') && r() < 0.6) rec.weightKg = round(startKg + (i / days) * 1.5 - 0.75 + between(r, -0.4, 0.4), 1)
    if (Object.keys(rec).length > 3) daily.push(rec)
    prevTrimp = todayTrimp
  }
  return { activities, sleep, daily }
}

/** Three weeks of sample meals and water, tagged as demo data. */
export function generateSampleNutrition(days = 21) {
  const byCat = (c) => FOODS.filter((f) => f.cat === c)
  const plan = {
    breakfast: [...byCat('Grains').slice(0, 7), ...byCat('Dairy').slice(0, 2), FOODS.find((f) => f.name.startsWith('Eggs, scrambled'))],
    lunch: byCat('Meals'),
    dinner: [...byCat('Meals'), ...byCat('Protein').slice(3, 12)],
    snack: [...byCat('Fruit'), ...byCat('Snacks'), ...byCat('Nuts & fats').slice(0, 4)],
  }
  const meals = []
  const water = {}
  for (let i = days - 1; i >= 1; i--) {
    const key = dayKey(addDays(new Date(), -i))
    const r = rng(`food-${key}`)
    Object.entries(plan).forEach(([mealType, list]) => {
      const n = mealType === 'snack' ? Math.floor(between(r, 1, 3)) : mealType === 'dinner' ? 2 : 1
      for (let j = 0; j < n; j++) {
        const f = pick(r, list)
        meals.push({ id: uid(), day: key, mealType, foodId: f.id, name: f.name, serving: f.serving, servings: 1, cal: f.cal, p: f.p, c: f.c, f: f.f, source: 'demo' })
      }
    })
    water[key] = Math.round(between(r, 1200, 2800) / 250) * 250
  }
  return { meals, water }
}
