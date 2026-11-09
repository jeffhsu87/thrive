export const DEFAULT_PROFILE = {
  name: '',
  onboarded: false,
  units: 'metric',
  sex: '',
  birthYear: null,
  heightCm: null,
  weightKg: null,
  experience: 'beginner',
  focus: [],
  maxHr: null,
  showAdvanced: false,
  theme: 'dark',
  targets: {
    workoutsPerWeek: 3,
    activeMinutesPerWeek: 150,
    steps: 8000,
    sleepHours: 8,
    calories: 2000,
    protein: 100,
    carbs: 240,
    fat: 70,
    waterMl: 2000,
  },
  reminders: {
    water: false,
    bedtime: false,
    bedtimeAt: '22:30',
    journal: false,
    journalAt: '20:30',
    move: false,
  },
}

export function normalizeProfile(p) {
  const base = p && typeof p === 'object' ? p : {}
  return {
    ...DEFAULT_PROFILE,
    ...base,
    // The dark performance look became the default in v2 of the theme; older saved profiles move to it once.
    theme: base.themeV2 ? base.theme || 'dark' : 'dark',
    themeV2: true,
    targets: { ...DEFAULT_PROFILE.targets, ...(base.targets || {}) },
    reminders: { ...DEFAULT_PROFILE.reminders, ...(base.reminders || {}) },
  }
}

export const FOCUS_OPTIONS = [
  { id: 'fitness', label: 'Get fitter', emoji: '💪' },
  { id: 'weight', label: 'Lose weight', emoji: '⚖️' },
  { id: 'strength', label: 'Build strength', emoji: '🏋️' },
  { id: 'sleep', label: 'Sleep better', emoji: '😴' },
  { id: 'stress', label: 'Reduce stress', emoji: '🌿' },
  { id: 'event', label: 'Train for an event', emoji: '🏁' },
  { id: 'nutrition', label: 'Eat healthier', emoji: '🥦' },
  { id: 'consistency', label: 'Stay consistent', emoji: '📅' },
]

export const EXPERIENCE = [
  { id: 'beginner', label: 'Just getting started', desc: 'New to exercise, or coming back after a break.', emoji: '🌱' },
  { id: 'intermediate', label: 'Active regularly', desc: 'I work out a few times a week.', emoji: '🚀' },
  { id: 'advanced', label: 'Training seriously', desc: 'I follow plans and like detailed numbers.', emoji: '🏆' },
]

/** Suggested daily targets from body stats and goals (Mifflin-St Jeor + activity factor). */
export function suggestTargets(profile) {
  const t = { ...profile.targets }
  const kg = profile.weightKg
  const cm = profile.heightCm
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const exp = profile.experience
  t.workoutsPerWeek = exp === 'advanced' ? 5 : exp === 'intermediate' ? 4 : 3
  t.activeMinutesPerWeek = exp === 'advanced' ? 300 : exp === 'intermediate' ? 200 : 150
  t.steps = exp === 'beginner' ? 7000 : 9000
  t.sleepHours = 8
  if (kg && cm && age) {
    const sexAdj = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78
    const bmr = 10 * kg + 6.25 * cm - 5 * age + sexAdj
    const factor = exp === 'advanced' ? 1.65 : exp === 'intermediate' ? 1.5 : 1.375
    let cal = bmr * factor
    if (profile.focus.includes('weight')) cal -= 400
    t.calories = Math.round(cal / 50) * 50
    t.protein = Math.round(kg * (profile.focus.includes('strength') || profile.focus.includes('weight') ? 1.8 : 1.4))
    t.fat = Math.round((t.calories * 0.28) / 9)
    t.carbs = Math.max(100, Math.round((t.calories - t.protein * 4 - t.fat * 9) / 4))
  }
  if (kg) t.waterMl = Math.round((kg * 33) / 250) * 250
  return t
}
