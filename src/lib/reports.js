// Weekly / monthly / yearly performance reports built from the same day index the rest of the app uses.
import { dayKey, parseDayKey, rangeKeys, shortDate, longestStreak } from './date.js'
import { summarize } from './stats.js'
import { elapsedDays, periodRange } from './periods.js'
import { maxHrOf, zoneMinutes, mean } from './metrics.js'
import { sportFor } from './sports.js'
import { fmtDist, fmtDuration, fmtHours, fmtNum, fmtPace, fmtWeight, fmtElev, fmtWater } from './units.js'
import { goalProgress, GOAL_TYPES } from './goals.js'

const pctChange = (a, b) => (a == null || b == null || !b ? null : (a - b) / Math.abs(b))
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

function sportBreakdown(days, prevDays) {
  const tally = (ds) => {
    const m = new Map()
    ds.forEach((d) =>
      d.activities.forEach((a) => {
        const cur = m.get(a.sport) || { sport: a.sport, sessions: 0, min: 0, km: 0, cal: 0, strain: 0 }
        cur.sessions++
        cur.min += a.durationMin || 0
        cur.km += a.distanceKm || 0
        cur.cal += a.calories || 0
        cur.strain = Math.max(cur.strain, a.strain || 0)
        m.set(a.sport, cur)
      })
    )
    return m
  }
  const cur = tally(days)
  const prev = tally(prevDays)
  return [...cur.values()].map((s) => ({ ...s, prevMin: prev.get(s.sport)?.min || 0, prevSessions: prev.get(s.sport)?.sessions || 0 })).sort((a, b) => b.min - a.min)
}

/** Personal bests inside the period, flagged when they are also all-time bests up to the period's end. */
function bestsFor(acts, allActs, endKey, units) {
  const before = allActs.filter((a) => dayKey(a.start) <= endKey)
  const out = []
  const add = (label, pick, value, fmt, better = (x, y) => x > y) => {
    const inPeriod = acts.filter(pick)
    if (!inPeriod.length) return
    const best = inPeriod.reduce((a, b) => (better(value(b), value(a)) ? b : a))
    const v = value(best)
    if (v == null || !(v > 0)) return
    const allBest = before.filter(pick).reduce((m, a) => (m == null || better(value(a), m) ? value(a) : m), null)
    out.push({ label, value: fmt(v, best), activity: best, allTime: allBest != null && Math.abs(allBest - v) < 1e-9 })
  }
  const runs = (a) => ['run', 'trail_run', 'treadmill'].includes(a.sport)
  const rides = (a) => ['ride', 'mtb', 'indoor_ride'].includes(a.sport)
  add('Longest run', (a) => runs(a) && a.distanceKm, (a) => a.distanceKm, (v) => fmtDist(v, units, 2))
  add('Fastest run pace (3 km+)', (a) => runs(a) && a.distanceKm >= 3, (a) => a.durationMin / a.distanceKm, (_, a) => fmtPace('pace', a.durationMin, a.distanceKm, units), (x, y) => x < y)
  add('Longest ride', (a) => rides(a) && a.distanceKm, (a) => a.distanceKm, (v) => fmtDist(v, units))
  add('Best ride power', (a) => rides(a) && a.avgPower, (a) => a.avgPower, (v) => `${fmtNum(v)} W`)
  add('Longest swim', (a) => a.sport.includes('swim') && a.distanceKm, (a) => a.distanceKm * 1000, (v) => `${fmtNum(v)} m`)
  add('Most climbing', (a) => a.elevationM, (a) => a.elevationM, (v) => fmtElev(v, units))
  add('Longest session', () => true, (a) => a.durationMin, (v) => fmtDuration(v))
  add('Hardest session', (a) => a.strain, (a) => a.strain, (v) => `${fmtNum(v, 1)} strain`)
  return out
}

