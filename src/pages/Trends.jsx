import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { ChartCard, LineChart, Sparkline } from '../components/Charts.jsx'
import { Segmented } from '../components/Fields.jsx'
import { Delta } from '../components/Bits.jsx'
import { useHealth } from '../store/Health.jsx'
import { addDays, rangeKeys, weekdayShort } from '../lib/date.js'
import { summarize } from '../lib/stats.js'
import { PERIOD_KINDS, periodRange } from '../lib/periods.js'
import { fmtDist, fmtDuration, fmtHours, fmtNum, fmtWater, fmtWeight, kmTo, kgTo, distUnit, weightUnit } from '../lib/units.js'

// Each metric: how to read it from a summary, how to show it, and whether "up" is good.
const METRICS = [
  { group: 'Activity', id: 'workouts', label: 'Workouts', get: (s) => s.workouts, fmt: (v) => fmtNum(v), up: true },
  { group: 'Activity', id: 'activeMin', label: 'Active time', get: (s) => s.activeMin, fmt: (v) => fmtDuration(v), up: true },
  { group: 'Activity', id: 'distance', label: 'Distance', get: (s) => s.distanceKm, fmt: (v, u) => fmtDist(v, u), chart: (v, u) => kmTo(v, u), unit: (u) => distUnit(u), up: true },
  { group: 'Activity', id: 'calOut', label: 'Active calories', get: (s) => s.caloriesOut, fmt: (v) => `${fmtNum(v)} cal`, up: true },
  { group: 'Activity', id: 'steps', label: 'Avg daily steps', get: (s) => s.avgSteps, fmt: (v) => fmtNum(v), up: true, avg: true },
  { group: 'Sleep', id: 'sleep', label: 'Avg sleep', get: (s) => s.avgSleepMin, fmt: (v) => fmtHours(v), chart: (v) => v / 60, unit: () => 'h', up: true, avg: true },
  { group: 'Sleep', id: 'sleepScore', label: 'Avg sleep score', get: (s) => s.avgSleepScore, fmt: (v) => fmtNum(v), up: true, avg: true },
  { group: 'Recovery', id: 'recovery', label: 'Avg recovery', get: (s) => s.avgRecovery, fmt: (v) => `${fmtNum(v)}%`, up: true, avg: true },
  { group: 'Recovery', id: 'strain', label: 'Avg daily strain', get: (s) => s.avgStrain, fmt: (v) => fmtNum(v, 1), up: null, avg: true },
  { group: 'Recovery', id: 'hrv', label: 'Avg HRV', get: (s) => s.avgHrv, fmt: (v) => `${fmtNum(v)} ms`, up: true, avg: true },
  { group: 'Recovery', id: 'rhr', label: 'Avg resting HR', get: (s) => s.avgRhr, fmt: (v) => `${fmtNum(v)} bpm`, up: false, avg: true },
  { group: 'Nutrition', id: 'calIn', label: 'Avg calories eaten', get: (s) => s.avgCalIn, fmt: (v) => `${fmtNum(v)} cal`, up: null, avg: true },
  { group: 'Nutrition', id: 'protein', label: 'Avg protein', get: (s) => s.avgProtein, fmt: (v) => `${fmtNum(v)} g`, up: true, avg: true },
  { group: 'Nutrition', id: 'water', label: 'Avg water', get: (s) => s.avgWaterMl, fmt: (v, u) => fmtWater(v, u), up: true, avg: true },
  { group: 'Body & mind', id: 'weight', label: 'Avg weight', get: (s) => s.avgWeight, fmt: (v, u) => fmtWeight(v, u), chart: (v, u) => kgTo(v, u), unit: (u) => weightUnit(u), up: null, avg: true },
  { group: 'Body & mind', id: 'mood', label: 'Avg mood', get: (s) => s.avgMood, fmt: (v) => `${fmtNum(v, 1)} / 5`, up: true, avg: true },
  { group: 'Body & mind', id: 'journal', label: 'Journal entries', get: (s) => s.journalCount, fmt: (v) => fmtNum(v), up: true },
  { group: 'Body & mind', id: 'habits', label: 'Habits completed', get: (s) => s.habitsDone, fmt: (v) => fmtNum(v), up: true },
  { group: 'Body & mind', id: 'mindful', label: 'Mindful minutes', get: (s) => s.mindfulMin, fmt: (v) => fmtDuration(v), up: true },
]

const PERIODS = PERIOD_KINDS
const periods = periodRange

