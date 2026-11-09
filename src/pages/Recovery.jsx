import { Link } from 'react-router-dom'
import PageHeader, { Empty, Stat } from '../components/PageHeader.jsx'
import { BarChart, ChartCard, Legend, LineChart, Ring, StackedBars } from '../components/Charts.jsx'
import { StatusPill, STATUS_COLOR } from '../components/Bits.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { useHealth } from '../store/Health.jsx'
import { addDays, dayHeading, dayKey, rangeKeys, shortDate, startOfWeek } from '../lib/date.js'
import { ZONES, maxHrOf, recoveryStatus, strainLabel, zoneMinutes, zoneRange, mean } from '../lib/metrics.js'
import { fmtDuration, fmtNum } from '../lib/units.js'
import { ZONE_COLORS } from './ActivityDetail.jsx'

function Contributor({ label, value, detail, good, info }) {
  return (
    <li className="contributor">
      <span className={`dot ${good == null ? 'neutral' : good ? 'good' : 'bad'}`} aria-hidden>{good == null ? '•' : good ? '▲' : '▼'}</span>
      <span className="grow">
        <strong>{label}</strong> {info}
        <small className="muted">{detail}</small>
      </span>
      <span className="contributor-value">{value}</span>
    </li>
  )
}

export default function Recovery() {
  const { index, profile } = useHealth()
  const key = dayKey()
  const today = index.get(key)
  const yesterday = index.get(dayKey(addDays(new Date(), -1)))
  const status = recoveryStatus(today.recovery)
  const days = rangeKeys(addDays(new Date(), -29), 30).map((k) => index.get(k))
  const label = (k) => shortDate(`${k}T12:00`)
  const hasHeart = days.some((d) => d.hrv || d.rhr)
  const maxHr = maxHrOf(profile)
  const hrvBase = today.hrvBase ?? mean(days.map((d) => d.hrv))
  const rhrBase = today.rhrBase ?? mean(days.map((d) => d.rhr))
  const latest = (f) => [...days].reverse().find((d) => d[f] != null)?.[f]

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(startOfWeek(), -7 * (7 - i))
    const parts = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
    rangeKeys(start, 7).forEach((k) =>
      index.get(k).activities.forEach((a) => {
        const zm = zoneMinutes(a, maxHr)
        if (zm) for (let z = 1; z <= 5; z++) parts[`z${z}`] += Math.round(zm[z])
      })
    )
    return { key: dayKey(start), label: shortDate(start), tip: `Week of ${shortDate(start)}`, parts }
  })
  const hasZones = weeks.some((w) => Object.values(w.parts).some((v) => v > 0))

  if (!days.some((d) => d.recovery != null || d.strain != null))
    return (
      <section className="page">
        <PageHeader eyebrow="Track" title="Recovery & heart">How ready your body is, and how hard it has been working.</PageHeader>
        <Empty title="Not enough data yet" action={<div className="row center gap"><Link className="btn primary" to="/devices">Connect a device</Link></div>}>
          Recovery uses your sleep plus heart data (HRV and resting heart rate). Log sleep for a few nights, add a morning check-in, or connect a WHOOP, Oura, Garmin, Apple Watch or similar.
        </Empty>
      </section>
    )

  return (
    <section className="page">
      <PageHeader eyebrow="Track" title="Recovery & heart">
        How ready your body is today, and how hard it has been working.
      </PageHeader>

      <div className="two-col">
        <section className="card pad hero-card">
          {status ? (
            <>
              <div className="hero-ring">
                <Ring value={today.recovery} size={140} stroke={12} color={STATUS_COLOR[status.level]} label={`Recovery ${today.recovery}%`}>
                  <strong className="ring-value">{today.recovery}%</strong>
                  <small>recovery</small>
                </Ring>
              </div>
              <div className="grow stack-sm">
                <h3>Today <InfoTip term="recovery" /></h3>
                <StatusPill score={today.recovery} />
                <p>{status.advice}</p>
                {today.recoveryEstimated && <p className="muted small">Estimated from your sleep{today.hrv ? ', HRV' : ''}{today.rhr ? ' and resting heart rate' : ''}. A wearable makes this more accurate.</p>}
              </div>
            </>
          ) : (
            <p className="muted">No recovery for today yet. Log last night’s sleep or sync a device.</p>
          )}
        </section>

        <section className="card pad">
          <h3>What’s behind it</h3>
          <ul className="contributors">
            <Contributor label="HRV" info={<InfoTip term="hrv" />} value={today.hrv ? `${today.hrv} ms` : '—'} good={today.hrv && hrvBase ? today.hrv >= hrvBase * 0.95 : null} detail={today.hrv && hrvBase ? `${today.hrv >= hrvBase * 1.05 ? 'Above' : today.hrv >= hrvBase * 0.95 ? 'In line with' : 'Below'} your normal of ${Math.round(hrvBase)} ms` : 'Not measured today'} />
            <Contributor label="Resting heart rate" info={<InfoTip term="rhr" />} value={today.rhr ? `${today.rhr} bpm` : '—'} good={today.rhr && rhrBase ? today.rhr <= rhrBase + 1 : null} detail={today.rhr && rhrBase ? `${today.rhr <= rhrBase ? 'At or below' : today.rhr <= rhrBase + 1 ? 'In line with' : 'Above'} your normal of ${Math.round(rhrBase)} bpm` : 'Not measured today'} />
            <Contributor label="Sleep" info={<InfoTip term="sleepScore" />} value={today.sleepScore != null ? `${today.sleepScore}/100` : '—'} good={today.sleepScore != null ? today.sleepScore >= 70 : null} detail={today.sleepMin ? `${fmtDuration(today.sleepMin)} last night` : 'No sleep logged'} />
            <Contributor label="Yesterday’s strain" info={<InfoTip term="strain" />} value={yesterday.strain != null ? fmtNum(yesterday.strain, 1) : '—'} good={yesterday.strain != null ? yesterday.strain < 14 : null} detail={yesterday.strain != null ? `${strainLabel(yesterday.strain)} day` : 'No activity yesterday'} />
          </ul>
          {status && (
            <div className="strain-target">
              <p className="small">
                <strong>Strain today: {fmtNum(today.strain || 0, 1)}</strong> <span className="muted">· ideal range {status.strainTarget[0]}–{status.strainTarget[1]}</span>
              </p>
              <div className="target-track" role="img" aria-label={`Strain ${today.strain || 0} with target ${status.strainTarget[0]} to ${status.strainTarget[1]} out of 21`}>
                <span className="target-band" style={{ left: `${(status.strainTarget[0] / 21) * 100}%`, width: `${((status.strainTarget[1] - status.strainTarget[0]) / 21) * 100}%` }} />
                <span className="target-mark" style={{ left: `${Math.min((today.strain || 0) / 21, 1) * 100}%` }} />
              </div>
            </div>
          )}
        </section>
      </div>

      <ChartCard title="Recovery · last 30 days" info="recovery" table={{ columns: ['Day', 'Recovery', 'State'], rows: days.filter((d) => d.recovery != null).map((d) => [label(d.key), `${d.recovery}%`, recoveryStatus(d.recovery).label]) }}>
        <BarChart
          data={days.map((d) => ({ key: d.key, label: label(d.key), tip: `${dayHeading(d.key)} · ${d.recovery != null ? recoveryStatus(d.recovery).label : ''}`, value: d.recovery, color: d.recovery != null ? STATUS_COLOR[recoveryStatus(d.recovery).level] : undefined }))}
          format={(v) => `${v}%`}
          label="Daily recovery"
        />
        <Legend items={[{ label: '▲ Ready (67%+)', color: STATUS_COLOR.good }, { label: '● Steady (34–66%)', color: STATUS_COLOR.warning }, { label: '▼ Rest (under 34%)', color: STATUS_COLOR.critical }]} />
      </ChartCard>

      <div className="two-col">
        <ChartCard title="Strain · last 30 days" info="strain" table={{ columns: ['Day', 'Strain'], rows: days.filter((d) => d.strain != null).map((d) => [label(d.key), fmtNum(d.strain, 1)]) }}>
          <BarChart data={days.map((d) => ({ key: d.key, label: label(d.key), tip: `${dayHeading(d.key)} · ${strainLabel(d.strain)}`, value: d.strain }))} format={(v) => fmtNum(v, 1)} label="Daily strain" />
        </ChartCard>
        {hasZones ? (
          <ChartCard title="Weekly time in zones" info="zones" table={{ columns: ['Week of', ...ZONES.map((z) => `Z${z.n}`)], rows: weeks.map((w) => [w.label, ...ZONES.map((z) => fmtDuration(w.parts[`z${z.n}`]))]) }}>
            <StackedBars data={weeks} keys={ZONES.map((z) => ({ key: `z${z.n}`, label: `Z${z.n} ${z.name}`, color: ZONE_COLORS[z.n] }))} format={fmtDuration} tickFormat={(v) => `${Math.round(v / 60)}h`} label="Minutes per heart rate zone each week" />
          </ChartCard>
        ) : (
          <section className="card pad">
            <h3>Heart rate zones</h3>
            <p className="muted small">Log workouts with heart rate (or connect a device) to see how your training is spread across zones.</p>
          </section>
        )}
      </div>

      {hasHeart && (
        <div className="two-col">
          <ChartCard title="Heart rate variability" info="hrv" subtitle={hrvBase ? `Your normal: about ${Math.round(hrvBase)} ms` : null} table={{ columns: ['Day', 'HRV'], rows: days.filter((d) => d.hrv).map((d) => [label(d.key), `${d.hrv} ms`]) }}>
            <LineChart data={days.map((d) => ({ key: d.key, label: label(d.key), tip: dayHeading(d.key), hrv: d.hrv }))} series={[{ key: 'hrv', label: '', color: 'var(--series-1)' }]} format={(v) => `${v} ms`} band={hrvBase ? { lo: hrvBase * 0.9, hi: hrvBase * 1.1, label: 'Your normal range' } : undefined} label="HRV over 30 days" />
          </ChartCard>
          <ChartCard title="Resting heart rate" info="rhr" subtitle={rhrBase ? `Your normal: about ${Math.round(rhrBase)} bpm` : null} table={{ columns: ['Day', 'Resting HR'], rows: days.filter((d) => d.rhr).map((d) => [label(d.key), `${d.rhr} bpm`]) }}>
            <LineChart data={days.map((d) => ({ key: d.key, label: label(d.key), tip: dayHeading(d.key), rhr: d.rhr }))} series={[{ key: 'rhr', label: '', color: 'var(--series-8)' }]} format={(v) => `${v} bpm`} band={rhrBase ? { lo: rhrBase - 3, hi: rhrBase + 3, label: 'Your normal range' } : undefined} label="Resting heart rate over 30 days" />
          </ChartCard>
        </div>
      )}

      {(latest('spo2') != null || latest('skinTemp') != null || latest('respRate') != null) && (
        <div className="stats three">
          {latest('spo2') != null && <Stat label="Blood oxygen" info={<InfoTip term="spo2" />} value={`${fmtNum(latest('spo2'), 1)}%`} sub="Typical: 95–100%" />}
          {latest('skinTemp') != null && <Stat label="Skin temperature" info={<InfoTip term="skinTemp" />} value={`${latest('skinTemp') > 0 ? '+' : ''}${fmtNum(latest('skinTemp'), 1)}°`} sub="Versus your normal" />}
          {latest('respRate') != null && <Stat label="Respiratory rate" info={<InfoTip term="respRate" />} value={fmtNum(latest('respRate'), 1)} unit="/min" sub="During sleep" />}
        </div>
      )}

      <section className="card pad">
        <h3>Your heart rate zones <InfoTip term="zones" /></h3>
        <p className="muted small">
          Based on a maximum heart rate of {maxHr} bpm{profile.maxHr ? ' (set by you)' : ' (estimated from your age)'}. <Link to="/settings">Change</Link>
        </p>
        <ul className="zone-list">
          {ZONES.map((z) => {
            const [lo, hi] = zoneRange(z, maxHr)
            return (
              <li key={z.n}>
                <span className="key rect" style={{ background: ZONE_COLORS[z.n] }} aria-hidden />
                <strong>Zone {z.n} · {z.name}</strong>
                <span className="muted">{lo}–{hi} bpm</span>
                <span className="small">{z.desc}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </section>
  )
}
