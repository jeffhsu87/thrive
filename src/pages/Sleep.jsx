import { useState } from 'react'
import PageHeader, { Empty, Stat } from '../components/PageHeader.jsx'
import { ChartCard, Hypnogram, LineChart, RangeBars, Ring, SegmentedBar, StackedBars, STAGE_KEYS } from '../components/Charts.jsx'
import { Segmented } from '../components/Fields.jsx'
import { SourceBadge } from '../components/Bits.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { useQuickLog } from '../components/QuickLog.jsx'
import { PencilIcon, TrashIcon } from '../components/Icons.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { addDays, bedtimeMinutes, clockFromBedMinutes, dayHeading, formatTime, rangeKeys, shortDate } from '../lib/date.js'
import { sleepLabel } from '../lib/metrics.js'
import { consistencyPct, summarize } from '../lib/stats.js'
import { fmtDuration, fmtHours } from '../lib/units.js'

const TIPS = [
  ['🌡️', 'Keep it cool', 'A bedroom around 18 °C (65 °F) helps you fall and stay asleep.'],
  ['☕', 'Mind the caffeine', 'Caffeine can linger for 8+ hours. Try none after early afternoon.'],
  ['📱', 'Dim the screens', 'Bright light late at night delays your body clock. Wind down 30 minutes before bed.'],
  ['⏰', 'Same time, every day', 'A consistent wake time, even at weekends, is the single best habit for better sleep.'],
  ['🍷', 'Go easy on alcohol', 'It may help you nod off, but it fragments sleep and lowers HRV.'],
]

