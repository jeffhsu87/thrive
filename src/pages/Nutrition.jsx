import { useState } from 'react'
import PageHeader, { Stat } from '../components/PageHeader.jsx'
import { BarChart, ChartCard, Ring, SegmentedBar } from '../components/Charts.jsx'
import { MacroMeters, WaterTracker } from '../components/Bits.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { useQuickLog } from '../components/QuickLog.jsx'
import { ChevronLeft, ChevronRight, TrashIcon } from '../components/Icons.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { addDaysKey, dayHeading, dayKey, rangeKeys, addDays, weekdayShort } from '../lib/date.js'
import { MEAL_TYPES, PROTEIN_IDEAS } from '../lib/foods.js'
import { summarize } from '../lib/stats.js'
import { fmtNum, fmtWater } from '../lib/units.js'

export default function Nutrition() {
  const { index, profile, actions } = useHealth()
  const { open } = useQuickLog()
  const { notify } = useFeedback()
  const [day, setDay] = useState(dayKey())
  const d = index.get(day)
  const t = profile.targets
  const remaining = t.calories - d.calIn
  const week = summarize(index, addDays(new Date(), -6), 7, profile)
  const keys = rangeKeys(addDays(new Date(), -13), 14)
  const lbl = (k) => weekdayShort(new Date(`${k}T12:00`))
  const macroCal = { p: d.protein * 4, c: d.carbs * 4, f: d.fat * 9 }

  function removeMeal(m) {
    const removed = actions.removeMeal(m.id)
    notify(`Removed ${m.name}`, { action: () => actions.restoreMeal(removed) })
  }

  return (
    <section className="page">
      <PageHeader eyebrow="Track" title="Nutrition" actions={<button className="btn primary" onClick={() => open('meal', { day })}>+ Log food</button>}>
        Fuel for your training and your day. No judgement, just awareness.
      </PageHeader>

      <div className="day-nav" role="group" aria-label="Choose day">
        <button className="icon-btn" onClick={() => setDay(addDaysKey(day, -1))} aria-label="Previous day"><ChevronLeft /></button>
        <strong>{dayHeading(day)}</strong>
        <button className="icon-btn" onClick={() => setDay(addDaysKey(day, 1))} disabled={day >= dayKey()} aria-label="Next day"><ChevronRight /></button>
      </div>

      <div className="two-col">
        <section className="card pad hero-card">
          <div className="hero-ring">
            <Ring value={d.calIn} max={t.calories} size={140} stroke={12} color="var(--series-2)" label={`${Math.round(d.calIn)} of ${t.calories} calories`}>
              <strong className="ring-value">{fmtNum(Math.abs(remaining))}</strong>
              <small>{remaining >= 0 ? 'cal left' : 'cal over'}</small>
            </Ring>
          </div>
          <div className="grow">
            <ul className="kv">
              <li><span>Target <InfoTip term="calories" /></span><strong>{fmtNum(t.calories)} cal</strong></li>
              <li><span>Eaten</span><strong>{fmtNum(d.calIn)} cal</strong></li>
              <li><span>Burned in workouts</span><strong>{fmtNum(d.caloriesOut)} cal</strong></li>
            </ul>
            {d.caloriesOut > 300 && <p className="muted small">Big training day! It is fine to eat a little more to recover.</p>}
          </div>
        </section>
        <section className="card pad">
          <h3>Macros <InfoTip term="macros" /></h3>
          <MacroMeters day={d} targets={t} />
          {d.calIn > 0 && (
            <>
              <p className="field-label">Where calories came from</p>
              <SegmentedBar
                parts={[
                  { label: 'Protein', value: Math.round(macroCal.p), color: 'var(--series-1)' },
                  { label: 'Carbs', value: Math.round(macroCal.c), color: 'var(--series-2)' },
                  { label: 'Fat', value: Math.round(macroCal.f), color: 'var(--series-3)' },
                ]}
                format={(v) => `${fmtNum(v)} cal`}
              />
            </>
          )}
          {d.protein < t.protein * 0.6 && day === dayKey() && new Date().getHours() >= 13 && (
            <p className="hint-box">🥚 Protein ideas: {PROTEIN_IDEAS.slice(0, 4).join(', ')}.</p>
          )}
        </section>
      </div>

      <section className="card pad">
        <h3>Water</h3>
        <WaterTracker day={day} />
      </section>

      <div className="meals">
        {MEAL_TYPES.map((mt) => {
          const items = d.meals.filter((m) => m.mealType === mt.id)
          const cal = items.reduce((s, m) => s + m.cal * (m.servings || 1), 0)
          return (
            <section key={mt.id} className="card meal-card">
              <header className="row between pad-x">
                <h3>{mt.emoji} {mt.label}</h3>
                <span className="muted small">{cal ? `${fmtNum(cal)} cal` : ''}</span>
              </header>
              {items.map((m) => (
                <div key={m.id} className="list-row">
                  <span className="grow">
                    <strong>{m.name}</strong>
                    <small className="muted"> {m.servings !== 1 ? `${m.servings} × ` : ''}{m.serving}</small>
                  </span>
                  <small className="muted hide-sm">P {Math.round(m.p * m.servings)} · C {Math.round(m.c * m.servings)} · F {Math.round(m.f * m.servings)}</small>
                  <span>{fmtNum(m.cal * (m.servings || 1))}</span>
                  <button className="icon-btn" onClick={() => removeMeal(m)} aria-label={`Remove ${m.name}`}><TrashIcon width={16} height={16} /></button>
                </div>
              ))}
              <button className="add-row" onClick={() => open('meal', { day, mealType: mt.id })}>+ Add to {mt.label.toLowerCase()}</button>
            </section>
          )
        })}
      </div>

      <div className="stats four">
        <Stat label="Avg calories · 7 days" value={fmtNum(week.avgCalIn)} unit="cal" sub={`${week.nutritionDays} days logged`} />
        <Stat label="Avg protein" value={fmtNum(week.avgProtein)} unit="g" sub={`Target ${t.protein} g`} />
        <Stat label="Avg water" value={fmtWater(week.avgWaterMl, profile.units)} sub={`Target ${fmtWater(t.waterMl, profile.units)}`} />
        <Stat label="Days on protein target" value={week.days.filter((x) => x.meals.length && x.protein >= t.protein).length} unit="/ 7" />
      </div>

      <div className="two-col">
        <ChartCard title="Calories · 2 weeks" info="calories" table={{ columns: ['Day', 'Calories', 'Protein'], rows: keys.map((k) => [dayHeading(k), fmtNum(index.get(k).calIn), `${fmtNum(index.get(k).protein)} g`]) }}>
          <BarChart data={keys.map((k) => ({ key: k, label: lbl(k), tip: dayHeading(k), value: index.get(k).meals.length ? Math.round(index.get(k).calIn) : null }))} goal={t.calories} goalLabel="Target" color="var(--series-2)" format={(v) => `${fmtNum(v)} cal`} label="Calories per day" />
        </ChartCard>
        <ChartCard title="Protein · 2 weeks" table={{ columns: ['Day', 'Protein'], rows: keys.map((k) => [dayHeading(k), `${fmtNum(index.get(k).protein)} g`]) }}>
          <BarChart data={keys.map((k) => ({ key: k, label: lbl(k), tip: dayHeading(k), value: index.get(k).meals.length ? Math.round(index.get(k).protein) : null }))} goal={t.protein} goalLabel="Target" color="var(--series-1)" format={(v) => `${fmtNum(v)} g`} label="Protein per day" />
        </ChartCard>
      </div>
    </section>
  )
}
