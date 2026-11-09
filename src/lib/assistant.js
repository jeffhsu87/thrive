// Thrive Coach, client side: builds the data snapshot sent with each question, streams answers
// from the server endpoint, and falls back to a built-in rule-based coach when AI is unavailable.
import { addDays, dayKey, startOfWeek } from './date.js'
import { summarize } from './stats.js'
import { ZONES, maxHrOf, recoveryStatus, strainLabel, zoneRange } from './metrics.js'
import { sportFor } from './sports.js'
import { fmtDist, fmtDuration, fmtHours, fmtNum, fmtPace, fmtWater, fmtWeight, fmtClock } from './units.js'

// ---------- Context ----------
/** Plain-text snapshot of the athlete's data for the model. Kept compact and factual. */
export function buildContext({ index, profile, goalsProgress = [], stats, live, extra }) {
  const u = profile.units
  const t = profile.targets
  const today = index.get(dayKey())
  const yesterday = index.get(dayKey(addDays(new Date(), -1)))
  const week = summarize(index, startOfWeek(), 7, profile)
  const last7 = summarize(index, addDays(new Date(), -6), 7, profile)
  const last28 = summarize(index, addDays(new Date(), -27), 28, profile)
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null
  const maxHr = maxHrOf(profile)
  const L = []
  L.push(`Today: ${new Date().toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`)
  L.push(`Athlete: ${profile.name || 'unnamed'}; experience ${profile.experience}${age ? `; age ${age}` : ''}${profile.sex ? `; ${profile.sex}` : ''}${profile.weightKg ? `; weight ${fmtWeight(profile.weightKg, u)}` : ''}; units ${u}`)
  if (profile.focus?.length) L.push(`Goals they care about: ${profile.focus.join(', ')}`)
  L.push(`Targets: ${t.workoutsPerWeek} workouts and ${t.activeMinutesPerWeek} active min per week; ${t.steps} steps/day; ${t.sleepHours} h sleep; ${t.calories} cal, ${t.protein} g protein, ${fmtWater(t.waterMl, u)} water per day`)
  L.push(`Heart rate zones (max HR ${maxHr}${profile.maxHr ? ', set by athlete' : ', estimated'}): ${ZONES.map((z) => `Z${z.n} ${z.name} ${zoneRange(z, maxHr).join('-')}`).join('; ')}`)

  const st = recoveryStatus(today.recovery)
  L.push('')
  L.push('Today so far:')
  L.push(`- Recovery: ${today.recovery != null ? `${today.recovery}% (${st.label}${today.recoveryEstimated ? ', estimated' : ''}); suggested strain ${st.strainTarget[0]}-${st.strainTarget[1]}` : 'unknown'}`)
  if (today.hrv) L.push(`- HRV ${today.hrv} ms (30-day normal ${today.hrvBase ? Math.round(today.hrvBase) : '?'})`)
  if (today.rhr) L.push(`- Resting HR ${today.rhr} bpm (normal ${today.rhrBase ? Math.round(today.rhrBase) : '?'})`)
  L.push(`- Sleep last night: ${today.sleepMin != null ? `${fmtHours(today.sleepMin)}, score ${today.sleepScore}${today.sleep?.stages ? `, deep ${today.sleep.stages.deep} min, REM ${today.sleep.stages.rem} min` : ''}` : 'not logged'}`)
  L.push(`- Strain ${today.strain != null ? fmtNum(today.strain, 1) : '0'} (${strainLabel(today.strain || 0) || 'none'}); active ${fmtDuration(today.activeMin)}; steps ${today.steps ?? 'unknown'}`)
  L.push(`- Food: ${today.meals.length ? `${Math.round(today.calIn)} cal, ${Math.round(today.protein)} g protein, ${Math.round(today.carbs)} g carbs, ${Math.round(today.fat)} g fat` : 'nothing logged'}; water ${fmtWater(today.waterMl, u)}`)
  L.push(`- Yesterday: strain ${yesterday.strain != null ? fmtNum(yesterday.strain, 1) : 'none'}, ${yesterday.activities.length} workout(s)`)

  const sumLine = (label, s) =>
    `${label}: ${s.workouts} workouts, ${fmtDuration(s.activeMin)}, ${fmtDist(s.distanceKm, u)}, active ${s.activeDays} days; avg sleep ${s.avgSleepMin != null ? fmtHours(s.avgSleepMin) : '?'}; avg recovery ${s.avgRecovery != null ? Math.round(s.avgRecovery) + '%' : '?'}; avg HRV ${s.avgHrv != null ? Math.round(s.avgHrv) : '?'}; avg strain ${s.avgStrain != null ? fmtNum(s.avgStrain, 1) : '?'}; sleep debt ${fmtHours(s.sleepDebtMin)}`
  L.push('')
  L.push(sumLine('This calendar week', week))
  L.push(sumLine('Last 7 days', last7))
  L.push(sumLine('Last 28 days', last28))

  const recent = index.activities.slice(0, 10)
  if (recent.length) {
    L.push('')
    L.push('Recent workouts (newest first):')
    recent.forEach((a) => {
      const sp = sportFor(a.sport)
      const pace = fmtPace(sp.pace, a.durationMin, a.distanceKm, u)
      L.push(`- ${new Date(a.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${sp.name}, ${fmtDuration(a.durationMin)}${a.distanceKm ? `, ${fmtDist(a.distanceKm, u, 2)}` : ''}${pace ? `, ${pace}` : ''}${a.avgHr ? `, avg HR ${a.avgHr}` : ''}${a.avgPower ? `, ${a.avgPower} W` : ''}${a.elevationM ? `, +${a.elevationM} m` : ''}, strain ${fmtNum(a.strain, 1)}${a.rpe ? `, felt ${a.rpe}/10` : ''}`)
    })
  }
  if (goalsProgress.length) {
    L.push('')
    L.push('Goals:')
    goalsProgress.forEach((g) => L.push(`- ${g.goal.title}: ${g.currentText} of ${g.targetText}${g.periodLabel ? ` ${g.periodLabel}` : ''} (${g.status})`))
  }
  if (stats) L.push(`\nStreaks: active ${stats.activeStreak} days; weekly goal ${stats.weekStreak} weeks; total workouts logged ${stats.workouts}`)
  if (live) {
    L.push('')
    L.push('LIVE WORKOUT IN PROGRESS:')
    L.push(liveLine(live, profile))
  }
  if (extra) {
    L.push('')
    L.push(extra)
  }
  return L.join('\n')
}

