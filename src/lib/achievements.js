import { addDays, currentStreak, dayKey, longestStreak, rangeKeys, startOfWeek } from './date.js'
import { sportFor } from './sports.js'

/** Lifetime numbers that badges, XP and streaks are computed from. */
export function lifetimeStats({ index, profile, goalsDone = 0, devicesConnected = 0, mealsLogged = 0, habitChecks = 0 }) {
  const acts = index.activities
  const days = [...index.days.values()]
  const by = (pred) => acts.filter(pred)
  const maxDist = (ids) => Math.max(0, ...by((a) => ids.includes(a.sport)).map((a) => a.distanceKm || 0))
  const activeDays = days.filter((d) => d.activities.length).map((d) => d.key)
  const loggedDays = days
    .filter((d) => d.activities.length || d.meals.length || d.journalCount || d.habitsDone || d.waterMl || d.mindfulMin || (d.sleep && d.sleep.source === 'manual'))
    .map((d) => d.key)
  const sleepTarget = profile.targets.sleepHours * 60
  const goodSleepDays = days.filter((d) => d.sleepMin != null && d.sleepMin >= sleepTarget - 30).map((d) => d.key)
  const hydrationDays = days.filter((d) => d.waterMl >= profile.targets.waterMl).map((d) => d.key)
  const proteinDays = days.filter((d) => d.meals.length && d.protein >= profile.targets.protein).map((d) => d.key)
  const journalDays = days.filter((d) => d.journalCount).map((d) => d.key)

  // Weeks in a row hitting the weekly workout target (current week counts once it is hit).
  let weekStreak = 0
  const ws = startOfWeek()
  const weekCount = (start) => rangeKeys(start, 7).reduce((n, k) => n + index.get(k).activities.length, 0)
  const target = profile.targets.workoutsPerWeek
  if (weekCount(ws) >= target) weekStreak++
  for (let i = 1; i < 104 && weekCount(addDays(ws, -7 * i)) >= target; i++) weekStreak++

  return {
    workouts: acts.length,
    totalMin: acts.reduce((s, a) => s + (a.durationMin || 0), 0),
    totalKm: acts.reduce((s, a) => s + (a.distanceKm || 0), 0),
    longestRun: maxDist(['run', 'trail_run', 'treadmill']),
    longestRide: maxDist(['ride', 'mtb', 'indoor_ride']),
    swimKm: by((a) => sportFor(a.sport).cat === 'water' && a.sport.includes('swim')).reduce((s, a) => s + (a.distanceKm || 0), 0),
    maxElevation: Math.max(0, ...acts.map((a) => a.elevationM || 0)),
    sportsCount: new Set(acts.map((a) => a.sport)).size,
    mindBody: by((a) => sportFor(a.sport).cat === 'mind').length,
    strength: by((a) => sportFor(a.sport).cat === 'strength').length,
    team: by((a) => ['team', 'racket'].includes(sportFor(a.sport).cat)).length,
    earlyBird: by((a) => new Date(a.start).getHours() < 7).length,
    longSession: Math.max(0, ...acts.map((a) => a.durationMin || 0)),
    maxStrain: Math.max(0, ...days.map((d) => d.strain || 0)),
    activeStreak: currentStreak(activeDays),
    bestActiveStreak: longestStreak(activeDays),
    logStreak: currentStreak(loggedDays),
    bestLogStreak: longestStreak(loggedDays),
    weekStreak,
    goodSleepStreak: longestStreak(goodSleepDays),
    sleepNights: days.filter((d) => d.sleepMin != null).length,
    hydrationDays: hydrationDays.length,
    proteinDays: proteinDays.length,
    journalEntries: days.reduce((s, d) => s + d.journalCount, 0),
    journalStreak: longestStreak(journalDays),
    mindfulMin: days.reduce((s, d) => s + d.mindfulMin, 0),
    greenDays: days.filter((d) => d.recovery >= 67).length,
    mealsLogged,
    habitChecks,
    goalsDone,
    devicesConnected,
    activeToday: activeDays.includes(dayKey()),
  }
}

const b = (id, name, emoji, group, desc, value, target) => ({ id, name, emoji, group, desc, value, target })

export const BADGE_GROUPS = ['Getting started', 'Consistency', 'Distance & effort', 'Variety', 'Recovery & sleep', 'Nutrition', 'Mind']

