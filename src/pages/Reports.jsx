import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader, { Empty } from '../components/PageHeader.jsx'
import { BarChart, ChartCard, LineChart, Meter, Ring, SegmentedBar } from '../components/Charts.jsx'
import { Segmented } from '../components/Fields.jsx'
import { Delta } from '../components/Bits.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { Markdown, useAssistantStatus } from '../components/Assistant.jsx'
import { DownloadIcon, PrintIcon, SparkleIcon } from '../components/Icons.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { buildReport, reportKey, reportToMarkdown } from '../lib/reports.js'
import { PERIOD_KINDS } from '../lib/periods.js'
import { buildContext, CoachUnavailable, streamCoach } from '../lib/assistant.js'
import { addDays, dayKey, parseDayKey, startOfWeek } from '../lib/date.js'
import { ZONES } from '../lib/metrics.js'
import { sportFor } from '../lib/sports.js'
import { fmtDist, fmtDuration, fmtHours, fmtNum, fmtWater, fmtWeight } from '../lib/units.js'
import { ZONE_COLORS } from './ActivityDetail.jsx'

const AREA_LABELS = { consistency: 'Consistency', training: 'Training volume', sleep: 'Sleep', recovery: 'Recovery', nutrition: 'Nutrition' }
const AREA_HELP = {
  consistency: 'Active days compared with your weekly workout target.',
  training: 'Training time compared with your weekly active-minutes target.',
  sleep: 'Average sleep score.',
  recovery: 'Average recovery.',
  nutrition: 'How often you logged food and hit your protein target.',
}

const level = (min) => (!min ? 0 : min < 20 ? 1 : min < 45 ? 2 : min < 75 ? 3 : 4)

/** Activity calendar: one cell per day, shaded by training time. */
function ConsistencyCalendar({ report, index }) {
  const p = report.period
  const today = dayKey()
  const gridStart = startOfWeek(p.start)
  const end = addDays(p.start, p.n - 1)
  const cells = []
  for (let d = new Date(gridStart); d <= end; d = addDays(d, 1)) {
    const k = dayKey(d)
    const inPeriod = d >= p.start
    const day = index.get(k)
    cells.push({ k, inPeriod, future: k > today, min: day.activeMin, n: day.activities.length, label: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) })
  }
  const weeks = Math.ceil(cells.length / 7)
  const isYear = report.kind === 'year'
  return (
    <div className={'calendar' + (isYear ? ' year' : '')} style={{ '--weeks': weeks }}>
      {!isYear && (
        <div className="cal-head" aria-hidden>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      )}
      <div className="cal-grid" role="list">
        {cells.map((c) => (
          <span
            key={c.k}
            role="listitem"
            className={`cal-cell l${level(c.min)}` + (!c.inPeriod ? ' outside' : '') + (c.future ? ' future' : '') + (c.k === today ? ' today' : '')}
            title={c.inPeriod ? `${c.label}: ${c.n ? `${c.n} workout${c.n > 1 ? 's' : ''}, ${fmtDuration(c.min)}` : 'rest'}` : ''}
            aria-label={c.inPeriod ? `${c.label}: ${c.n ? `${c.n} workouts, ${fmtDuration(c.min)}` : 'no workout'}` : undefined}
          >
            {!isYear && c.inPeriod ? parseDayKey(c.k).getDate() : ''}
          </span>
        ))}
      </div>
      <div className="cal-legend" aria-hidden>
        <span>Rest</span>
        {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`cal-cell l${l}`} />)}
        <span>75+ min</span>
      </div>
    </div>
  )
}