function zoneSplit(acts, profile) {
  const maxHr = maxHrOf(profile)
  const z = [0, 0, 0, 0, 0, 0]
  acts.forEach((a) => {
    const zm = zoneMinutes(a, maxHr)
    if (zm) zm.forEach((m, i) => (z[i] += m))
  })
  const total = z.slice(1).reduce((s, x) => s + x, 0)
  return { minutes: z, total, easyShare: total ? (z[1] + z[2]) / total : null, hardShare: total ? (z[4] + z[5]) / total : null }
}

const grade = (v) => (v == null ? null : v >= 85 ? 'Excellent' : v >= 70 ? 'Strong' : v >= 50 ? 'Building' : 'Needs attention')

export function buildReport({ index, profile, goals = [], kind = 'week', offset = 0 }) {
  const p = periodRange(kind, offset)
  const u = profile.units
  const t = profile.targets
  const nElapsed = elapsedDays(p)
  const inProgress = offset === 0 && nElapsed < p.n
  const cur = summarize(index, p.start, nElapsed, profile)
  // Compare like with like: an unfinished period is compared with the same number of days of the previous one.
  const prev = summarize(index, p.prevStart, inProgress ? Math.min(nElapsed, p.prevN) : p.prevN, profile)
  const weeks = nElapsed / 7
  const endKey = cur.keys[cur.keys.length - 1]
  const acts = cur.days.flatMap((d) => d.activities)
  const prevActs = prev.days.flatMap((d) => d.activities)

  const sports = sportBreakdown(cur.days, prev.days)
  const bests = bestsFor(acts, index.activities, endKey, u)
  const zones = zoneSplit(acts, profile)
  const activeKeys = cur.days.filter((d) => d.activities.length).map((d) => d.key)
  const strengthSessions = acts.filter((a) => sportFor(a.sport).cat === 'strength').length

  // Chart buckets: days for week and month, months for year.
  const buckets =
    kind === 'year'
      ? p.buckets.map((b) => {
          const s = summarize(index, b.start, b.n, profile)
          return { key: dayKey(b.start), label: b.label, tip: b.start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), activeMin: s.activeMin, workouts: s.workouts, sleep: s.avgSleepMin, recovery: s.avgRecovery, calIn: s.avgCalIn, activeDays: s.activeDays }
        })
      : rangeKeys(p.start, p.n).map((k) => {
          const d = index.get(k)
          const date = parseDayKey(k)
          return {
            key: k,
            label: kind === 'week' ? date.toLocaleDateString(undefined, { weekday: 'short' }) : String(date.getDate()),
            tip: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
            activeMin: k <= dayKey() ? d.activeMin : null,
            workouts: d.activities.length,
            sleep: d.sleepMin,
            recovery: d.recovery,
            strain: d.strain,
            calIn: d.meals.length ? d.calIn : null,
            future: k > dayKey(),
          }
        })

  // Area scores (0–100), only where there is data for that area.
  const expectedWorkouts = Math.max(1, t.workoutsPerWeek * weeks)
  const scores = {
    consistency: cur.workouts || index.activities.length ? clamp((cur.activeDays / expectedWorkouts) * 100) : null,
    training: cur.workouts || index.activities.length ? clamp((cur.activeMin / Math.max(1, t.activeMinutesPerWeek * weeks)) * 100) : null,
    sleep: cur.avgSleepScore != null ? clamp(cur.avgSleepScore) : null,
    recovery: cur.avgRecovery != null ? clamp(cur.avgRecovery) : null,
    nutrition: cur.nutritionDays ? clamp((cur.nutritionDays / nElapsed) * 40 + (cur.days.filter((d) => d.meals.length && d.protein >= t.protein * 0.9).length / Math.max(1, cur.nutritionDays)) * 60) : null,
  }
  const scored = Object.values(scores).filter((v) => v != null)
  const overall = scored.length ? Math.round(mean(scored)) : null

  // Goals: weekly goals count weeks hit inside the period; others report current progress.
  const goalRows = goals.map((g) => {
    const prog = goalProgress(g, index, profile)
    const def = GOAL_TYPES[g.type]
    if (def.period === 'week' || def.period === 'avg') {
      const periodWeeks = prog.history.filter((h) => dayKey(h.label) >= dayKey(p.start) && dayKey(h.label) <= endKey)
      return { title: g.title, emoji: def.emoji, text: periodWeeks.length ? `Hit ${periodWeeks.filter((h) => h.hit).length} of ${periodWeeks.length} full weeks` : prog.note, done: prog.done }
    }
    return { title: g.title, emoji: def.emoji, text: `${prog.currentText} of ${prog.targetText}`, done: prog.done }
  })

  const wins = []
  const focus = []
  const ch = (f) => pctChange(cur[f], prev[f])
  if (cur.workouts && ch('activeMin') > 0.1) wins.push(`Training time up ${Math.round(ch('activeMin') * 100)}% vs ${p.prevLabel} (${fmtDuration(cur.activeMin)}).`)
  if (cur.workouts && ch('activeMin') < -0.25 && prev.activeMin > 60) focus.push(`Training time dropped ${Math.round(-ch('activeMin') * 100)}% vs ${p.prevLabel}. If that was planned rest, great; if not, schedule two short sessions to get back on track.`)
  if (cur.activeDays >= expectedWorkouts) wins.push(`Hit your consistency target: active on ${cur.activeDays} of ${nElapsed} days.`)
  else if (nElapsed >= 5) focus.push(`Active on ${cur.activeDays} of ${nElapsed} days against a target of about ${Math.round(expectedWorkouts)}. Booking workouts into your calendar makes them far more likely to happen.`)
  const streak = longestStreak(activeKeys)
  if (streak >= 4) wins.push(`Longest streak this ${kind}: ${streak} active days in a row.`)
  if (bests.some((b) => b.allTime)) wins.push(`New all-time best${bests.filter((b) => b.allTime).length > 1 ? 's' : ''}: ${bests.filter((b) => b.allTime).map((b) => `${b.label.toLowerCase()} (${b.value})`).join(', ')}.`)
  if (zones.total > 60) {
    if (zones.hardShare > 0.35) focus.push(`${Math.round(zones.hardShare * 100)}% of your heart-rate time was in zones 4–5. Most athletes improve faster with about 80% easy (zones 1–2) and 20% hard.`)
    else if (zones.easyShare >= 0.65) wins.push(`Well-balanced intensity: ${Math.round(zones.easyShare * 100)}% of training in easy zones builds a strong aerobic base.`)
  }
  if (cur.workouts >= 3 && strengthSessions < Math.floor(weeks * 2) && weeks >= 1) focus.push(`${strengthSessions} strength session${strengthSessions === 1 ? '' : 's'}. Two a week helps performance and protects against injury.`)
  if (cur.avgSleepMin != null) {
    if (cur.avgSleepMin >= t.sleepHours * 60 - 20) wins.push(`Averaged ${fmtHours(cur.avgSleepMin)} of sleep, right around your ${t.sleepHours} h goal.`)
    else focus.push(`Averaged ${fmtHours(cur.avgSleepMin)} of sleep, ${fmtDuration(t.sleepHours * 60 - cur.avgSleepMin)} short of your goal. An earlier, consistent bedtime is the quickest win for recovery.`)
  }
  if (cur.bedtimeSd != null && cur.bedtimeSd > 60) focus.push('Your bedtime varied by over an hour. A steadier schedule usually improves sleep quality and HRV.')
  if (cur.avgRecovery != null && prev.avgRecovery != null) {
    const d = cur.avgRecovery - prev.avgRecovery
    if (d >= 5) wins.push(`Average recovery improved to ${Math.round(cur.avgRecovery)}% (up ${Math.round(d)} points).`)
    if (d <= -8) focus.push(`Average recovery fell to ${Math.round(cur.avgRecovery)}% (down ${Math.round(-d)} points). Watch training load, sleep and stress.`)
  }
  if (cur.avgRecovery != null && cur.avgRecovery < 45 && cur.avgStrain != null && cur.avgStrain > 12) focus.push('High strain with low recovery suggests you may be overreaching. Plan an easier few days.')
  if (cur.nutritionDays) {
    const proteinDays = cur.days.filter((d) => d.meals.length && d.protein >= t.protein * 0.9).length
    if (proteinDays / cur.nutritionDays >= 0.7) wins.push(`Hit your protein target on ${proteinDays} of ${cur.nutritionDays} logged days.`)
    else focus.push(`Protein target met on ${proteinDays} of ${cur.nutritionDays} logged days. Add a protein source to breakfast and snacks.`)
  }
  if (cur.avgWaterMl != null && cur.avgWaterMl < t.waterMl * 0.75) focus.push(`Water averaged ${fmtWater(cur.avgWaterMl, u)} a day, below your ${fmtWater(t.waterMl, u)} goal.`)
  if (cur.mindfulMin >= 30) wins.push(`${fmtDuration(cur.mindfulMin)} of mindfulness. Good for stress and recovery.`)

  const topSport = sports[0]
  const sentences = []
  if (!cur.workouts && cur.sleepNights === 0 && !cur.nutritionDays) sentences.push(`No activity, sleep or food was logged ${inProgress ? 'yet ' : ''}for ${p.longLabel}. Log a workout or connect a device to build your report.`)
  else {
    sentences.push(
      `${inProgress ? `So far ${kind === 'week' ? 'this week' : kind === 'month' ? 'this month' : 'this year'}` : `In ${p.longLabel}`} you completed ${cur.workouts} workout${cur.workouts === 1 ? '' : 's'} totalling ${fmtDuration(cur.activeMin)}${cur.distanceKm ? ` and ${fmtDist(cur.distanceKm, u)}` : ''}${topSport ? `, mostly ${sportFor(topSport.sport).name.toLowerCase()}` : ''}.`
    )
    if (prev.workouts || prev.activeMin) {
      const c = ch('activeMin')
      sentences.push(c == null ? '' : Math.abs(c) < 0.05 ? `That is about the same training time as ${p.prevLabel}.` : `That is ${Math.round(Math.abs(c) * 100)}% ${c > 0 ? 'more' : 'less'} training time than ${p.prevLabel}.`)
    }
    if (cur.avgSleepMin != null) sentences.push(`You slept ${fmtHours(cur.avgSleepMin)} a night on average${cur.avgRecovery != null ? ` and recovery averaged ${Math.round(cur.avgRecovery)}%` : ''}.`)
    if (overall != null) sentences.push(`Overall score: ${overall}/100 (${grade(overall).toLowerCase()}).`)
  }

  return {
    kind,
    offset,
    period: p,
    inProgress,
    nElapsed,
    cur,
    prev,
    sports,
    bests,
    zones,
    buckets,
    scores,
    overall,
    grade: grade(overall),
    goals: goalRows,
    wins,
    focus,
    strengthSessions,
    streak,
    summary: sentences.filter(Boolean).join(' '),
    weightChange: (() => {
      const ws = cur.days.filter((d) => d.weightKg != null)
      return ws.length >= 2 ? ws[ws.length - 1].weightKg - ws[0].weightKg : null
    })(),
  }
}

