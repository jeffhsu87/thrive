import { useState } from 'react'
import { dayKey } from '../../lib/date.js'
import { kgTo, toKg, weightUnit } from '../../lib/units.js'
import { useHealth } from '../../store/Health.jsx'
import { Disclosure, Field, NumberInput, numOrNull } from '../Fields.jsx'
import InfoTip from '../InfoTip.jsx'

/** Manual body & health check-in: weight, steps, resting HR, HRV. */
export default function CheckInForm({ onDone, onCancel }) {
  const { profile, setProfile, daily, actions } = useHealth()
  const u = profile.units
  const [day, setDay] = useState(dayKey())
  const existing = daily.find((r) => r.day === day && r.source === 'manual') || {}
  const [f, setF] = useState(() => ({
    weight: existing.weightKg != null ? Math.round(kgTo(existing.weightKg, u) * 10) / 10 : '',
    bodyFat: existing.bodyFat ?? '',
    steps: existing.steps ?? '',
    rhr: existing.rhr ?? '',
    hrv: existing.hrv ?? '',
  }))
  const set = (p) => setF((c) => ({ ...c, ...p }))

  function submit(e) {
    e.preventDefault()
    const patch = {
      weightKg: numOrNull(f.weight) != null ? Math.round(toKg(Number(f.weight), u) * 10) / 10 : null,
      bodyFat: numOrNull(f.bodyFat),
      steps: numOrNull(f.steps),
      rhr: numOrNull(f.rhr),
      hrv: numOrNull(f.hrv),
    }
    if (Object.values(patch).every((v) => v == null)) return
    actions.upsertDaily(day, patch)
    if (patch.weightKg && day === dayKey()) setProfile({ weightKg: patch.weightKg })
    onDone?.(patch)
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Date" wide>
          <input type="date" className="date-input" value={day} max={dayKey()} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Weight">
          <NumberInput autoFocus value={f.weight} onChange={(v) => set({ weight: v })} unit={weightUnit(u)} />
        </Field>
        <Field label="Steps" info={<InfoTip term="steps" />}>
          <NumberInput value={f.steps} onChange={(v) => set({ steps: v })} step="1" placeholder="From your phone" />
        </Field>
      </div>
      <Disclosure title="Body fat, resting heart rate & HRV">
        <div className="form-grid">
          <Field label="Body fat">
            <NumberInput value={f.bodyFat} onChange={(v) => set({ bodyFat: v })} unit="%" />
          </Field>
          <Field label="Resting heart rate" info={<InfoTip term="rhr" />}>
            <NumberInput value={f.rhr} onChange={(v) => set({ rhr: v })} unit="bpm" step="1" />
          </Field>
          <Field label="HRV" info={<InfoTip term="hrv" />}>
            <NumberInput value={f.hrv} onChange={(v) => set({ hrv: v })} unit="ms" step="1" />
          </Field>
        </div>
      </Disclosure>
      <div className="form-actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn primary">Save check-in</button>
      </div>
    </form>
  )
}
