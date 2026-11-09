import { addDays, clockFromBedMinutes, dayKey, startOfWeek } from './date.js'
import { recoveryStatus } from './metrics.js'
import { summarize } from './stats.js'
import { sportFor } from './sports.js'
import { PROTEIN_IDEAS } from './foods.js'
import { fmtHours, fmtWater } from './units.js'

/**
 * Plain-language suggestions ranked by how useful they are right now.
 * Each: { id, tone: 'rest' | 'push' | 'nudge' | 'praise' | 'start', emoji, title, body, action? }
 */
export function recommendations({ index, profile, goals = [], devicesConnected = 0 }) {
  const recs = []
  const t = profile.targets
  const now = new Date()
  const hour = now.getHours()
  const today = index.get(dayKey())
  const week = summarize(index, addDays(now, -6), 7, profile)
  const thisWeek = summarize(index, startOfWeek(), 7, profile)
  const month = summarize(index, addDays(now, -29), 30, profile)
  const hasAnyData = index.days.size > 0

  if (!hasAnyData) {
    recs.push({ id: 'start-log', tone: 'start', emoji: '✨', title: 'Log your first activity', body: 'A walk around the block counts. Every journey starts with one entry.', action: { label: 'Log a workout', log: 'workout' } })
    recs.push({ id: 'start-device', tone: 'start', emoji: '⌚', title: 'Connect a device', body: 'Bring in workouts, sleep and heart data automatically from your watch, ring or band.', action: { label: 'Connect', to: '/devices' } })
    recs.push({ id: 'start-goal', tone: 'start', emoji: '🎯', title: 'Set a simple goal', body: 'People who set a clear, small goal are far more likely to stick with it.', action: { label: 'Pick a goal', to: '/goals' } })
    return recs
  }

  const status = recoveryStatus(today.recovery)
  if (status?.level === 'critical')
    recs.push({ id: 'rec-low', tone: 'rest', emoji: '🛌', title: 'Make today an easy day', body: `Recovery is ${today.recovery}%. Gentle yoga, a walk or stretching will help you bounce back faster than a hard session.`, action: { label: 'Try a breathing session', to: '/mindful' } })
  else if (status?.level === 'good' && !today.activities.length)
    recs.push({ id: 'rec-high', tone: 'push', emoji: '🚀', title: 'Green light for a big effort', body: `Recovery is ${today.recovery}%. If you have been planning an interval session or a long one, today is a great day for it.`, action: { label: 'Log a workout', log: 'workout' } })

  const last3 = [0, 1, 2].map((i) => index.get(dayKey(addDays(now, -i))).strain || 0)
  if (last3.every((s) => s >= 14))
    recs.push({ id: 'strain-run', tone: 'rest', emoji: '⚖️', title: 'Three hard days in a row', body: 'Your strain has been high for three days. Rest days are when your body actually gets fitter.' })

  if (week.sleepNights >= 3 && week.sleepDebtMin > 180) {
    const need = t.sleepHours * 60
    const bed = week.avgBedtime != null ? clockFromBedMinutes(week.avgBedtime - 30) : null
    recs.push({ id: 'sleep-debt', tone: 'nudge', emoji: '🌙', title: `You are ${fmtHours(week.sleepDebtMin)} short on sleep this week`, body: bed ? `Try lights-out around ${bed} tonight, 30 minutes earlier than usual, to start paying it back.` : `Aim for ${fmtHours(need)} tonight to start catching up.`, action: { label: 'See sleep', to: '/sleep' } })
  }
  if (week.bedtimeSd != null && week.bedtimeSd > 60)
    recs.push({ id: 'sleep-consistency', tone: 'nudge', emoji: '⏰', title: 'Keep a steadier bedtime', body: 'Your bedtime varies by more than an hour. Going to bed at a similar time each night improves sleep quality, even on weekends.' })

  if (hour >= 15 && today.meals.length && today.protein < t.protein * 0.5)
    recs.push({ id: 'protein', tone: 'nudge', emoji: '🥚', title: `${Math.round(t.protein - today.protein)} g protein to go today`, body: `Easy wins: ${PROTEIN_IDEAS.slice(0, 3).join(', ')}.`, action: { label: 'Log food', log: 'meal' } })
  if (hour >= 14 && today.waterMl < t.waterMl * 0.5)
    recs.push({ id: 'water', tone: 'nudge', emoji: '💧', title: 'Time for some water', body: `You have had ${fmtWater(today.waterMl, profile.units)} so far. A glass now keeps energy and focus up.`, action: { label: 'Add a glass', water: 250 } })

  let daysSince = null
  for (let i = 0; i < 30; i++) {
    if (index.get(dayKey(addDays(now, -i))).activities.length) {
      daysSince = i
      break
    }
  }
  if (daysSince != null && daysSince >= 3)
    recs.push({ id: 'move', tone: 'nudge', emoji: '🚶', title: `It has been ${daysSince} days since your last workout`, body: 'No need for anything big. A 20-minute walk or a short stretch keeps the habit alive.', action: { label: 'Log a workout', log: 'workout' } })

  const dow = (now.getDay() + 6) % 7
  const left = t.workoutsPerWeek - thisWeek.workouts
  if (left > 0 && dow >= 3)
    recs.push({ id: 'week-goal', tone: 'nudge', emoji: '📅', title: `${left} more workout${left === 1 ? '' : 's'} to hit your weekly goal`, body: `You have ${7 - dow} day${7 - dow === 1 ? '' : 's'} left this week. You can do it!` })
  else if (left <= 0 && thisWeek.workouts > 0)
    recs.push({ id: 'week-done', tone: 'praise', emoji: '🎉', title: 'Weekly workout goal: done', body: `${thisWeek.workouts} workouts this week. Anything more is a bonus. Remember to rest too.` })

  goals
    .filter((g) => g.status === 'behind')
    .slice(0, 2)
    .forEach((g) => recs.push({ id: `goal-${g.goal.id}`, tone: 'nudge', emoji: g.def.emoji, title: `“${g.goal.title}” needs a little push`, body: g.note, action: { label: 'View goals', to: '/goals' } }))

  const cats = new Set(month.days.flatMap((d) => d.activities.map((a) => sportFor(a.sport).cat)))
  if (month.workouts >= 6 && !cats.has('strength'))
    recs.push({ id: 'strength', tone: 'nudge', emoji: '🏋️', title: 'Add some strength work', body: 'Two short strength sessions a week protect joints, improve performance and help prevent injuries.' })
  if (month.workouts >= 8 && cats.size === 1)
    recs.push({ id: 'variety', tone: 'nudge', emoji: '🎨', title: 'Mix it up', body: 'Cross-training with a different activity uses new muscles and keeps things fun.' })
  if (month.workouts >= 6 && !cats.has('mind'))
    recs.push({ id: 'mobility', tone: 'nudge', emoji: '🙆', title: 'Try a mobility session', body: '15 minutes of yoga or stretching helps you recover and move better.' })

  if (week.avgSleepMin >= t.sleepHours * 60 - 20 && week.sleepNights >= 5)
    recs.push({ id: 'sleep-good', tone: 'praise', emoji: '🌟', title: 'Great sleep this week', body: `You averaged ${fmtHours(week.avgSleepMin)} a night. That is fuel for everything else.` })

  if (!devicesConnected)
    recs.push({ id: 'connect', tone: 'start', emoji: '⌚', title: 'Connect a device for richer insights', body: 'Recovery, heart rate zones and sleep stages work best with data from a wearable.', action: { label: 'Connect', to: '/devices' } })

  const order = { rest: 0, push: 1, nudge: 2, praise: 3, start: 4 }
  return recs.sort((a, b) => order[a.tone] - order[b.tone])
}