export function liveLine(live, profile) {
  const u = profile.units
  const sp = sportFor(live.sport)
  const zone = live.bpm ? ZONES[(live.zone || 1) - 1] : null
  return [
    `- Activity: ${sp.name}; status ${live.phase}; elapsed ${fmtClock(live.elapsedSec)}`,
    live.bpm ? `- Heart rate now ${live.bpm} bpm (zone ${live.zone} ${zone?.name}); session average ${live.avgBpm ?? '?'} bpm` : '- No heart rate monitor connected',
    live.km > 0 ? `- Distance ${fmtDist(live.km, u, 2)}; average pace ${fmtPace(sp.pace || 'pace', live.elapsedSec / 60, live.km, u)}` : '- No GPS distance',
    live.laps?.length ? `- Laps completed: ${live.laps.length}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

// ---------- Server calls ----------
let statusPromise = null
export function getAssistantStatus(force = false) {
  if (!statusPromise || force)
    statusPromise = (async () => {
      try {
        const r = await fetch('/api/assistant/status')
        return r.ok ? await r.json() : { available: false }
      } catch {
        // No coach server (e.g. the app is hosted as static files): use the offline coach.
        return { available: false }
      }
    })()
  return statusPromise
}

export class CoachUnavailable extends Error {}

/**
 * Stream an answer. Calls onText(fullTextSoFar) as chunks arrive.
 * Resolves with { text, refused }. Throws CoachUnavailable when AI is not set up or unreachable.
 */
export async function streamCoach({ mode, messages, context, onText, signal }) {
  let res
  try {
    res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, messages, context }), signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new CoachUnavailable('Could not reach the coach server.')
  }
  if (!res.ok || !res.body) {
    let info = {}
    try {
      info = await res.json()
    } catch {
      /* not JSON */
    }
    if ([401, 404, 503].includes(res.status) || info.error === 'not_configured') throw new CoachUnavailable(info.message || 'The AI coach is not set up.')
    throw new Error(info.message || `The coach had a problem (${res.status}).`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let text = ''
  let refused = false
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const line = chunk.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const ev = JSON.parse(line.slice(6))
      if (ev.t) {
        text += ev.t
        onText?.(text)
      } else if (ev.refusal) refused = true
      else if (ev.error) throw new Error(ev.message || 'The coach had a problem.')
    }
  }
  if (refused) {
    text = 'I can’t help with that one. Try asking about your training, recovery, sleep or nutrition.'
    onText?.(text)
  }
  return { text, refused }
}

// ---------- Offline coach ----------
const has = (q, re) => re.test(q)

/** Rule-based answers from the athlete's own data, used when the AI coach is not available. */
export function offlineAnswer(question, { index, profile, goalsProgress = [], live }) {
  const q = question.toLowerCase()
  const u = profile.units
  const t = profile.targets
  const today = index.get(dayKey())
  const st = recoveryStatus(today.recovery)
  const week = summarize(index, startOfWeek(), 7, profile)
  const lastWeek = summarize(index, addDays(startOfWeek(), -7), 7, profile)
  const maxHr = maxHrOf(profile)
  const sp = live ? sportFor(live.sport) : null
  const mins = live ? live.elapsedSec / 60 : 0

  if (has(q, /chest|faint|dizz|can'?t breathe|heart attack|pass(ed)? out|severe|injur|sharp pain/))
    return 'Please stop now. Chest pain, dizziness, fainting or sharp pain are signs to stop exercising and get medical help right away. If symptoms are severe, call emergency services.'

  if (live && has(q, /pace|speed|how fast|split/)) {
    if (!live.km) return 'I don’t have distance yet. Turn on GPS on this screen to track your pace.'
    const recent = index.activities.filter((a) => a.sport === live.sport && a.distanceKm).slice(0, 5)
    const avgPace = recent.length ? recent.reduce((s, a) => s + a.durationMin / a.distanceKm, 0) / recent.length : null
    const nowPace = mins / live.km
    const p = fmtPace(sp.pace || 'pace', mins, live.km, u)
    if (!avgPace) return `You are averaging ${p}. Hold this rhythm and keep your breathing relaxed.`
    const diff = (nowPace - avgPace) / avgPace
    return `You are averaging ${p}, ${Math.abs(diff) < 0.03 ? 'right on your usual pace' : diff < 0 ? 'faster than your usual pace' : 'a little slower than your usual pace'}. ${diff < -0.05 && st?.level !== 'good' ? 'Your recovery is not high today, so ease back slightly.' : 'Nice and steady.'}`
  }

  if (live && has(q, /zone|heart|hr|bpm/)) {
    if (!live.bpm) return 'No heart rate monitor is connected. Pair one on this screen to get zone guidance.'
    const z = ZONES[live.zone - 1]
    const target = st?.level === 'critical' ? 2 : st?.level === 'warning' ? 3 : null
    return `You are at ${live.bpm} bpm, zone ${live.zone} (${z.name}). ${target && live.zone > target ? `With your recovery today, aim for zone ${target} or below, around ${zoneRange(ZONES[target - 1], maxHr)[1]} bpm. Ease off a touch.` : z.desc}`
  }

  if (has(q, /push|harder|go hard|easier|slow down|intensit|should i (go|keep|stop)|how hard/)) {
    if (!st) return 'I don’t have a recovery reading today. Go by feel: if you can talk in full sentences you are in the easy range, and short phrases means moderate.'
    if (live?.bpm && st.level === 'critical' && live.zone >= 3) return `Recovery is ${today.recovery}%, so keep this easy. Drop to zone 2: you should be able to chat comfortably.`
    if (st.level === 'good') return `Recovery is ${today.recovery}%, a green light. If you feel good, push for a few hard efforts, then finish with an easy cool-down.`
    if (st.level === 'warning') return `Recovery is ${today.recovery}%, so moderate effort is best today. Stay mostly in zones 2 and 3.`
    return `Recovery is ${today.recovery}%. Keep today light: easy movement, stretching, and an early night.`
  }

  if (live && has(q, /how long|how much longer|time left|keep going|duration/)) {
    const usual = index.activities.filter((a) => a.sport === live.sport).slice(0, 8)
    const avg = usual.length ? usual.reduce((s, a) => s + a.durationMin, 0) / usual.length : null
    if (!avg) return `You are ${fmtDuration(mins)} in. Go by feel: finishing a little fresh is better than finishing wrecked.`
    return mins < avg ? `You are ${fmtDuration(mins)} in. Your usual ${sp.name.toLowerCase()} is about ${fmtDuration(avg)}, so roughly ${fmtDuration(avg - mins)} to go.` : `You are ${fmtDuration(mins)} in, past your usual ${fmtDuration(avg)}. Great work. Finish when you are ready and cool down well.`
  }

  if (has(q, /water|drink|hydrat|fuel|gel|eat during|electrolyte/)) {
    if (live) return mins < 60 ? 'Under an hour, a few sips of water when you are thirsty is plenty.' : 'Past an hour, take on water and about 30 to 60 grams of carbs per hour, like a gel or sports drink.'
    return `You have had ${fmtWater(today.waterMl, u)} of your ${fmtWater(t.waterMl, u)} goal today. ${today.waterMl < t.waterMl * 0.6 ? 'Have a glass now and one with each meal.' : 'Nicely done, keep sipping through the day.'}`
  }

  if (has(q, /recover|ready|rest day|tired|sore|fatigue|strain/)) {
    if (!st) return 'I need a little more data for recovery. Log last night’s sleep, or connect a wearable for HRV and resting heart rate.'
    return `Recovery today is ${today.recovery}% (${st.label}). ${st.advice} A good strain target today is ${st.strainTarget[0]}–${st.strainTarget[1]}.`
  }

  if (has(q, /sleep|bed|tired|nap/)) {
    const s = summarize(index, addDays(new Date(), -6), 7, profile)
    if (s.avgSleepMin == null) return 'No sleep tracked this week yet. Log last night to start seeing patterns.'
    return `You averaged ${fmtHours(s.avgSleepMin)} over the last week against a ${t.sleepHours} h goal, with ${fmtHours(s.sleepDebtMin)} of sleep debt. ${s.sleepDebtMin > 120 ? 'Try going to bed 30 minutes earlier for a few nights.' : 'That is solid. Keep your bedtime consistent.'}`
  }

  if (has(q, /protein|eat|food|calor|macro|carb|fat|meal|diet|nutrition/)) {
    if (!today.meals.length) return `Nothing logged today yet. Your targets are about ${t.calories} calories and ${t.protein} g of protein. Spread protein across meals, around 25 to 40 g each.`
    return `So far today: ${Math.round(today.calIn)} of ${t.calories} calories and ${Math.round(today.protein)} of ${t.protein} g protein. ${today.protein < t.protein * 0.6 ? 'Add a protein-rich snack like Greek yogurt or a shake.' : 'You are on track.'}${today.caloriesOut > 400 ? ' You burned a lot in training, so eating a bit more is fine.' : ''}`
  }

  if (has(q, /progress|improv|week|month|compare|better|trend|report|how am i doing/)) {
    const c = week.activeMin - lastWeek.activeMin
    return `This week: ${week.workouts} of ${t.workoutsPerWeek} workouts and ${fmtDuration(week.activeMin)} of training, ${c >= 0 ? `${fmtDuration(c)} more` : `${fmtDuration(-c)} less`} than last week. ${week.avgRecovery != null ? `Recovery is averaging ${Math.round(week.avgRecovery)}%. ` : ''}See the Reports page for the full breakdown.`
  }

  if (has(q, /goal/)) {
    if (!goalsProgress.length) return 'You have no goals yet. Start with one you are confident about, like 3 workouts a week.'
    return goalsProgress.map((g) => `${g.goal.title}: ${g.currentText} of ${g.targetText} (${g.status.replace('-', ' ')})`).join('. ') + '.'
  }

  if (has(q, /warm|stretch|cool ?down|mobility/))
    return 'Warm up for 5 to 10 minutes with easy movement that builds gradually. Cool down the same way, then do gentle stretches, holding each for about 30 seconds.'

  if (has(q, /what should i do|workout today|plan|train today|suggest/)) {
    if (!st) return `You have done ${week.workouts} of ${t.workoutsPerWeek} workouts this week. A 30-minute session at a comfortable effort is a great choice today.`
    return st.level === 'good'
      ? `Recovery is ${today.recovery}%, great for a harder session: intervals, a tempo run, or a heavy strength day.`
      : st.level === 'warning'
        ? `Recovery is ${today.recovery}%. Go for a moderate session: steady cardio in zone 2 or a technique-focused workout.`
        : `Recovery is ${today.recovery}%. Keep it light today: a walk, yoga or mobility work.`
  }

  if (live) return `You are ${fmtDuration(mins)} in${live.km ? `, ${fmtDist(live.km, u, 2)} covered` : ''}${live.bpm ? `, heart rate ${live.bpm}` : ''}. Looking strong, keep it smooth.`
  return `Today: recovery ${today.recovery != null ? today.recovery + '%' : 'unknown'}, ${fmtDuration(today.activeMin)} active, ${week.workouts} of ${t.workoutsPerWeek} workouts this week. Ask me about your pace, heart rate zones, recovery, sleep, nutrition, goals or progress.`
}

export const COACH_SUGGESTIONS = {
  chat: ['What should I do today?', 'Am I recovered enough to train hard?', 'How am I progressing this month?', 'How is my sleep affecting my training?', 'What should I eat after a hard workout?', 'Build me a plan to hit my weekly goal'],
  live: ['How’s my pace?', 'What zone am I in?', 'Should I push harder?', 'How much longer?', 'When should I fuel?'],
}

/** Remove markdown so replies read naturally through text-to-speech. */
export const speakable = (text) => text.replace(/[*_#`>]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/^\s*[-•]\s+/gm, '').trim()
