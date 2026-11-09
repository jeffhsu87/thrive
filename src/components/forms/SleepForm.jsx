import { useState } from 'react'
import { addDaysKey, combineDayTime, dayKey, timeOfDay } from '../../lib/date.js'
import { fmtHours } from '../../lib/units.js'
import { Disclosure, Field, NumberInput, numOrNull } from '../Fields.jsx'
import InfoTip from '../InfoTip.jsx'

const QUALITY = [
  { value: 1, emoji: '😫', label: 'Awful' },
  { value: 2, emoji: '😕', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😴', label: 'Great' },
]

/** Log a night of sleep. `date` is the morning you woke up. */
export default function SleepForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(() => ({
    date: initial?.date || dayKey(),
    bed: initial?.bedtime ? timeOfDay(initial.bedtime) : '22:45',
    wake: initial?.wake ? timeOfDay(initial.wake) : '06:45',
    quality: initial?.quality ?? null,
    deep: initial?.stages?.deep ?? '',
    rem: initial?.stages?.rem ?? '',
    light: initial?.stages?.light ?? '',
    awake: initial?.stages?.awake ?? '',
    wakeUps: initial?.wakeUps ?? '',
    notes: initial?.notes || '',
  }))
  const set = (p) => setF((c) => ({ ...c, ...p }))

  const bedHour = Number(f.bed.split(':')[0])
  const bedDay = bedHour >= 12 ? addDaysKey(f.date, -1) : f.date
  const bedtime = combineDayTime(bedDay, f.bed)
  const wake = combineDayTime(f.date, f.wake)
  const inBedMin = Math.max(0, (new Date(wake) - new Date(bedtime)) / 60000)
  const awake = numOrNull(f.awake) || 0
  const durationMin = Math.max(0, Math.round(inBedMin - awake))
  const stages = ['deep', 'rem', 'light'].some((k) => numOrNull(f[k]) != null)
    ? { deep: numOrNull(f.deep) || 0, rem: numOrNull(f.rem) || 0, light: numOrNull(f.light) ?? Math.max(0, durationMin - (numOrNull(f.deep) || 0) - (numOrNull(f.rem) || 0)), awake }
    : null

  function submit(e) {
    e.preventDefault()
    if (durationMin <= 0) return
    onSave({ ...(initial || {}), date: f.date, bedtime, wake, durationMin, quality: f.quality, stages, wakeUps: numOrNull(f.wakeUps), notes: f.notes.trim(), segments: initial?.segments && stages === initial?.stages ? initial.segments : undefined })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Morning of" wide>
          <input type="date" className="date-input" value={f.date} max={dayKey()} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="Went to bed">
          <input type="time" className="date-input" value={f.bed} onChange={(e) => set({ bed: e.target.value })} />
        </Field>
        <Field label="Woke up">
          <input type="time" className="date-input" value={f.wake} onChange={(e) => set({ wake: e.target.value })} />
        </Field>
      </div>
      <p className="form-summary">
        {durationMin > 0 ? (
          <>
            That is <strong>{fmtHours(durationMin)}</strong> of sleep.
          </>
        ) : (
          'Check your times: wake-up should be after bedtime.'
        )}
      </p>
      <Field label="How rested do you feel?" wide>
        <div className="feel-picker" role="radiogroup" aria-label="Sleep quality">
          {QUALITY.map((q) => (
            <button type="button" key={q.value} role="radio" aria-checked={f.quality === q.value} className={'feel' + (f.quality === q.value ? ' selected' : '')} onClick={() => set({ quality: f.quality === q.value ? null : q.value })}>
              <span aria-hidden>{q.emoji}</span>
              <small>{q.label}</small>
            </button>
          ))}
        </div>
      </Field>
      <Disclosure title="Sleep stages & details">
        <p className="muted small">If your watch or ring shows sleep stages, you can copy them here. <InfoTip term="stages" /></p>
        <div className="form-grid four">
          <Field label="Deep">
            <NumberInput value={f.deep} onChange={(v) => set({ deep: v })} unit="min" step="1" />
          </Field>
          <Field label="REM">
            <NumberInput value={f.rem} onChange={(v) => set({ rem: v })} unit="min" step="1" />
          </Field>
          <Field label="Light">
            <NumberInput value={f.light} onChange={(v) => set({ light: v })} unit="min" step="1" placeholder="Auto" />
          </Field>
          <Field label="Awake">
            <NumberInput value={f.awake} onChange={(v) => set({ awake: v })} unit="min" step="1" />
          </Field>
          <Field label="Times woken">
            <NumberInput value={f.wakeUps} onChange={(v) => set({ wakeUps: v })} step="1" />
          </Field>
          <Field label="Notes" wide>
            <input className="plain-input" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Caffeine late, noisy night, felt great…" />
          </Field>
        </div>
      </Disclosure>
      <div className="form-actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn primary" disabled={durationMin <= 0}>
          Save sleep
        </button>
      </div>
    </form>
  )
}
