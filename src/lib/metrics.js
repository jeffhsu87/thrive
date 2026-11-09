import { sportFor } from './sports.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round1 = (v) => Math.round(v * 10) / 10

export const ZONES = [
  { n: 1, name: 'Warm-up', lo: 0.5, hi: 0.6, desc: 'Very easy. You could chat freely.' },
  { n: 2, name: 'Easy', lo: 0.6, hi: 0.7, desc: 'Comfortable and conversational. Builds your endurance base.' },
  { n: 3, name: 'Steady', lo: 0.7, hi: 0.8, desc: 'Moderate. You can talk in short sentences.' },
  { n: 4, name: 'Hard', lo: 0.8, hi: 0.9, desc: 'Challenging. Only a few words at a time.' },
  { n: 5, name: 'Max', lo: 0.9, hi: 1.0, desc: 'All-out effort you can hold for short bursts.' },
]

export const ageOf = (profile) => (profile.birthYear ? new Date().getFullYear() - profile.birthYear : 35)
/** Tanaka formula unless the person set their own max heart rate. */
export const maxHrOf = (profile) => profile.maxHr || Math.round(208 - 0.7 * ageOf(profile))

export function zoneOf(bpm, maxHr) {
  const r = bpm / maxHr
  if (r < ZONES[0].lo) return 0
  const z = ZONES.find((zone) => r < zone.hi)
  return z ? z.n : 5
}

export const zoneRange = (zone, maxHr) => [Math.round(zone.lo * maxHr), Math.round(zone.hi * maxHr)]

/** Minutes spent in each zone: index 0 = below zone 1, 1..5 = zones. */
export function zoneMinutes(a, maxHr) {
  const out = [0, 0, 0, 0, 0, 0]
  if (a.hr?.bpm?.length) {
    const step = (a.hr.interval || 60) / 60
    a.hr.bpm.forEach((b) => {
      if (b) out[zoneOf(b, maxHr)] += step
    })
    return out
  }
  if (a.avgHr && a.durationMin) {
    out[zoneOf(a.avgHr, maxHr)] = a.durationMin
    return out
  }
  return null
}

const ZONE_WEIGHT = [0.5, 1, 2, 3, 4, 5]

/** Training load (Edwards TRIMP). Falls back to effort rating, then to the sport's typical intensity. */
export function trimpOf(a, profile) {
  const zm = zoneMinutes(a, maxHrOf(profile))
  if (zm) return zm.reduce((sum, m, i) => sum + m * ZONE_WEIGHT[i], 0)
  const min = a.durationMin || 0
  if (a.rpe) return min * (a.rpe / 2)
  return min * clamp(sportFor(a.sport).met / 3, 0.7, 4)
}

/** Strain on a 0–21 scale with diminishing returns, similar in spirit to WHOOP strain. */
export const strainFromTrimp = (t) => round1(21 * (1 - Math.exp(-t / 250)))
export const activityStrain = (a, profile) => a.strain ?? strainFromTrimp(trimpOf(a, profile))
/** Everyday movement contributes a small baseline. */
export const dayStrainFromTrimp = (t) => strainFromTrimp(t + 30)

export function strainLabel(v) {
  if (v == null) return ''
  if (v < 10) return 'Light'
  if (v < 14) return 'Moderate'
  if (v < 18) return 'High'
  return 'All out'
}

/** Active calories. Uses Keytel et al. (2005) heart-rate formula when heart rate is known, else METs. */
export function estimateCalories(a, profile) {
  const w = profile.weightKg || 70
  const age = ageOf(profile)
  const min = a.durationMin || 0
  if (a.avgHr) {
    const hr = a.avgHr
    const male = (-55.0969 + 0.6309 * hr + 0.1988 * w + 0.2017 * age) / 4.184
    const female = (-20.4022 + 0.4472 * hr - 0.1263 * w + 0.074 * age) / 4.184
    const perMin = profile.sex === 'female' ? female : profile.sex === 'male' ? male : (male + female) / 2
    if (perMin > 0) return Math.round(perMin * min)
  }
  // Subtract resting metabolism (1 MET) so the number reflects calories from the activity itself.
  return Math.round(Math.max(sportFor(a.sport).met - 1, 0.5) * w * (min / 60))
}

export const sleepStageTotal = (st) => (st ? (st.deep || 0) + (st.rem || 0) + (st.light || 0) + (st.awake || 0) : 0)

/** 0–100: duration vs need (55), how rested you felt (20), restorative deep+REM share (25). */
export function sleepScore(s, targetHours = 8) {
  if (!s) return null
  if (s.score != null) return Math.round(s.score)
  const need = targetHours * 60
  const dur = Math.min((s.durationMin || 0) / need, 1) * 55
  const quality = s.quality ? (s.quality / 5) * 20 : 14
  let stages = 17
  const tot = sleepStageTotal(s.stages)
  if (tot > 0) {
    const restorative = ((s.stages.deep || 0) + (s.stages.rem || 0)) / tot
    stages = Math.min(restorative / 0.4, 1) * 25
  }
  return Math.round(clamp(dur + quality + stages, 0, 100))
}

export function sleepLabel(score) {
  if (score == null) return ''
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

/**
 * Recovery estimate (1–99) for people without a device that reports one.
 * HRV and resting HR are compared with the person's own 30-day baseline.
 */
export function estimateRecovery({ hrv, hrvBase, rhr, rhrBase, sleepScore: ss, prevStrain }) {
  const parts = []
  if (hrv && hrvBase) parts.push([clamp(50 + (hrv / hrvBase - 1) * 150, 0, 100), 0.45, 'hrv'])
  if (rhr && rhrBase) parts.push([clamp(55 + (rhrBase - rhr) * 7, 0, 100), 0.2, 'rhr'])
  if (ss != null) parts.push([ss, 0.3, 'sleep'])
  if (!parts.some((p) => p[2] === 'hrv' || p[2] === 'sleep')) return null
  if (prevStrain != null) parts.push([clamp(100 - (prevStrain - 8) * 6, 20, 100), 0.15, 'strain'])
  const w = parts.reduce((s, p) => s + p[1], 0)
  return Math.round(clamp(parts.reduce((s, p) => s + p[0] * p[1], 0) / w, 1, 99))
}

export function recoveryStatus(score) {
  if (score == null) return null
  if (score >= 67)
    return { level: 'good', label: 'Ready to go', icon: '▲', advice: 'Your body is well recovered. A great day to push a little harder.', strainTarget: [14, 18] }
  if (score >= 34)
    return { level: 'warning', label: 'Take it steady', icon: '●', advice: 'You are partly recovered. Moderate activity is a good fit today.', strainTarget: [10, 14] }
  return { level: 'critical', label: 'Prioritize rest', icon: '▼', advice: 'Your body is asking for rest. Try light movement, hydration and an early night.', strainTarget: [0, 10] }
}

export const mean = (arr) => {
  const v = arr.filter((x) => x != null && !Number.isNaN(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export const stdDev = (arr) => {
  const m = mean(arr)
  const v = arr.filter((x) => x != null)
  if (m == null || v.length < 2) return null
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length)
}

export const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0)

/** Body-mass index with plain-language category. */
export function bmiOf(kg, cm) {
  if (!kg || !cm) return null
  const v = kg / (cm / 100) ** 2
  const label = v < 18.5 ? 'Below the typical range' : v < 25 ? 'In the typical range' : v < 30 ? 'Above the typical range' : 'Well above the typical range'
  return { value: Math.round(v * 10) / 10, label }
}

export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
