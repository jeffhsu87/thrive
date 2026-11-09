// All data is stored in metric units; these helpers convert for display and input.
const KM_PER_MI = 1.609344
const LB_PER_KG = 2.20462
const FT_PER_M = 3.28084
const ML_PER_OZ = 29.5735

export const isImperial = (units) => units === 'imperial'

export const distUnit = (u) => (isImperial(u) ? 'mi' : 'km')
export const weightUnit = (u) => (isImperial(u) ? 'lb' : 'kg')
export const elevUnit = (u) => (isImperial(u) ? 'ft' : 'm')
export const waterUnit = (u) => (isImperial(u) ? 'oz' : 'ml')

const round = (n, dec = 1) => {
  const f = 10 ** dec
  return Math.round(n * f) / f
}

export const kmTo = (km, u) => (isImperial(u) ? km / KM_PER_MI : km)
export const toKm = (v, u) => (isImperial(u) ? v * KM_PER_MI : v)
export const kgTo = (kg, u) => (isImperial(u) ? kg * LB_PER_KG : kg)
export const toKg = (v, u) => (isImperial(u) ? v / LB_PER_KG : v)
export const mTo = (m, u) => (isImperial(u) ? m * FT_PER_M : m)
export const toM = (v, u) => (isImperial(u) ? v / FT_PER_M : v)
export const mlTo = (ml, u) => (isImperial(u) ? ml / ML_PER_OZ : ml)
export const toMl = (v, u) => (isImperial(u) ? v * ML_PER_OZ : v)

export const fmtNum = (n, dec = 0) =>
  n == null || Number.isNaN(n) ? '—' : Number(round(n, dec)).toLocaleString(undefined, { maximumFractionDigits: dec })

export const fmtDist = (km, u, dec = 1) => (km == null ? '—' : `${fmtNum(kmTo(km, u), dec)} ${distUnit(u)}`)
export const fmtWeight = (kg, u, dec = 1) => (kg == null ? '—' : `${fmtNum(kgTo(kg, u), dec)} ${weightUnit(u)}`)
export const fmtElev = (m, u) => (m == null ? '—' : `${fmtNum(mTo(m, u))} ${elevUnit(u)}`)
export const fmtWater = (ml, u) =>
  ml == null ? '—' : isImperial(u) ? `${fmtNum(mlTo(ml, u))} oz` : ml >= 1000 ? `${fmtNum(ml / 1000, 2)} L` : `${fmtNum(ml)} ml`

export function fmtDuration(min) {
  if (min == null || Number.isNaN(min)) return '—'
  const total = Math.round(min)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`
}

export function fmtHours(min) {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

const mmss = (minutes) => {
  let m = Math.floor(minutes)
  let s = Math.round((minutes - m) * 60)
  if (s === 60) {
    m += 1
    s = 0
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

/** Pace / speed text appropriate to the sport. */
export function fmtPace(kind, durationMin, km, u) {
  if (!km || !durationMin) return null
  if (kind === 'pace') return `${mmss(durationMin / kmTo(km, u))} /${distUnit(u)}`
  if (kind === 'speed') return `${fmtNum(kmTo(km, u) / (durationMin / 60), 1)} ${isImperial(u) ? 'mph' : 'km/h'}`
  if (kind === 'swim') return `${mmss(durationMin / (km * 10))} /100m`
  if (kind === 'row') return `${mmss(durationMin / (km * 2))} /500m`
  return null
}

export const paceLabel = (kind) =>
  ({ pace: 'Avg pace', speed: 'Avg speed', swim: 'Pace', row: 'Split' })[kind] || 'Pace'