export default function Trends() {
  const { index, profile } = useHealth()
  const u = profile.units
  const [kind, setKind] = useState('week')
  const [offset, setOffset] = useState(0)
  const [chartMetric, setChartMetric] = useState('activeMin')
  const p = periods(kind, offset)

  const { cur, prev, hist } = useMemo(() => {
    // Only count days up to today so "this week" is compared fairly with the full previous week.
    const today = new Date()
    const curN = Math.min(p.n, Math.max(1, Math.round((today - p.start) / 864e5) + 1))
    return {
      cur: summarize(index, p.start, offset === 0 ? curN : p.n, profile),
      prev: summarize(index, p.prevStart, p.prevN, profile),
      hist: p.buckets.map((b) => ({ ...b, s: summarize(index, b.start, b.n, profile) })),
    }
  }, [index, profile, p.start.getTime(), p.n, p.prevStart.getTime(), p.prevN, kind, offset]) // eslint-disable-line react-hooks/exhaustive-deps

  const highlights = useMemo(() => {
    const out = []
    METRICS.forEach((m) => {
      const a = m.get(cur)
      const b = m.get(prev)
      if (a == null || b == null || !b || m.up == null) return
      const change = (a - b) / Math.abs(b)
      if ((m.up && change > 0.1) || (!m.up && change < -0.03)) out.push({ m, a, b, change })
    })
    return out.sort((x, y) => Math.abs(y.change) - Math.abs(x.change)).slice(0, 3)
  }, [cur, prev])

  const metric = METRICS.find((m) => m.id === chartMetric)
  const toChart = (v) => (v == null ? null : Math.round((metric.chart ? metric.chart(v, u) : v) * 10) / 10)
  const isWeekDaily = kind === 'week'
  const chartData = isWeekDaily
    ? rangeKeys(p.start, 7).map((k, i) => {
        const one = (start) => summarize(index, start, 1, profile)
        const c = new Date(`${k}T12:00`) <= new Date() ? metric.get(one(addDays(p.start, i))) : null
        const pr = metric.get(one(addDays(p.prevStart, i)))
        return { key: k, label: weekdayShort(addDays(p.start, i)), tip: weekdayShort(addDays(p.start, i)), cur: toChart(c), prev: toChart(pr) }
      })
    : hist.map((h) => ({ key: h.label + h.start.getTime(), label: h.label, tip: h.label, cur: toChart(metric.get(h.s)) }))
  const unitSuffix = metric.unit ? ` ${metric.unit(u)}` : ''
  const chartFmt = (v) => (metric.id === 'activeMin' ? fmtDuration(v) : `${fmtNum(v, 1)}${unitSuffix}`)
  const groups = [...new Set(METRICS.map((m) => m.group))]
  const anyData = index.days.size > 0

  return (
    <section className="page">
      <PageHeader eyebrow="Overview" title="Progress">
        See how this {PERIODS[kind].toLowerCase()} compares with the last, and how you are trending over time.
      </PageHeader>

      <div className="filter-row">
        <Segmented value={kind} onChange={(k) => { setKind(k); setOffset(0) }} options={Object.entries(PERIODS).map(([value, label]) => ({ value, label }))} />
        <div className="day-nav">
          <button className="icon-btn" onClick={() => setOffset((o) => o + 1)} aria-label="Previous period">‹</button>
          <strong>{p.label}</strong>
          <button className="icon-btn" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Next period">›</button>
        </div>
      </div>

      {anyData && highlights.length > 0 && (
        <section className="card pad highlight-card">
          <h3>🌟 Highlights vs {p.prevLabel}</h3>
          <ul>
            {highlights.map(({ m, a, b }) => (
              <li key={m.id}>
                <strong>{m.label}</strong> {m.up ? 'up' : 'down'} to {m.fmt(a, u)} from {m.fmt(b, u)}.
              </li>
            ))}
          </ul>
        </section>
      )}

      <ChartCard
        title={metric.label}
        subtitle={isWeekDaily ? 'Day by day, this week vs last week' : `Monthly${kind === 'month' ? ' over the last 12 months' : ` in ${p.label}`}`}
        actions={
          <select className="select" value={chartMetric} onChange={(e) => setChartMetric(e.target.value)} aria-label="Metric to chart">
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {METRICS.filter((m) => m.group === g).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </optgroup>
            ))}
          </select>
        }
        table={{ columns: isWeekDaily ? ['Day', p.label, 'Previous'] : ['Period', metric.label], rows: chartData.map((d) => (isWeekDaily ? [d.label, d.cur == null ? '—' : chartFmt(d.cur), d.prev == null ? '—' : chartFmt(d.prev)] : [d.label, d.cur == null ? '—' : chartFmt(d.cur)])) }}
      >
        <LineChart
          data={chartData}
          series={isWeekDaily ? [{ key: 'cur', label: p.label, color: 'var(--series-1)' }, { key: 'prev', label: 'Previous week', color: 'var(--series-2)' }] : [{ key: 'cur', label: '', color: 'var(--series-1)', area: true }]}
          format={chartFmt}
          zeroBase={!metric.avg || metric.id === 'sleep'}
          tickFormat={metric.id === 'activeMin' ? (v) => `${Math.round(v)}m` : undefined}
          label={`${metric.label} trend`}
        />
      </ChartCard>

      {groups.map((g) => (
        <section key={g}>
          <h2 className="section-title">{g}</h2>
          <div className="compare-grid">
            {METRICS.filter((m) => m.group === g).map((m) => {
              const a = m.get(cur)
              const b = m.get(prev)
              return (
                <button key={m.id} className={'card compare' + (chartMetric === m.id ? ' selected' : '')} onClick={() => setChartMetric(m.id)} aria-pressed={chartMetric === m.id}>
                  <span className="stat-label">{m.label}</span>
                  <span className="compare-value">{a == null ? '—' : m.fmt(a, u)}</span>
                  <span className="compare-foot">
                    {m.up == null ? <span className="delta muted">{b == null ? '' : `${m.fmt(b, u)} before`}</span> : <Delta cur={a} prev={b} goodWhenUp={m.up} format={(v) => m.fmt(v, u)} />}
                    <Sparkline values={hist.map((h) => m.get(h.s))} />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </section>
  )
}
