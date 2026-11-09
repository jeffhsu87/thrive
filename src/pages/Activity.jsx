import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader, { Empty, Stat } from '../components/PageHeader.jsx'
import { ActivityRow } from '../components/Bits.jsx'
import { BarChart, ChartCard } from '../components/Charts.jsx'
import { useQuickLog } from '../components/QuickLog.jsx'
import { useHealth } from '../store/Health.jsx'
import { CATEGORIES, POPULAR, sportFor } from '../lib/sports.js'
import { addDays, dayHeading, dayKey, shortDate, startOfWeek } from '../lib/date.js'
import { summarize } from '../lib/stats.js'
import { fmtDist, fmtDuration, fmtNum } from '../lib/units.js'
import { Segmented } from '../components/Fields.jsx'

export default function Activity() {
  const { index, profile } = useHealth()
  const { open } = useQuickLog()
  const [cat, setCat] = useState('all')
  const [metric, setMetric] = useState('time')
  const [limit, setLimit] = useState(30)
  const u = profile.units

  const filtered = useMemo(() => index.activities.filter((a) => cat === 'all' || sportFor(a.sport).cat === cat), [index.activities, cat])
  const usedCats = useMemo(() => new Set(index.activities.map((a) => sportFor(a.sport).cat)), [index.activities])
  const week = summarize(index, startOfWeek(), 7, profile)
  const lastWeek = summarize(index, addDays(startOfWeek(), -7), 7, profile)

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(startOfWeek(), -7 * (11 - i))
    const acts = filtered.filter((a) => {
      const t = new Date(a.start)
      return t >= start && t < addDays(start, 7)
    })
    const v = metric === 'time' ? acts.reduce((s, a) => s + a.durationMin, 0) : metric === 'distance' ? acts.reduce((s, a) => s + (a.distanceKm || 0), 0) : acts.length
    return { key: dayKey(start), label: shortDate(start), value: metric === 'distance' ? Math.round(v * 10) / 10 : v, tip: `Week of ${shortDate(start)}` }
  })
  const fmt = (v) => (metric === 'time' ? fmtDuration(v) : metric === 'distance' ? fmtDist(v, u) : `${v} workouts`)

  const bySport = useMemo(() => {
    const since = addDays(new Date(), -90)
    const m = new Map()
    filtered.filter((a) => new Date(a.start) >= since).forEach((a) => {
      const cur = m.get(a.sport) || { sport: a.sport, n: 0, min: 0, km: 0 }
      cur.n++
      cur.min += a.durationMin
      cur.km += a.distanceKm || 0
      m.set(a.sport, cur)
    })
    return [...m.values()].sort((a, b) => b.min - a.min)
  }, [filtered])
  const maxMin = Math.max(1, ...bySport.map((s) => s.min))

  const groups = useMemo(() => {
    const map = new Map()
    filtered.slice(0, limit).forEach((a) => {
      const k = dayKey(a.start)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(a)
    })
    return [...map.entries()]
  }, [filtered, limit])

  return (
    <section className="page">
      <PageHeader
        eyebrow="Track"
        title="Activity"
        actions={
          <>
            <Link to="/activity/live" className="btn ghost">⏱️ Start live</Link>
            <button className="btn primary" onClick={() => open('workout')}>+ Log workout</button>
          </>
        }
      >
        Every sport counts, from runs and rides to pickleball and yard work.
      </PageHeader>

      <div className="stats four">
        <Stat label="Workouts this week" value={week.workouts} unit={`/ ${profile.targets.workoutsPerWeek}`} sub={`${lastWeek.workouts} last week`} />
        <Stat label="Active time" value={fmtDuration(week.activeMin)} sub={`${fmtDuration(lastWeek.activeMin)} last week`} />
        <Stat label="Distance" value={fmtDist(week.distanceKm, u)} sub={`${fmtDist(lastWeek.distanceKm, u)} last week`} />
        <Stat label="Active calories" value={fmtNum(week.caloriesOut)} unit="cal" sub={`${fmtNum(lastWeek.caloriesOut)} last week`} />
      </div>

      {index.activities.length === 0 ? (
        <Empty title="No workouts yet" action={<div className="row center gap wrap">{POPULAR.slice(0, 4).map((id) => <button key={id} className="btn ghost" onClick={() => open('workout', { sport: id })}>{sportFor(id).emoji} {sportFor(id).name}</button>)}</div>}>
          Log any activity by hand, record one live, or connect a device to bring in your history.
        </Empty>
      ) : (
        <>
          <div className="filter-chips scroll-x" role="group" aria-label="Filter by type">
            <button className={'chip text' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>All</button>
            {CATEGORIES.filter((c) => usedCats.has(c.id)).map((c) => (
              <button key={c.id} className={'chip text' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>

          <div className="two-col wide-left">
            <ChartCard
              title="Last 12 weeks"
              actions={<Segmented small value={metric} onChange={setMetric} options={[{ value: 'time', label: 'Time' }, { value: 'distance', label: 'Distance' }, { value: 'count', label: 'Count' }]} />}
              table={{ columns: ['Week of', metric === 'time' ? 'Time' : metric === 'distance' ? 'Distance' : 'Workouts'], rows: weeks.map((w) => [w.label, fmt(w.value)]) }}
            >
              <BarChart data={weeks} format={fmt} tickFormat={metric === 'time' ? (v) => `${Math.round(v / 60)}h` : undefined} goal={metric === 'time' && cat === 'all' ? profile.targets.activeMinutesPerWeek : metric === 'count' && cat === 'all' ? profile.targets.workoutsPerWeek : undefined} label="Weekly activity" />
            </ChartCard>
            <section className="card pad">
              <h3>Top activities · 90 days</h3>
              <ul className="bar-list">
                {bySport.slice(0, 7).map((s) => (
                  <li key={s.sport}>
                    <span className="row between">
                      <span>{sportFor(s.sport).emoji} {sportFor(s.sport).name}</span>
                      <small className="muted">{s.n}× · {fmtDuration(s.min)}</small>
                    </span>
                    <span className="hbar"><span style={{ width: `${(s.min / maxMin) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="timeline">
            {groups.map(([k, list]) => (
              <div key={k}>
                <h2 className="day-heading">{dayHeading(k)}</h2>
                <div className="card list-card">{list.map((a) => <ActivityRow key={a.id} a={a} />)}</div>
              </div>
            ))}
            {filtered.length > limit && (
              <button className="btn ghost" onClick={() => setLimit((l) => l + 30)}>Show more</button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
