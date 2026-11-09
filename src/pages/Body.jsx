import { useState } from 'react'
import PageHeader, { Empty, Stat } from '../components/PageHeader.jsx'
import { BarChart, ChartCard, LineChart } from '../components/Charts.jsx'
import { Segmented } from '../components/Fields.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { useQuickLog } from '../components/QuickLog.jsx'
import { useHealth } from '../store/Health.jsx'
import { addDays, dayHeading, rangeKeys, shortDate } from '../lib/date.js'
import { bmiOf, mean } from '../lib/metrics.js'
import { fmtNum, fmtWeight, kgTo, weightUnit } from '../lib/units.js'

export default function Body() {
  const { index, profile } = useHealth()
  const { open } = useQuickLog()
  const [range, setRange] = useState(90)
  const u = profile.units
  const keys = rangeKeys(addDays(new Date(), -(range - 1)), range)
  const days = keys.map((k) => index.get(k))
  const weights = days.filter((d) => d.weightKg != null)
  const latest = weights[weights.length - 1]
  const first = weights[0]
  const bmi = bmiOf(latest?.weightKg ?? profile.weightKg, profile.heightCm)
  const steps = rangeKeys(addDays(new Date(), -29), 30).map((k) => index.get(k))
  const avgSteps = mean(steps.map((d) => d.steps))
  const bodyFat = [...days].reverse().find((d) => d.bodyFat != null)?.bodyFat
  const label = (k) => shortDate(`${k}T12:00`)
  // 7-day rolling average smooths daily water-weight swings.
  const smooth = days.map((d, i) => {
    const win = days.slice(Math.max(0, i - 6), i + 1).map((x) => x.weightKg)
    const m = mean(win)
    return m == null ? null : Math.round(kgTo(m, u) * 10) / 10
  })

  return (
    <section className="page">
      <PageHeader eyebrow="Track" title="Body" actions={<button className="btn primary" onClick={() => open('checkin')}>+ Check-in</button>}>
        Weight, body composition and everyday movement. Trends matter more than any single day.
      </PageHeader>

      <div className="stats four">
        <Stat label="Current weight" value={latest ? fmtWeight(latest.weightKg, u) : profile.weightKg ? fmtWeight(profile.weightKg, u) : '—'} sub={latest ? dayHeading(latest.key) : 'From your profile'} />
        <Stat
          label={`Change · ${range} days`}
          value={latest && first && latest !== first ? `${latest.weightKg - first.weightKg > 0 ? '+' : '−'}${fmtWeight(Math.abs(latest.weightKg - first.weightKg), u)}` : '—'}
          sub={first && latest !== first ? `From ${fmtWeight(first.weightKg, u)}` : 'Log a few weigh-ins to see change'}
        />
        <Stat label="BMI" info={<InfoTip term="bmi" />} value={bmi ? bmi.value : '—'} sub={bmi ? bmi.label : 'Add your height in Settings'} />
        <Stat label="Avg steps · 30 days" info={<InfoTip term="steps" />} value={fmtNum(avgSteps)} sub={`Goal ${fmtNum(profile.targets.steps)}`} />
      </div>
      {bodyFat != null && <p className="muted small">Latest body fat: {fmtNum(bodyFat, 1)}%</p>}

      {weights.length ? (
        <ChartCard
          title="Weight"
          subtitle="Daily weigh-ins and the 7-day average"
          actions={<Segmented small value={range} onChange={setRange} options={[{ value: 30, label: '30d' }, { value: 90, label: '90d' }, { value: 365, label: '1y' }]} />}
          table={{ columns: ['Day', `Weight (${weightUnit(u)})`], rows: weights.map((d) => [label(d.key), fmtNum(kgTo(d.weightKg, u), 1)]) }}
        >
          <LineChart
            data={days.map((d, i) => ({ key: d.key, label: label(d.key), tip: dayHeading(d.key), w: d.weightKg != null ? Math.round(kgTo(d.weightKg, u) * 10) / 10 : null, avg: smooth[i] }))}
            series={[
              { key: 'avg', label: '7-day average', color: 'var(--series-1)' },
              { key: 'w', label: 'Weigh-in', color: 'var(--series-2)' },
            ]}
            format={(v) => `${fmtNum(v, 1)} ${weightUnit(u)}`}
            label="Weight over time"
          />
        </ChartCard>
      ) : (
        <Empty title="No weigh-ins yet" action={<button className="btn primary" onClick={() => open('checkin')}>Add a weigh-in</button>}>
          Weigh yourself at the same time of day, ideally in the morning, for the most consistent trend. A smart scale can sync automatically.
        </Empty>
      )}

      <ChartCard title="Steps · 30 days" info="steps" table={{ columns: ['Day', 'Steps'], rows: steps.filter((d) => d.steps != null).map((d) => [label(d.key), fmtNum(d.steps)]) }}>
        <BarChart data={steps.map((d) => ({ key: d.key, label: label(d.key), tip: dayHeading(d.key), value: d.steps }))} goal={profile.targets.steps} format={(v) => `${fmtNum(v)} steps`} label="Daily steps" />
      </ChartCard>
    </section>
  )
}