export default function Sleep() {
  const { index, profile, sleep: rawSleep, actions } = useHealth()
  const { open } = useQuickLog()
  const { notify } = useFeedback()
  const [range, setRange] = useState(14)
  const need = profile.targets.sleepHours * 60

  const nights = rangeKeys(addDays(new Date(), -(range - 1)), range).map((k) => index.get(k))
  const last = [...index.days.values()].filter((d) => d.sleep).sort((a, b) => b.key.localeCompare(a.key))[0]
  const week = summarize(index, addDays(new Date(), -6), 7, profile)
  const prevWeek = summarize(index, addDays(new Date(), -13), 7, profile)
  const consistency = consistencyPct(week.bedtimeSd)
  const wakeTimes = nights.filter((d) => d.sleep?.wake).map((d) => new Date(d.sleep.wake))
  const avgWakeMin = wakeTimes.length ? wakeTimes.reduce((s, d) => s + d.getHours() * 60 + d.getMinutes(), 0) / wakeTimes.length : 7 * 60
  const bedtimeTonight = (() => {
    const t = ((avgWakeMin - need - 15 + 24 * 60) % (24 * 60))
    const d = new Date()
    d.setHours(Math.floor(t / 60), Math.round(t % 60), 0, 0)
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  })()
  const hasStages = nights.some((d) => d.sleep?.stages)
  const label = (k) => (range <= 14 ? new Date(`${k}T12:00`).toLocaleDateString(undefined, { weekday: 'narrow' }) : shortDate(`${k}T12:00`))
  const listed = [...rawSleep].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 21)

  if (!index.days.size || !last)
    return (
      <section className="page">
        <PageHeader eyebrow="Track" title="Sleep" actions={<button className="btn primary" onClick={() => open('sleep')}>+ Log sleep</button>}>Good sleep powers everything else.</PageHeader>
        <Empty title="No sleep tracked yet" action={<button className="btn primary" onClick={() => open('sleep')}>Log last night</button>}>
          Log when you went to bed and woke up, or connect a watch, ring or band to track sleep stages automatically.
        </Empty>
      </section>
    )

  const s = last.sleep
  return (
    <section className="page">
      <PageHeader eyebrow="Track" title="Sleep" actions={<button className="btn primary" onClick={() => open('sleep')}>+ Log sleep</button>}>
        Good sleep powers everything else.
      </PageHeader>

      <section className="card pad hero-card">
        <div className="hero-ring">
          <Ring value={last.sleepScore} size={132} color="var(--series-1)" label={`Sleep score ${last.sleepScore}`}>
            <strong className="ring-value">{last.sleepScore}</strong>
            <small>{sleepLabel(last.sleepScore)}</small>
          </Ring>
        </div>
        <div className="grow stack-sm">
          <p className="eyebrow">{dayHeading(last.key) === 'Today' ? 'Last night' : `Night before ${dayHeading(last.key)}`} <SourceBadge source={s.source} /></p>
          <p className="hero-number">{fmtHours(s.durationMin)} <small className="muted">asleep · goal {fmtHours(need)}</small></p>
          {s.bedtime && s.wake && <p className="muted">{formatTime(s.bedtime)} → {formatTime(s.wake)}{s.wakeUps ? ` · woke ${s.wakeUps}×` : ''}</p>}
          {s.stages && <SegmentedBar parts={STAGE_KEYS.map((k) => ({ label: k.label, value: s.stages[k.key] || 0, color: k.color }))} format={fmtDuration} />}
          {s.respRate && <p className="muted small">Respiratory rate {s.respRate} breaths/min <InfoTip term="respRate" /></p>}
        </div>
      </section>

      {s.segments?.length > 0 && s.bedtime && (
        <ChartCard title="Sleep stages through the night" info="stages">
          <Hypnogram segments={s.segments} bedtime={s.bedtime} />
        </ChartCard>
      )}

      <div className="stats four">
        <Stat label="Average · 7 nights" value={week.avgSleepMin != null ? fmtHours(week.avgSleepMin) : '—'} sub={prevWeek.avgSleepMin != null ? `${fmtHours(prevWeek.avgSleepMin)} the week before` : null} />
        <Stat label="Sleep debt" info={<InfoTip term="sleepDebt" />} value={fmtHours(week.sleepDebtMin)} sub={week.sleepDebtMin > 120 ? 'Try a few earlier nights' : 'Nicely rested'} />
        <Stat label="Consistency" info={<InfoTip term="consistency" />} value={consistency != null ? `${consistency}%` : '—'} sub={week.avgBedtime != null ? `Usual bedtime ${clockFromBedMinutes(week.avgBedtime)}` : null} />
        <Stat label="Suggested bedtime tonight" value={bedtimeTonight} sub={`For ${fmtHours(need)} before your usual wake-up`} />
      </div>

      <div className="row between wrap">
        <h2 className="section-title">Trends</h2>
        <Segmented small value={range} onChange={setRange} options={[{ value: 14, label: '2 weeks' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} />
      </div>

      <div className="two-col">
        <ChartCard
          title={hasStages ? 'Time asleep by stage' : 'Time asleep'}
          info={hasStages ? 'stages' : undefined}
          table={{ columns: ['Night', 'Asleep', 'Deep', 'REM', 'Light', 'Awake'], rows: nights.filter((d) => d.sleep).map((d) => [shortDate(`${d.key}T12:00`), fmtHours(d.sleepMin), ...['deep', 'rem', 'light', 'awake'].map((k) => (d.sleep.stages ? fmtDuration(d.sleep.stages[k]) : '—'))]) }}
        >
          <StackedBars
            data={nights.map((d) => ({
              key: d.key,
              label: label(d.key),
              tip: dayHeading(d.key),
              parts: d.sleep?.stages ? { deep: d.sleep.stages.deep, rem: d.sleep.stages.rem, light: d.sleep.stages.light, awake: d.sleep.stages.awake } : d.sleep ? { light: d.sleepMin } : {},
            }))}
            keys={hasStages ? [...STAGE_KEYS].reverse() : [{ key: 'light', label: 'Asleep', color: 'var(--series-1)' }]}
            goal={need}
            format={fmtDuration}
            tickFormat={(v) => `${Math.round(v / 60)}h`}
            label="Sleep per night"
          />
        </ChartCard>
        <ChartCard title="Sleep window" info="consistency" subtitle="Bedtime to wake-up each night" table={{ columns: ['Night', 'Bedtime', 'Wake'], rows: nights.filter((d) => d.sleep?.bedtime).map((d) => [shortDate(`${d.key}T12:00`), formatTime(d.sleep.bedtime), formatTime(d.sleep.wake)]) }}>
          <RangeBars
            data={nights.map((d) => ({ key: d.key, label: label(d.key), tip: dayHeading(d.key), start: d.sleep?.bedtime ? bedtimeMinutes(d.sleep.bedtime) : null, end: d.sleep?.wake ? bedtimeMinutes(d.sleep.wake) : null, raw: d.sleep }))}
            tickFormat={clockFromBedMinutes}
            format={(d) => `${formatTime(d.raw.bedtime)} → ${formatTime(d.raw.wake)}`}
            label="Bedtime and wake time each night"
          />
        </ChartCard>
      </div>

      <ChartCard title="Sleep score" info="sleepScore" table={{ columns: ['Night', 'Score'], rows: nights.filter((d) => d.sleepScore != null).map((d) => [shortDate(`${d.key}T12:00`), d.sleepScore]) }}>
        <LineChart data={nights.map((d) => ({ key: d.key, label: label(d.key), tip: dayHeading(d.key), score: d.sleepScore }))} series={[{ key: 'score', label: '', color: 'var(--series-1)' }]} yDomain={[0, 100]} format={(v) => `${v}`} label="Sleep score per night" />
      </ChartCard>

      <div className="two-col">
        <section className="card list-card">
          <h3 className="pad-x">Recent nights</h3>
          {listed.map((n) => (
            <div key={n.id} className="list-row">
              <span className="grow">
                <strong>{dayHeading(n.date)}</strong>
                <small className="muted"> {n.bedtime && n.wake ? `${formatTime(n.bedtime)} → ${formatTime(n.wake)}` : ''} <SourceBadge source={n.source} /></small>
              </span>
              <span>{fmtHours(n.durationMin)}</span>
              {n.source === 'manual' && (
                <span className="row">
                  <button className="icon-btn" aria-label="Edit night" onClick={() => open('editSleep', { sleep: n })}><PencilIcon width={16} height={16} /></button>
                  <button
                    className="icon-btn"
                    aria-label="Delete night"
                    onClick={() => {
                      actions.removeSleep(n.id)
                      notify('Night deleted', { action: () => actions.addSleep(n) })
                    }}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </section>
        <section className="card pad">
          <h3>Sleep better</h3>
          <ul className="tips">
            {TIPS.map(([e, t, b]) => (
              <li key={t}>
                <span aria-hidden>{e}</span>
                <span><strong>{t}.</strong> {b}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
