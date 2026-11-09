import { Link, useNavigate } from 'react-router-dom'
import { useQuickLog } from './QuickLog.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { ArrowDown, ArrowUp, DropIcon } from './Icons.jsx'
import { Meter } from './Charts.jsx'
import { sportFor, feelFor } from '../lib/sports.js'
import { recoveryStatus, strainLabel } from '../lib/metrics.js'
import { fmtDist, fmtDuration, fmtPace, fmtWater, fmtNum } from '../lib/units.js'
import { dayKey, formatTime } from '../lib/date.js'
import { deviceFor } from '../lib/devices.js'

export const STATUS_COLOR = { good: 'var(--status-good)', warning: 'var(--status-warning)', critical: 'var(--status-critical)' }

/** Recovery state: always icon + label + color, never color alone. */
export function StatusPill({ score }) {
  const st = recoveryStatus(score)
  if (!st) return null
  return (
    <span className={`status-pill ${st.level}`}>
      <span aria-hidden>{st.icon}</span> {st.label}
    </span>
  )
}

export function useRecAction() {
  const navigate = useNavigate()
  const { open } = useQuickLog()
  const { actions, profile } = useHealth()
  const { notify } = useFeedback()
  return (action) => {
    if (!action) return
    if (action.to) navigate(action.to)
    else if (action.log) open(action.log)
    else if (action.water) {
      actions.addWater(dayKey(), action.water)
      notify(`💧 +${fmtWater(action.water, profile.units)}`)
    }
  }
}

export function RecCard({ rec }) {
  const run = useRecAction()
  return (
    <article className={`rec card tone-${rec.tone}`}>
      <span className="rec-emoji" aria-hidden>{rec.emoji}</span>
      <div>
        <h4>{rec.title}</h4>
        <p>{rec.body}</p>
        {rec.action && (
          <button className="link-btn" onClick={() => run(rec.action)}>
            {rec.action.label} →
          </button>
        )}
      </div>
    </article>
  )
}

export function SourceBadge({ source }) {
  if (!source || source === 'manual') return null
  const label = source === 'import' ? 'Imported' : source === 'live' ? 'Recorded' : deviceFor(source)?.name || source
  return <span className="source-badge">{label}</span>
}

export function ActivityRow({ a, showDate = false }) {
  const { profile } = useHealth()
  const sp = sportFor(a.sport)
  const pace = fmtPace(sp.pace, a.durationMin, a.distanceKm, profile.units)
  const feel = feelFor(a.rpe)
  return (
    <Link to={`/activity/${a.id}`} className="activity-row">
      <span className="sport-emoji" aria-hidden>{sp.emoji}</span>
      <span className="activity-main">
        <strong>{a.title || sp.name}</strong>
        <small>
          {showDate ? `${new Date(a.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ` : ''}
          {formatTime(a.start)}
          {feel ? ` · ${feel.emoji} ${feel.label}` : ''}
          <SourceBadge source={a.source} />
        </small>
      </span>
      <span className="activity-metrics">
        <span>{fmtDuration(a.durationMin)}</span>
        {a.distanceKm ? <span>{fmtDist(a.distanceKm, profile.units, a.distanceKm < 10 ? 2 : 1)}</span> : null}
        {pace && <span className="hide-sm">{pace}</span>}
        {a.avgHr ? <span className="hide-sm">♥ {a.avgHr}</span> : null}
        <span className="strain-chip" title={`Strain ${a.strain} (${strainLabel(a.strain)})`}>{fmtNum(a.strain, 1)}</span>
      </span>
    </Link>
  )
}

export function Delta({ cur, prev, goodWhenUp = true, format = (v) => fmtNum(v, 1), unit = '' }) {
  if (cur == null || prev == null || prev === 0) return <span className="delta muted">no comparison</span>
  const diff = cur - prev
  if (Math.abs(diff) < 1e-9) return <span className="delta muted">same as before</span>
  const up = diff > 0
  const good = up === goodWhenUp
  const pct = Math.round((Math.abs(diff) / Math.abs(prev)) * 100)
  return (
    <span className={`delta ${good ? 'good' : 'bad'}`}>
      {up ? <ArrowUp width={13} height={13} /> : <ArrowDown width={13} height={13} />}
      {format(Math.abs(diff))}
      {unit} ({pct}%)
    </span>
  )
}

export function MacroMeters({ day, targets }) {
  const rows = [
    { label: 'Protein', v: day.protein, t: targets.protein, color: 'var(--series-1)' },
    { label: 'Carbs', v: day.carbs, t: targets.carbs, color: 'var(--series-2)' },
    { label: 'Fat', v: day.fat, t: targets.fat, color: 'var(--series-3)' },
  ]
  return (
    <div className="macro-meters">
      {rows.map((r) => (
        <div key={r.label} className="macro">
          <span className="macro-label">
            <span className="key rect" style={{ background: r.color }} aria-hidden /> {r.label}
            <strong>
              {Math.round(r.v)} <small>/ {r.t} g</small>
            </strong>
          </span>
          <Meter value={r.v} max={r.t} color={r.color} label={`${r.label} ${Math.round(r.v)} of ${r.t} grams`} />
        </div>
      ))}
    </div>
  )
}

export function WaterTracker({ day = dayKey(), compact = false }) {
  const { index, profile, actions } = useHealth()
  const { notify } = useFeedback()
  const ml = index.get(day).waterMl
  const goal = profile.targets.waterMl
  const glasses = Math.max(8, Math.ceil(goal / 250))
  const filled = Math.floor(ml / 250)
  function add(delta) {
    actions.addWater(day, delta)
    if (delta > 0 && ml < goal && ml + delta >= goal) notify('💧 Water goal reached. Hydration hero!')
  }
  return (
    <div className={'water' + (compact ? ' compact' : '')}>
      <div className="water-head">
        <span>
          <strong>{fmtWater(ml, profile.units)}</strong> <span className="muted">of {fmtWater(goal, profile.units)}</span>
        </span>
        <span className="row gap-sm">
          <button className="btn ghost small" onClick={() => add(-250)} disabled={ml <= 0} aria-label="Remove a glass">−</button>
          <button className="btn primary small" onClick={() => add(250)}>+ Glass</button>
        </span>
      </div>
      <div className="glasses" aria-hidden>
        {Array.from({ length: glasses }, (_, i) => (
          <DropIcon key={i} className={i < filled ? 'on' : ''} width={compact ? 16 : 20} height={compact ? 16 : 20} />
        ))}
      </div>
    </div>
  )
}
