import { moodFor } from '../lib/moods.js'
import { addDays, dayKey } from '../lib/date.js'

/** Average mood per day for the last `days` days. */
export default function MoodChart({ entries, days = 14 }) {
  const byDay = new Map()
  entries.forEach((e) => {
    if (!e.mood) return
    const k = dayKey(e.createdAt)
    const list = byDay.get(k) || []
    list.push(e.mood)
    byDay.set(k, list)
  })

  const cols = Array.from({ length: days }, (_, i) => {
    const d = addDays(new Date(), i - days + 1)
    const moods = byDay.get(dayKey(d))
    const avg = moods ? moods.reduce((a, b) => a + b, 0) / moods.length : null
    return { d, avg }
  })

  return (
    <div className="mood-chart" role="img" aria-label={`Mood over the last ${days} days`}>
      {cols.map(({ d, avg }) => {
        const mood = avg ? moodFor(Math.round(avg)) : null
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        return (
          <div key={d.toISOString()} className="mood-col" title={mood ? `${label}: ${mood.label}` : `${label}: no mood logged`}>
            {mood ? (
              <span className="mood-bar" style={{ height: `${(avg / 5) * 100}%`, background: mood.color }} />
            ) : (
              <span className="mood-dot" />
            )}
          </div>
        )
      })}
    </div>
  )
}