function CoachReview({ report, markdown }) {
  const health = useHealth()
  const status = useAssistantStatus()
  const [reviews, setReviews] = useLocalStorage('report-reviews', {})
  const key = reportKey(report)
  const saved = reviews[key]
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ctrl = useRef(null)
  const shown = busy ? text : saved?.text || ''

  async function run() {
    setBusy(true)
    setError('')
    setText('')
    ctrl.current = new AbortController()
    try {
      const context = buildContext({ index: health.index, profile: health.profile, goalsProgress: health.goalsProgress, stats: health.stats, extra: `PERFORMANCE REPORT TO REVIEW:\n${markdown}` })
      const { text: out } = await streamCoach({
        mode: 'report',
        signal: ctrl.current.signal,
        messages: [{ role: 'user', content: `Please review my ${report.kind}ly performance report for ${report.period.longLabel}${report.inProgress ? ' (the period is still in progress)' : ''}.` }],
        context,
        onText: setText,
      })
      setReviews((r) => ({ ...r, [key]: { text: out, at: new Date().toISOString(), complete: !report.inProgress } }))
    } catch (e) {
      if (e.name !== 'AbortError') setError(e instanceof CoachUnavailable ? 'The AI coach is not set up yet. See the Coach page to turn it on. The written summary and insights above are generated from your data either way.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card pad coach-review">
      <header className="row between wrap gap">
        <h3><SparkleIcon width={16} height={16} /> Coach’s review</h3>
        <span className="row gap-sm no-print">
          {busy ? (
            <button className="btn ghost small" onClick={() => ctrl.current?.abort()}>Stop</button>
          ) : (
            <button className="btn primary small" onClick={run} disabled={status && !status.available && !saved}>
              {saved ? 'Refresh review' : 'Get coach review'}
            </button>
          )}
        </span>
      </header>
      {shown ? (
        <>
          <Markdown text={shown} />
          {saved?.at && !busy && <p className="muted small">Written {new Date(saved.at).toLocaleString()}{!saved.complete ? ' while the period was in progress' : ''}.</p>}
        </>
      ) : busy ? (
        <span className="typing" aria-label="Coach is writing"><i /><i /><i /></span>
      ) : status && !status.available ? (
        <p className="muted small">Turn on the AI coach (see the <Link to="/coach">Coach page</Link>) for a written review of this report with personalised focuses for next {report.kind}.</p>
      ) : (
        <p className="muted small">Get a written review of this {report.kind} with what went well, what to watch and focuses for next {report.kind}.</p>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  )
}

export default function Reports() {
  const { index, profile, goals } = useHealth()
  const { notify } = useFeedback()
  const [params, setParams] = useSearchParams()
  const kind = PERIOD_KINDS[params.get('kind')] ? params.get('kind') : 'week'
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const setPeriod = (k, o) => setParams({ kind: k, offset: String(o) }, { replace: true })
  const u = profile.units
  const t = profile.targets
  const r = useMemo(() => buildReport({ index, profile, goals, kind, offset }), [index, profile, goals, kind, offset])
  const markdown = useMemo(() => reportToMarkdown(r, profile), [r, profile])
  const [reviews] = useLocalStorage('report-reviews', {})
  const c = r.cur
  const pv = r.prev
  const hasData = c.workouts || c.sleepNights || c.nutritionDays || c.journalCount

  function download() {
    const review = reviews[reportKey(r)]?.text
    const blob = new Blob([markdown + (review ? `\n\n## Coach’s review\n\n${review}\n` : '') + `\n\n_Generated by Thrive on ${new Date().toLocaleString()}_\n`], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `thrive-${r.kind}-report-${dayKey(r.period.start)}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      notify('Report copied to clipboard')
    } catch {
      notify('Copy is not available in this browser')
    }
  }

  const keyStats = [
    { label: 'Workouts', a: c.workouts, b: pv.workouts, f: (v) => fmtNum(v) },
    { label: 'Training time', a: c.activeMin, b: pv.activeMin, f: fmtDuration },
    { label: 'Distance', a: c.distanceKm, b: pv.distanceKm, f: (v) => fmtDist(v, u) },
    { label: 'Active days', a: c.activeDays, b: pv.activeDays, f: (v) => `${fmtNum(v)}`, sub: `of ${r.nElapsed}` },
    { label: 'Active calories', a: c.caloriesOut, b: pv.caloriesOut, f: (v) => `${fmtNum(v)} cal` },
    { label: 'Avg daily strain', a: c.avgStrain, b: pv.avgStrain, f: (v) => fmtNum(v, 1), up: null, info: 'strain' },
    { label: 'Avg sleep', a: c.avgSleepMin, b: pv.avgSleepMin, f: fmtHours, info: 'sleepScore' },
    { label: 'Avg recovery', a: c.avgRecovery, b: pv.avgRecovery, f: (v) => `${fmtNum(v)}%`, info: 'recovery' },
    { label: 'Avg HRV', a: c.avgHrv, b: pv.avgHrv, f: (v) => `${fmtNum(v)} ms`, info: 'hrv' },
    { label: 'Avg resting HR', a: c.avgRhr, b: pv.avgRhr, f: (v) => `${fmtNum(v)} bpm`, up: false, info: 'rhr' },
  ].filter((s) => s.a != null || s.b != null)

  const dailyGoal = r.kind === 'year' ? Math.round(t.activeMinutesPerWeek * 4.35) : Math.round(t.activeMinutesPerWeek / 7)
  const maxSportMin = Math.max(1, ...r.sports.map((s) => s.min))

  return (
    <section className="page report-page">
      <PageHeader
        eyebrow="Overview"
        title="Performance reports"
        actions={
          <span className="row gap-sm no-print">
            <button className="btn ghost" onClick={() => window.print()}><PrintIcon width={16} height={16} /> Print / PDF</button>
            <button className="btn ghost" onClick={download}><DownloadIcon width={16} height={16} /> Download</button>
            <button className="btn ghost hide-sm" onClick={copy}>Copy</button>
          </span>
        }
      >
        Weekly, monthly and yearly reviews of your training, recovery, sleep and nutrition.
      </PageHeader>

      <div className="filter-row no-print">
        <Segmented value={kind} onChange={(k) => setPeriod(k, 0)} options={Object.entries(PERIOD_KINDS).map(([value, label]) => ({ value, label }))} />
        <div className="day-nav">
          <button className="icon-btn" onClick={() => setPeriod(kind, offset + 1)} aria-label="Previous period">‹</button>
          <strong>{r.period.label}</strong>
          <button className="icon-btn" onClick={() => setPeriod(kind, Math.max(0, offset - 1))} disabled={offset === 0} aria-label="Next period">›</button>
        </div>
      </div>

      <p className="print-only report-print-title">Thrive {r.kind}ly report · {r.period.longLabel}</p>

      {!hasData ? (
        <Empty title={`Nothing logged for ${r.period.longLabel}`} action={<Link className="btn primary" to="/activity">Log a workout</Link>}>
          Reports fill in automatically from your workouts, sleep, food and journal. Try an earlier period, or connect a device to bring in your history.
        </Empty>
      ) : (
        <>
          <section className="card pad report-hero">
            <div className="hero-ring">
              <Ring value={r.overall ?? 0} size={136} stroke={12} color="var(--accent)" label={`Overall score ${r.overall ?? 'not available'}`}>
                <strong className="ring-value">{r.overall ?? '—'}</strong>
                <small>{r.grade || 'score'}</small>
              </Ring>
            </div>
            <div className="grow stack-sm">
              <p className="eyebrow">{r.period.longLabel}{r.inProgress ? ` · in progress (${r.nElapsed} of ${r.period.n} days)` : ''}</p>
              <p className="report-summary">{r.summary}</p>
              <div className="area-scores">
                {Object.entries(r.scores).map(([k, v]) => (
                  <div key={k} className="area" title={AREA_HELP[k]}>
                    <span className="row between small">
                      <span>{AREA_LABELS[k]}</span>
                      <strong>{v == null ? 'No data' : Math.round(v)}</strong>
                    </span>
                    <Meter value={v ?? 0} max={100} height={6} label={`${AREA_LABELS[k]} score`} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="section-title">Key numbers <span className="muted small">vs {r.period.prevLabel}{r.inProgress ? ' (same number of days)' : ''}</span></h2>
            <div className="compare-grid">
              {keyStats.map((s) => (
                <div key={s.label} className="card compare static">
                  <span className="stat-label">{s.label} {s.info && <InfoTip term={s.info} />}</span>
                  <span className="compare-value">{s.a == null ? '—' : s.f(s.a)}{s.sub && <small className="muted"> {s.sub}</small>}</span>
                  <span className="compare-foot">
                    {s.up === null ? <span className="delta muted">{s.b == null ? '' : `${s.f(s.b)} before`}</span> : <Delta cur={s.a} prev={s.b} goodWhenUp={s.up !== false} format={s.f} />}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="two-col">
            <ChartCard
              title={r.kind === 'year' ? 'Training time by month' : 'Training time by day'}
              info="activeMinutes"
              table={{ columns: [r.kind === 'year' ? 'Month' : 'Day', 'Training', 'Workouts'], rows: r.buckets.filter((b) => !b.future).map((b) => [b.tip, fmtDuration(b.activeMin || 0), b.workouts]) }}
            >
              <BarChart data={r.buckets.map((b) => ({ key: b.key, label: b.label, tip: b.tip, value: b.activeMin }))} goal={dailyGoal} goalLabel={r.kind === 'year' ? 'Monthly target' : 'Daily pace'} format={fmtDuration} tickFormat={(v) => (v >= 120 ? `${Math.round(v / 60)}h` : `${Math.round(v)}m`)} label="Training time" />
            </ChartCard>
            <ChartCard title="Consistency" subtitle={`${c.activeDays} active days${r.streak > 1 ? ` · best streak ${r.streak} days` : ''}`} table={{ columns: ['Day', 'Training'], rows: c.days.filter((d) => d.activities.length).map((d) => [parseDayKey(d.key).toLocaleDateString(), fmtDuration(d.activeMin)]) }}>
              <ConsistencyCalendar report={r} index={index} />
            </ChartCard>
          </div>

          <div className="two-col">
            <section className="card pad">
              <h3>By sport</h3>
              {r.sports.length ? (
                <ul className="bar-list">
                  {r.sports.map((s) => (
                    <li key={s.sport}>
                      <span className="row between gap">
                        <span>{sportFor(s.sport).emoji} {sportFor(s.sport).name}</span>
                        <small className="muted">
                          {s.sessions}× · {fmtDuration(s.min)}{s.km ? ` · ${fmtDist(s.km, u)}` : ''}
                        </small>
                      </span>
                      <span className="hbar"><span style={{ width: `${(s.min / maxSportMin) * 100}%` }} /></span>
                      <Delta cur={s.min} prev={s.prevMin || null} format={fmtDuration} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No workouts this period.</p>
              )}
            </section>
            <section className="card pad">
              <h3>Personal bests</h3>
              {r.bests.length ? (
                <ul className="kv">
                  {r.bests.map((b) => (
                    <li key={b.label}>
                      <span>
                        <Link to={`/activity/${b.activity.id}`}>{b.label}</Link>
                        {b.allTime && <span className="pb-tag">All-time best</span>}
                      </span>
                      <strong>{b.value}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Bests appear here as you log workouts.</p>
              )}
            </section>
          </div>

          {r.zones.total > 0 && (
            <section className="card pad">
              <h3>Training intensity <InfoTip term="zones" /></h3>
              <p className="muted small">
                {fmtDuration(r.zones.total)} with heart rate · {Math.round(r.zones.easyShare * 100)}% easy (zones 1–2), {Math.round(r.zones.hardShare * 100)}% hard (zones 4–5). Most athletes do best with about 80% easy.
              </p>
              <SegmentedBar parts={ZONES.map((z) => ({ label: `Z${z.n} ${z.name}`, value: Math.round(r.zones.minutes[z.n]), color: ZONE_COLORS[z.n] }))} format={fmtDuration} />
            </section>
          )}

          <div className="two-col">
            <section className="card pad insight-card good">
              <h3>🌟 What went well</h3>
              {r.wins.length ? <ul>{r.wins.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="muted small">Keep logging. Wins will show up here.</p>}
            </section>
            <section className="card pad insight-card focus">
              <h3>🎯 Focus next {r.kind}</h3>
              {r.focus.length ? <ul>{r.focus.slice(0, 5).map((w) => <li key={w}>{w}</li>)}</ul> : <p className="muted small">Nothing stands out. Keep doing what you are doing.</p>}
            </section>
          </div>

          {(c.sleepNights > 0 || c.avgRecovery != null) && (
            <div className="two-col">
              {c.sleepNights > 0 && (
                <ChartCard title="Sleep" info="sleepScore" subtitle={`Avg ${fmtHours(c.avgSleepMin)} · debt ${fmtHours(c.sleepDebtMin)}`} table={{ columns: ['Period', 'Sleep'], rows: r.buckets.filter((b) => b.sleep != null).map((b) => [b.tip, fmtHours(b.sleep)]) }}>
                  <BarChart data={r.buckets.map((b) => ({ key: b.key, label: b.label, tip: b.tip, value: b.sleep }))} goal={t.sleepHours * 60} goalLabel="Goal" format={fmtHours} tickFormat={(v) => `${Math.round(v / 60)}h`} label="Sleep" color="var(--series-1)" />
                </ChartCard>
              )}
              {c.avgRecovery != null && (
                <ChartCard title="Recovery" info="recovery" subtitle={`Avg ${fmtNum(c.avgRecovery)}%`} table={{ columns: ['Period', 'Recovery'], rows: r.buckets.filter((b) => b.recovery != null).map((b) => [b.tip, `${fmtNum(b.recovery)}%`]) }}>
                  <LineChart data={r.buckets.map((b) => ({ key: b.key, label: b.label, tip: b.tip, rec: b.recovery != null ? Math.round(b.recovery) : null }))} series={[{ key: 'rec', label: '', color: 'var(--series-3)' }]} yDomain={[0, 100]} format={(v) => `${v}%`} label="Recovery" />
                </ChartCard>
              )}
            </div>
          )}

          <div className="stats four">
            <div className="stat">
              <span className="stat-label">Avg calories eaten</span>
              <span className="stat-value">{c.avgCalIn != null ? fmtNum(c.avgCalIn) : '—'}<small> cal</small></span>
              <span className="stat-sub">{c.nutritionDays} days logged · target {fmtNum(t.calories)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Avg protein</span>
              <span className="stat-value">{c.avgProtein != null ? fmtNum(c.avgProtein) : '—'}<small> g</small></span>
              <span className="stat-sub">Target {t.protein} g</span>
            </div>
            <div className="stat">
              <span className="stat-label">Avg water</span>
              <span className="stat-value">{c.avgWaterMl != null ? fmtWater(c.avgWaterMl, u) : '—'}</span>
              <span className="stat-sub">Target {fmtWater(t.waterMl, u)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Weight change</span>
              <span className="stat-value">{r.weightChange != null ? `${r.weightChange > 0 ? '+' : r.weightChange < 0 ? '−' : ''}${fmtWeight(Math.abs(r.weightChange), u)}` : '—'}</span>
              <span className="stat-sub">{c.journalCount} journal entries · {fmtDuration(c.mindfulMin)} mindful</span>
            </div>
          </div>

          {r.goals.length > 0 && (
            <section className="card pad">
              <h3>Goals</h3>
              <ul className="kv">
                {r.goals.map((g) => (
                  <li key={g.title}>
                    <span>{g.emoji} {g.title}</span>
                    <strong>{g.done ? '✓ ' : ''}{g.text}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CoachReview report={r} markdown={markdown} />
        </>
      )}
    </section>
  )
}

/** Small "last week in review" card for the Today screen. */
export function LastWeekCard() {
  const { index, profile, goals } = useHealth()
  const r = useMemo(() => buildReport({ index, profile, goals, kind: 'week', offset: 1 }), [index, profile, goals])
  if (!r.cur.workouts && !r.cur.sleepNights) return null
  return (
    <section className="card pad last-week">
      <header className="row between">
        <h3>Last week in review</h3>
        <Link to="/reports?kind=week&offset=1" className="link-btn">Full report</Link>
      </header>
      <div className="row gap wrap">
        <span><strong>{r.cur.workouts}</strong> <span className="muted small">workouts</span></span>
        <span><strong>{fmtDuration(r.cur.activeMin)}</strong> <span className="muted small">training</span></span>
        {r.cur.avgSleepMin != null && <span><strong>{fmtHours(r.cur.avgSleepMin)}</strong> <span className="muted small">avg sleep</span></span>}
        {r.overall != null && <span><strong>{r.overall}</strong> <span className="muted small">score</span></span>}
      </div>
      {r.wins[0] && <p className="small">🌟 {r.wins[0]}</p>}
      {r.focus[0] && <p className="small muted">🎯 {r.focus[0]}</p>}
    </section>
  )
}
