import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader, { Empty, Stat } from '../components/PageHeader.jsx'
import { ChartCard, LineChart, SegmentedBar } from '../components/Charts.jsx'
import { SourceBadge } from '../components/Bits.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { useQuickLog } from '../components/QuickLog.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { feelFor, sportFor } from '../lib/sports.js'
import { ZONES, maxHrOf, strainLabel, zoneMinutes, zoneRange } from '../lib/metrics.js'
import { fmtDist, fmtDuration, fmtElev, fmtNum, fmtPace, fmtWeight, paceLabel } from '../lib/units.js'
import { formatTime } from '../lib/date.js'
import { PencilIcon, TrashIcon } from '../components/Icons.jsx'

export const ZONE_COLORS = ['var(--zone-0)', 'var(--zone-1)', 'var(--zone-2)', 'var(--zone-3)', 'var(--zone-4)', 'var(--zone-5)']

export default function ActivityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { index, profile, actions, activities } = useHealth()
  const { notify } = useFeedback()
  const { open } = useQuickLog()
  const a = index.activities.find((x) => x.id === id)
  const raw = activities.find((x) => x.id === id)
  if (!a) return <Empty title="Workout not found" action={<Link className="btn ghost" to="/activity">Back to activity</Link>} />

  const u = profile.units
  const sp = sportFor(a.sport)
  const pace = fmtPace(sp.pace, a.durationMin, a.distanceKm, u)
  const maxHr = maxHrOf(profile)
  const zm = zoneMinutes(a, maxHr)
  const feel = feelFor(a.rpe)
  const hrData = a.hr?.bpm?.map((b, i) => {
    const min = (i * (a.hr.interval || 60)) / 60
    return { key: i, label: `${Math.round(min)}′`, tip: `${fmtDuration(min)} in`, bpm: b }
  })

  function remove() {
    const removed = actions.removeActivity(a.id)
    navigate('/activity')
    notify('Workout deleted', { action: () => actions.restoreActivity(removed) })
  }

  return (
    <section className="page">
      <Link to="/activity" className="link-btn back">← Activity</Link>
      <PageHeader
        eyebrow={`${new Date(a.start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · ${formatTime(a.start)}`}
        title={`${sp.emoji} ${a.title || sp.name}`}
        actions={
          <>
            <button className="btn ghost" onClick={() => open('edit', { activity: raw })}><PencilIcon width={16} height={16} /> Edit</button>
            <button className="btn ghost danger" onClick={remove}><TrashIcon width={16} height={16} /> Delete</button>
          </>
        }
      >
        <SourceBadge source={a.source} /> {feel && <span>{feel.emoji} Felt {feel.label.toLowerCase()}</span>}
      </PageHeader>

      <div className="stats four">
        <Stat label="Duration" value={fmtDuration(a.durationMin)} />
        {a.distanceKm ? <Stat label="Distance" value={fmtDist(a.distanceKm, u, 2)} /> : null}
        {pace && <Stat label={paceLabel(sp.pace)} value={pace} />}
        <Stat label="Strain" value={fmtNum(a.strain, 1)} unit="/ 21" sub={strainLabel(a.strain)} info={<InfoTip term="strain" />} />
        <Stat label="Active calories" value={fmtNum(a.calories)} unit="cal" sub={raw?.calories == null ? 'Estimated' : null} info={<InfoTip term="calories" />} />
        {a.avgHr ? <Stat label="Avg heart rate" value={a.avgHr} unit="bpm" sub={a.maxHr ? `Max ${a.maxHr} bpm` : null} /> : null}
        {a.elevationM ? <Stat label="Elevation gain" value={fmtElev(a.elevationM, u)} /> : null}
        {a.avgPower ? <Stat label="Avg power" value={a.avgPower} unit="W" info={<InfoTip term="power" />} sub={profile.weightKg ? `${fmtNum(a.avgPower / profile.weightKg, 1)} W/kg` : null} /> : null}
        {a.cadence ? <Stat label="Avg cadence" value={a.cadence} unit={sp.cadenceUnit || 'spm'} info={<InfoTip term="cadence" />} /> : null}
        {a.laps ? <Stat label="Lengths" value={a.laps} sub={`${a.poolM} m pool`} /> : null}
        {a.rounds ? <Stat label="Rounds" value={a.rounds} /> : null}
        {a.floors ? <Stat label="Floors" value={a.floors} /> : null}
        {(sp.metrics || []).map((m) => (a.extra?.[m.key] != null ? <Stat key={m.key} label={m.label} value={fmtNum(a.extra[m.key], 1)} unit={m.unit || undefined} /> : null))}
        {a.score?.result || a.score?.text ? <Stat label="Result" value={a.score.result ? a.score.result[0].toUpperCase() + a.score.result.slice(1) : '—'} sub={a.score.text} /> : null}
      </div>

      {hrData && (
        <ChartCard title="Heart rate" info="zones" subtitle={`Avg ${a.avgHr} bpm · max ${a.maxHr} bpm`} table={{ columns: ['Time', 'Heart rate'], rows: hrData.filter((_, i) => i % Math.max(1, Math.floor(hrData.length / 40)) === 0).map((d) => [d.tip, `${d.bpm} bpm`]) }}>
          <LineChart data={hrData} series={[{ key: 'bpm', label: 'bpm', color: 'var(--series-8)', area: true }]} format={(v) => `${v} bpm`} label="Heart rate during the workout" height={200} />
        </ChartCard>
      )}

      {zm && (
        <section className="card pad">
          <h3>Time in heart rate zones <InfoTip term="zones" /></h3>
          <SegmentedBar parts={ZONES.map((z) => ({ label: `Z${z.n} ${z.name}`, value: Math.round(zm[z.n]), color: ZONE_COLORS[z.n] }))} format={(v) => fmtDuration(v)} />
          <ul className="zone-list">
            {ZONES.map((z) => {
              const [lo, hi] = zoneRange(z, maxHr)
              return (
                <li key={z.n}>
                  <span className="key rect" style={{ background: ZONE_COLORS[z.n] }} aria-hidden />
                  <strong>Zone {z.n} · {z.name}</strong>
                  <span className="muted">{lo}–{hi} bpm</span>
                  <span>{fmtDuration(zm[z.n])}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {a.sets?.length > 0 && (
        <section className="card pad">
          <h3>Exercises</h3>
          <table className="data-table">
            <thead>
              <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th>Volume</th></tr>
            </thead>
            <tbody>
              {a.sets.map((s, i) => (
                <tr key={i}>
                  <td>{s.exercise}</td>
                  <td>{s.sets ?? '—'}</td>
                  <td>{s.reps ?? '—'}</td>
                  <td>{s.weightKg ? fmtWeight(s.weightKg, u) : 'Bodyweight'}</td>
                  <td>{s.weightKg && s.sets && s.reps ? fmtWeight(s.weightKg * s.sets * s.reps, u, 0) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {a.notes && (
        <section className="card pad">
          <h3>Notes</h3>
          <p className="prewrap">{a.notes}</p>
        </section>
      )}
    </section>
  )
}