export const scoreGrade = grade

/** Compact text version of a report: used as AI context and for the Markdown download. */
export function reportToMarkdown(r, profile) {
  const u = profile.units
  const c = r.cur
  const pv = r.prev
  const line = (label, a, b) => `- ${label}: ${a}${b != null ? ` (previous: ${b})` : ''}`
  const out = [
    `# Thrive ${r.kind === 'week' ? 'weekly' : r.kind === 'month' ? 'monthly' : 'yearly'} report: ${r.period.longLabel}${r.inProgress ? ' (in progress)' : ''}`,
    '',
    r.summary,
    '',
    '## Key numbers',
    line('Workouts', c.workouts, pv.workouts),
    line('Training time', fmtDuration(c.activeMin), fmtDuration(pv.activeMin)),
    line('Distance', fmtDist(c.distanceKm, u), fmtDist(pv.distanceKm, u)),
    line('Active days', `${c.activeDays} of ${r.nElapsed}`, pv.activeDays),
    line('Active calories', fmtNum(c.caloriesOut), fmtNum(pv.caloriesOut)),
    c.avgStrain != null ? line('Average daily strain', fmtNum(c.avgStrain, 1), pv.avgStrain != null ? fmtNum(pv.avgStrain, 1) : null) : null,
    c.avgSleepMin != null ? line('Average sleep', fmtHours(c.avgSleepMin), pv.avgSleepMin != null ? fmtHours(pv.avgSleepMin) : null) : null,
    c.avgSleepScore != null ? line('Average sleep score', fmtNum(c.avgSleepScore), pv.avgSleepScore != null ? fmtNum(pv.avgSleepScore) : null) : null,
    c.avgRecovery != null ? line('Average recovery', `${fmtNum(c.avgRecovery)}%`, pv.avgRecovery != null ? `${fmtNum(pv.avgRecovery)}%` : null) : null,
    c.avgHrv != null ? line('Average HRV', `${fmtNum(c.avgHrv)} ms`, pv.avgHrv != null ? `${fmtNum(pv.avgHrv)} ms` : null) : null,
    c.avgRhr != null ? line('Average resting HR', `${fmtNum(c.avgRhr)} bpm`, pv.avgRhr != null ? `${fmtNum(pv.avgRhr)} bpm` : null) : null,
    c.nutritionDays ? line('Average calories eaten (logged days)', fmtNum(c.avgCalIn), pv.avgCalIn != null ? fmtNum(pv.avgCalIn) : null) : null,
    c.nutritionDays ? line('Average protein', `${fmtNum(c.avgProtein)} g`, pv.avgProtein != null ? `${fmtNum(pv.avgProtein)} g` : null) : null,
    r.weightChange != null ? `- Weight change: ${r.weightChange > 0 ? '+' : '−'}${fmtWeight(Math.abs(r.weightChange), u)}` : null,
    '',
    '## By sport',
    ...(r.sports.length ? r.sports.map((s) => `- ${sportFor(s.sport).name}: ${s.sessions} session${s.sessions === 1 ? '' : 's'}, ${fmtDuration(s.min)}${s.km ? `, ${fmtDist(s.km, u)}` : ''}`) : ['- No workouts logged']),
    '',
    '## Personal bests',
    ...(r.bests.length ? r.bests.map((b) => `- ${b.label}: ${b.value}${b.allTime ? ' (all-time best)' : ''}`) : ['- None this period']),
    r.zones.total > 0 ? `\nHeart-rate zones: ${[1, 2, 3, 4, 5].map((z) => `Z${z} ${fmtDuration(r.zones.minutes[z])}`).join(', ')}` : null,
    '',
    '## Scores',
    ...Object.entries(r.scores).filter(([, v]) => v != null).map(([k, v]) => `- ${k[0].toUpperCase() + k.slice(1)}: ${Math.round(v)}/100`),
    r.overall != null ? `- Overall: ${r.overall}/100` : null,
    '',
    '## What went well',
    ...(r.wins.length ? r.wins.map((w) => `- ${w}`) : ['- Keep logging to unlock insights']),
    '',
    '## Focus next',
    ...(r.focus.length ? r.focus.map((w) => `- ${w}`) : ['- Keep doing what you are doing']),
    r.goals.length ? '\n## Goals' : null,
    ...r.goals.map((g) => `- ${g.title}: ${g.text}`),
  ]
  return out.filter((x) => x != null).join('\n')
}

export const reportKey = (r) => `${r.kind}:${dayKey(r.period.start)}`
export const reportTitle = (r) => `${r.kind === 'week' ? 'Week' : r.kind === 'month' ? 'Month' : 'Year'} of ${r.kind === 'week' ? shortDate(r.period.start) : r.period.longLabel}`