const QUOTES = [
  'Small steps every day add up to big changes.',
  'You do not have to be extreme, just consistent.',
  'Rest is part of the plan, not a break from it.',
  'The best workout is the one you actually do.',
  'Progress, not perfection.',
  'Your future self will thank you for today.',
  'Motivation gets you started. Habit keeps you going.',
  'Every rep, every step, every glass of water counts.',
  'Be proud of how far you have come.',
  'Strong is a feeling, not a number.',
  'A good night of sleep is a performance enhancer.',
  'Listen to your body. It is smarter than any plan.',
]

export function dailyQuote(date = new Date()) {
  const n = Math.floor(date.getTime() / 864e5)
  return QUOTES[n % QUOTES.length]
}

/** One encouraging line for the top of the dashboard. */
export function headline({ stats, today, profile }) {
  if (stats.activeStreak >= 3) return `🔥 ${stats.activeStreak}-day activity streak. Keep it going!`
  if (stats.weekStreak >= 2) return `📅 ${stats.weekStreak} weeks in a row hitting your workout goal.`
  if (today.activities.length) return '✅ You moved today. That is a win.'
  if (stats.logStreak >= 3) return `✨ You have checked in ${stats.logStreak} days in a row.`
  if (!stats.workouts) return `Welcome${profile.name ? `, ${profile.name}` : ''}! Let’s start with something small today.`
  return dailyQuote()
}

/** Short positive feedback after logging a workout. */
export function workoutCheer(activity, weekCount, profile) {
  const sp = sportFor(activity.sport)
  const n = weekCount
  const ord = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
  const target = profile.targets.workoutsPerWeek
  if (n === target) return `${sp.emoji} Weekly goal reached! That is ${n} workouts this week.`
  if (n > target) return `${sp.emoji} Bonus workout! ${n} this week. You are on a roll.`
  return `${sp.emoji} Nice ${sp.name.toLowerCase()}! Your ${ord} workout this week.`
}