export function badgesFor(s) {
  return [
    b('first-workout', 'First step', '👟', 'Getting started', 'Log your first workout.', s.workouts, 1),
    b('first-device', 'Plugged in', '⌚', 'Getting started', 'Connect a device or import data.', s.devicesConnected, 1),
    b('first-goal', 'Goal getter', '🎯', 'Getting started', 'Complete your first goal.', s.goalsDone, 1),
    b('first-meal', 'Food logger', '🥗', 'Getting started', 'Log 10 foods.', s.mealsLogged, 10),
    b('workouts-10', 'Ten strong', '🔟', 'Consistency', 'Log 10 workouts.', s.workouts, 10),
    b('workouts-50', 'Half century', '🥈', 'Consistency', 'Log 50 workouts.', s.workouts, 50),
    b('workouts-100', 'Centurion', '🥇', 'Consistency', 'Log 100 workouts.', s.workouts, 100),
    b('streak-7', 'Week on fire', '🔥', 'Consistency', 'Be active 7 days in a row.', s.bestActiveStreak, 7),
    b('log-30', 'Habit formed', '📆', 'Consistency', 'Log something 30 days in a row.', s.bestLogStreak, 30),
    b('weeks-4', 'Month of momentum', '🗓️', 'Consistency', 'Hit your weekly workout goal 4 weeks in a row.', s.weekStreak, 4),
    b('hours-24', 'Full day of effort', '⏳', 'Consistency', 'Train for 24 hours in total.', Math.round(s.totalMin / 60), 24),
    b('early-bird', 'Early bird', '🌅', 'Consistency', 'Finish 5 workouts that start before 7 am.', s.earlyBird, 5),
    b('run-5k', '5K finisher', '🏃', 'Distance & effort', 'Run 5 km in one go.', s.longestRun, 5),
    b('run-10k', '10K club', '🏅', 'Distance & effort', 'Run 10 km in one go.', s.longestRun, 10),
    b('run-half', 'Half marathoner', '🎽', 'Distance & effort', 'Run 21.1 km in one go.', s.longestRun, 21.1),
    b('ride-50', 'Half century ride', '🚴', 'Distance & effort', 'Ride 50 km in one go.', s.longestRide, 50),
    b('ride-100', 'Century rider', '🚵', 'Distance & effort', 'Ride 100 km in one go.', s.longestRide, 100),
    b('swim-10', 'Fish mode', '🐟', 'Distance & effort', 'Swim 10 km in total.', s.swimKm, 10),
    b('climb-1000', 'Mountain goat', '🐐', 'Distance & effort', 'Climb 1,000 m in one session.', s.maxElevation, 1000),
    b('km-500', 'Globe trotter', '🌍', 'Distance & effort', 'Cover 500 km in total.', s.totalKm, 500),
    b('strain-18', 'Left it all out there', '💥', 'Distance & effort', 'Reach a day strain of 18.', s.maxStrain, 18),
    b('sports-5', 'All-rounder', '🎨', 'Variety', 'Try 5 different activities.', s.sportsCount, 5),
    b('strength-10', 'Iron will', '🏋️', 'Variety', 'Complete 10 strength sessions.', s.strength, 10),
    b('team-5', 'Team player', '🤝', 'Variety', 'Play 5 team or racket sport sessions.', s.team, 5),
    b('mind-10', 'Bend, don’t break', '🧘', 'Variety', 'Complete 10 yoga, Pilates or mobility sessions.', s.mindBody, 10),
    b('sleep-7', 'Well rested', '😴', 'Recovery & sleep', 'Sleep close to your target 7 nights in a row.', s.goodSleepStreak, 7),
    b('sleep-30', 'Sleep tracker', '🌙', 'Recovery & sleep', 'Track 30 nights of sleep.', s.sleepNights, 30),
    b('green-10', 'In the green', '💚', 'Recovery & sleep', 'Have 10 days with high recovery.', s.greenDays, 10),
    b('hydrate-7', 'Hydration hero', '💧', 'Nutrition', 'Hit your water goal on 7 days.', s.hydrationDays, 7),
    b('protein-7', 'Protein pro', '🥚', 'Nutrition', 'Hit your protein goal on 7 days.', s.proteinDays, 7),
    b('meals-100', 'Mindful eater', '🍽️', 'Nutrition', 'Log 100 foods.', s.mealsLogged, 100),
    b('journal-7', 'Reflective', '📓', 'Mind', 'Journal 7 days in a row.', s.journalStreak, 7),
    b('journal-50', 'Storyteller', '✍️', 'Mind', 'Write 50 journal entries.', s.journalEntries, 50),
    b('mindful-60', 'Calm mind', '🌿', 'Mind', 'Spend 60 minutes on mindfulness.', s.mindfulMin, 60),
    b('habits-50', 'Habit builder', '✅', 'Mind', 'Check off 50 habits.', s.habitChecks, 50),
  ].map((x) => ({ ...x, earned: x.value >= x.target, pct: Math.min(x.value / x.target, 1) }))
}

export const LEVEL_NAMES = ['Starter', 'Mover', 'Regular', 'Committed', 'Athlete', 'Dedicated', 'Devoted', 'Elite', 'Champion', 'Hero', 'Icon', 'Legend']

export function xpFor(s, badgesEarned) {
  return Math.round(
    s.workouts * 50 + s.totalMin + s.journalEntries * 20 + s.mealsLogged * 5 + s.sleepNights * 10 + s.habitChecks * 5 + s.hydrationDays * 10 + s.mindfulMin * 2 + badgesEarned * 100 + s.goalsDone * 150
  )
}

/** Level n starts at 400·(n−1)² XP: the first levels come within days, later ones take months. */
export function levelFor(xp) {
  const level = Math.floor(Math.sqrt(xp / 400)) + 1
  const start = 400 * (level - 1) ** 2
  const next = 400 * level ** 2
  return { level, name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)], xp, start, next, pct: (xp - start) / (next - start) }
}
