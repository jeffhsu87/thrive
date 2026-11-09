import { useMemo, useState } from 'react'
import { CATEGORIES, CUSTOM_FIELDS, EXERCISES, FEELS, INTENSITIES, POPULAR, SPORTS, allSports, sportFor } from '../../lib/sports.js'
import { combineDayTime, dayKey, timeOfDay } from '../../lib/date.js'
import { estimateCalories } from '../../lib/metrics.js'
import { distUnit, elevUnit, kgTo, kmTo, mTo, toKg, toKm, toM, weightUnit } from '../../lib/units.js'
import { useHealth } from '../../store/Health.jsx'
import { Disclosure, Field, NumberInput, Segmented, numOrNull } from '../Fields.jsx'
import InfoTip from '../InfoTip.jsx'
import { SearchIcon, TrashIcon, XIcon } from '../Icons.jsx'

const EMOJI_CHOICES = ['⭐', '🏃', '🚴', '🏊', '🏋️', '🧗', '🏄', '⛷️', '🥊', '🏓', '🎯', '🏹', '🛶', '🤸', '⚽', '🏐', '🥏', '🛼', '🐎', '🎾', '🏌️', '🤾', '🪂', '🏇']

/** Create a sport that is not in the catalog, with its own optional metrics. */
export function CustomSportForm({ initialName = '', onSave, onCancel }) {
  const [f, setF] = useState({ name: initialName, emoji: '⭐', cat: 'other', intensity: 'moderate', fields: [], pace: '', metrics: [{ label: '', unit: '' }] })
  const set = (p) => setF((c) => ({ ...c, ...p }))
  const toggle = (id) => set({ fields: f.fields.includes(id) ? f.fields.filter((x) => x !== id) : [...f.fields, id] })
  function submit(e) {
    e.preventDefault()
    if (!f.name.trim()) return
    const metrics = f.metrics
      .filter((m) => m.label.trim())
      .slice(0, 4)
      .map((m, i) => ({ key: `m${i}_${m.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)}`, label: m.label.trim(), unit: m.unit.trim() }))
    onSave({
      name: f.name.trim(),
      emoji: f.emoji,
      cat: f.cat,
      met: INTENSITIES.find((x) => x.id === f.intensity).met,
      fields: f.fields,
      pace: f.fields.includes('distance') ? f.pace || 'speed' : null,
      metrics,
    })
  }
  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Sport name" wide>
          <input className="plain-input" autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Spikeball, Roller derby, Kitesurfing" />
        </Field>
        <Field label="Icon">
          <select className="select" value={f.emoji} onChange={(e) => set({ emoji: e.target.value })}>
            {EMOJI_CHOICES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="select" value={f.cat} onChange={(e) => set({ cat: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Usual intensity" wide hint="Used to estimate calories and strain when there is no heart rate.">
          <Segmented small value={f.intensity} onChange={(v) => set({ intensity: v })} options={INTENSITIES.map((x) => ({ value: x.id, label: x.label }))} />
        </Field>
        <Field label="What to track" wide>
          <span className="chips">
            {CUSTOM_FIELDS.map((x) => (
              <button type="button" key={x.id} className={'chip small text' + (f.fields.includes(x.id) ? ' active' : '')} aria-pressed={f.fields.includes(x.id)} onClick={() => toggle(x.id)}>
                {x.label}
              </button>
            ))}
          </span>
        </Field>
        {f.fields.includes('distance') && (
          <Field label="Show speed as" wide>
            <Segmented small value={f.pace || 'speed'} onChange={(v) => set({ pace: v })} options={[{ value: 'speed', label: 'Speed (km/h)' }, { value: 'pace', label: 'Pace (min/km)' }]} />
          </Field>
        )}
      </div>
      <div className="sets">
        <p className="field-label">Your own metrics (optional)</p>
        <p className="muted small">Anything you want to count: waves caught, jumps landed, holes played, laps…</p>
        {f.metrics.map((m, i) => (
          <div className="set-row two" key={i}>
            <input className="plain-input" value={m.label} onChange={(e) => set({ metrics: f.metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Metric name" aria-label="Metric name" />
            <input className="plain-input" value={m.unit} onChange={(e) => set({ metrics: f.metrics.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)) })} placeholder="Unit (optional)" aria-label="Unit" />
          </div>
        ))}
        {f.metrics.length < 4 && (
          <button type="button" className="btn ghost small" onClick={() => set({ metrics: [...f.metrics, { label: '', unit: '' }] })}>+ Add metric</button>
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Back</button>
        <button type="submit" className="btn primary" disabled={!f.name.trim()}>Create sport</button>
      </div>
    </form>
  )
}

export function SportPicker({ onPick }) {
  const { actions, customSports: saved } = useHealth()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const mine = useMemo(() => allSports().filter((sp) => sp.custom), [saved]) // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? allSports().filter((sp) => sp.name.toLowerCase().includes(s) || sp.cat.includes(s)) : null
  }, [q, saved]) // eslint-disable-line react-hooks/exhaustive-deps

  if (creating)
    return (
      <CustomSportForm
        initialName={q}
        onCancel={() => setCreating(false)}
        onSave={(sp) => {
          const rec = actions.addCustomSport(sp)
          setCreating(false)
          onPick(rec.id)
        }}
      />
    )
  const Tile = ({ sp }) => (
    <button type="button" className="sport-tile" onClick={() => onPick(sp.id)}>
      <span className="sport-emoji" aria-hidden>{sp.emoji}</span>
      <span>{sp.name}</span>
    </button>
  )
  return (
    <div className="sport-picker">
      <label className="search">
        <SearchIcon width={16} height={16} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 70 activities: tennis, rowing, dance…" />
      </label>
      {results ? (
        <div className="sport-grid">
          {results.map((sp) => <Tile key={sp.id} sp={sp} />)}
          <button type="button" className="sport-tile create" onClick={() => setCreating(true)}>
            <span className="sport-emoji">＋</span>
            <span>Create “{q.trim()}”</span>
          </button>
          {!results.length && (
            <button type="button" className="sport-tile" onClick={() => onPick('other')}>
              <span className="sport-emoji">✨</span>
              <span>Log as “Other activity”</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <p className="field-label">Your sports</p>
              <div className="sport-grid">{mine.map((sp) => <Tile key={sp.id} sp={sp} />)}</div>
            </>
          )}
          <p className="field-label">Popular</p>
          <div className="sport-grid">
            {POPULAR.map((id) => <Tile key={id} sp={sportFor(id)} />)}
            <button type="button" className="sport-tile create" onClick={() => setCreating(true)}>
              <span className="sport-emoji">＋</span>
              <span>Create your own sport</span>
            </button>
          </div>
          {CATEGORIES.map((c) => (
            <Disclosure key={c.id} title={c.label}>
              <div className="sport-grid">
                {SPORTS.filter((sp) => sp.cat === c.id).map((sp) => <Tile key={sp.id} sp={sp} />)}
              </div>
            </Disclosure>
          ))}
        </>
      )}
    </div>
  )
}

const toForm = (a, u) => ({
  sport: a?.sport || null,
  day: a ? dayKey(a.start) : dayKey(),
  time: a ? timeOfDay(a.start) : timeOfDay(new Date(Date.now() - 45 * 60000)),
  hours: a ? Math.floor(a.durationMin / 60) : 0,
  minutes: a ? Math.round(a.durationMin % 60) : 30,
  distance: a?.distanceKm != null ? Math.round(kmTo(a.distanceKm, u) * 100) / 100 : '',
  elevation: a?.elevationM != null ? Math.round(mTo(a.elevationM, u)) : '',
  avgHr: a?.avgHr ?? '',
  maxHr: a?.maxHr ?? '',
  calories: a?.calories ?? '',
  avgPower: a?.avgPower ?? '',
  cadence: a?.cadence ?? '',
  rpe: a?.rpe ?? null,
  notes: a?.notes || '',
  title: a?.title || '',
  sets: (a?.sets || []).map((s) => ({ ...s, weight: s.weightKg != null ? Math.round(kgTo(s.weightKg, u) * 10) / 10 : '' })),
  rounds: a?.rounds ?? '',
  result: a?.score?.result || '',
  scoreText: a?.score?.text || '',
  poolM: a?.poolM ?? 25,
  laps: a?.laps ?? '',
  floors: a?.floors ?? '',
  incline: a?.incline ?? '',
  extra: { ...(a?.extra || {}) },
})

export default function WorkoutForm({ initial, presetSport, onSave, onCancel, submitLabel = 'Save workout' }) {
  const { profile } = useHealth()
  const u = profile.units
  const [f, setF] = useState(() => ({ ...toForm(initial, u), ...(presetSport ? { sport: presetSport } : {}) }))
  const set = (patch) => setF((cur) => ({ ...cur, ...patch }))
  const advanced = profile.showAdvanced || profile.experience === 'advanced'

  if (!f.sport) return <SportPicker onPick={(sport) => set({ sport })} />

  const sp = sportFor(f.sport)
  const has = (x) => sp.fields.includes(x)
  const durationMin = (Number(f.hours) || 0) * 60 + (Number(f.minutes) || 0)
  const swimKm = has('swim') && numOrNull(f.laps) ? (Number(f.laps) * Number(f.poolM || 25)) / 1000 : null

  function build() {
    const a = {
      ...(initial || {}),
      sport: f.sport,
      start: combineDayTime(f.day, f.time),
      durationMin,
      distanceKm: swimKm ?? (numOrNull(f.distance) != null ? Math.round(toKm(Number(f.distance), u) * 1000) / 1000 : null),
      elevationM: numOrNull(f.elevation) != null ? Math.round(toM(Number(f.elevation), u)) : null,
      avgHr: numOrNull(f.avgHr),
      maxHr: numOrNull(f.maxHr),
      avgPower: numOrNull(f.avgPower),
      cadence: numOrNull(f.cadence),
      rpe: f.rpe,
      notes: f.notes.trim(),
      title: f.title.trim() || null,
    }
    if (has('swim')) Object.assign(a, { poolM: Number(f.poolM) || 25, laps: numOrNull(f.laps) })
    if (has('sets')) a.sets = f.sets.filter((s) => s.exercise.trim()).map(({ weight, ...s }) => ({ ...s, weightKg: numOrNull(weight) != null ? toKg(Number(weight), u) : null }))
    if (has('rounds')) a.rounds = numOrNull(f.rounds)
    if (has('score')) a.score = f.result || f.scoreText ? { result: f.result || null, text: f.scoreText.trim() } : null
    if (has('floors')) a.floors = numOrNull(f.floors)
    if (has('incline')) a.incline = numOrNull(f.incline)
    if (sp.metrics?.length) {
      const extra = Object.fromEntries(sp.metrics.map((m) => [m.key, numOrNull(f.extra[m.key])]).filter(([, v]) => v != null))
      a.extra = Object.keys(extra).length ? extra : null
    }
    // Strip stored estimates so they are recalculated from the edited values.
    a.calories = numOrNull(f.calories)
    if (initial && initial.strain != null && initial.source === 'manual') delete a.strain
    return a
  }

  const estimate = estimateCalories(build(), profile)
  function submit(e) {
    e.preventDefault()
    if (durationMin <= 0) return
    onSave(build())
  }

  const updateSet = (i, patch) => set({ sets: f.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-sport">
        <span className="sport-emoji big" aria-hidden>{sp.emoji}</span>
        <div>
          <strong>{sp.name}</strong>
          {!initial && (
            <button type="button" className="link-btn" onClick={() => set({ sport: null })}>
              Change activity
            </button>
          )}
        </div>
      </div>

      <div className="form-grid">
        <Field label="Date">
          <input type="date" className="date-input" value={f.day} max={dayKey()} onChange={(e) => set({ day: e.target.value })} />
        </Field>
        <Field label="Start time">
          <input type="time" className="date-input" value={f.time} onChange={(e) => set({ time: e.target.value })} />
        </Field>
        <Field label="Duration" wide>
          <span className="duration-input">
            <NumberInput value={f.hours} onChange={(v) => set({ hours: v })} unit="h" step="1" aria-label="Hours" />
            <NumberInput value={f.minutes} onChange={(v) => set({ minutes: v })} unit="min" step="1" aria-label="Minutes" />
          </span>
          <span className="chips">
            {[15, 30, 45, 60, 90].map((m) => (
              <button type="button" key={m} className={'chip small' + (durationMin === m ? ' active' : '')} onClick={() => set({ hours: Math.floor(m / 60), minutes: m % 60 })}>
                {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ' 30' : ''}`}
              </button>
            ))}
          </span>
        </Field>

        {has('distance') && (
          <Field label="Distance">
            <NumberInput value={f.distance} onChange={(v) => set({ distance: v })} unit={distUnit(u)} placeholder="Optional" />
          </Field>
        )}
        {has('swim') && (
          <>
            <Field label="Pool length">
              <Segmented small value={Number(f.poolM)} onChange={(v) => set({ poolM: v })} options={[{ value: 25, label: '25 m' }, { value: 50, label: '50 m' }, { value: 22.86, label: '25 yd' }]} />
            </Field>
            <Field label="Lengths" hint={swimKm ? `${Math.round(swimKm * 1000)} m total` : ''}>
              <NumberInput value={f.laps} onChange={(v) => set({ laps: v })} step="1" placeholder="e.g. 40" />
            </Field>
          </>
        )}
        {has('elevation') && (
          <Field label="Elevation gain">
            <NumberInput value={f.elevation} onChange={(v) => set({ elevation: v })} unit={elevUnit(u)} placeholder="Optional" />
          </Field>
        )}
        {has('floors') && (
          <Field label="Floors climbed">
            <NumberInput value={f.floors} onChange={(v) => set({ floors: v })} step="1" />
          </Field>
        )}
        {has('incline') && (
          <Field label="Incline">
            <NumberInput value={f.incline} onChange={(v) => set({ incline: v })} unit="%" />
          </Field>
        )}
        {has('rounds') && (
          <Field label="Rounds">
            <NumberInput value={f.rounds} onChange={(v) => set({ rounds: v })} step="1" placeholder="Optional" />
          </Field>
        )}
        {has('score') && (
          <>
            <Field label="Result">
              <Segmented small value={f.result} onChange={(v) => set({ result: f.result === v ? '' : v })} options={[{ value: 'win', label: 'Win' }, { value: 'draw', label: 'Draw' }, { value: 'loss', label: 'Loss' }, { value: 'practice', label: 'Practice' }]} />
            </Field>
            <Field label="Score">
              <input className="plain-input" value={f.scoreText} onChange={(e) => set({ scoreText: e.target.value })} placeholder="e.g. 6-4, 6-3" />
            </Field>
          </>
        )}

        {sp.metrics?.map((m) => (
          <Field key={m.key} label={m.label}>
            <NumberInput value={f.extra[m.key] ?? ''} onChange={(v) => set({ extra: { ...f.extra, [m.key]: v } })} unit={m.unit || undefined} placeholder="Optional" />
          </Field>
        ))}

        <Field label="How did it feel?" wide info={<InfoTip term="rpe" />}>
          <div className="feel-picker" role="radiogroup" aria-label="Effort">
            {FEELS.map((x) => (
              <button type="button" key={x.value} role="radio" aria-checked={f.rpe === x.value} className={'feel' + (f.rpe === x.value ? ' selected' : '')} onClick={() => set({ rpe: f.rpe === x.value ? null : x.value })}>
                <span aria-hidden>{x.emoji}</span>
                <small>{x.label}</small>
              </button>
            ))}
          </div>
        </Field>
      </div>

      {has('sets') && (
        <div className="sets">
          <p className="field-label">Exercises</p>
          <datalist id="exercise-list">{EXERCISES.map((x) => <option key={x} value={x} />)}</datalist>
          {f.sets.map((s, i) => (
            <div className="set-row" key={i}>
              <input className="plain-input" list="exercise-list" value={s.exercise} onChange={(e) => updateSet(i, { exercise: e.target.value })} placeholder="Exercise" aria-label="Exercise" />
              <NumberInput value={s.sets} onChange={(v) => updateSet(i, { sets: numOrNull(v) })} unit="sets" step="1" aria-label="Sets" />
              <NumberInput value={s.reps} onChange={(v) => updateSet(i, { reps: numOrNull(v) })} unit="reps" step="1" aria-label="Reps" />
              <NumberInput value={s.weight} onChange={(v) => updateSet(i, { weight: v })} unit={weightUnit(u)} aria-label="Weight" />
              <button type="button" className="icon-btn" onClick={() => set({ sets: f.sets.filter((_, j) => j !== i) })} aria-label="Remove exercise">
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          ))}
          <button type="button" className="btn ghost small" onClick={() => set({ sets: [...f.sets, { exercise: '', sets: 3, reps: 10, weight: '' }] })}>
            + Add exercise
          </button>
        </div>
      )}

      <Disclosure title="Heart rate, calories & more" defaultOpen={advanced && !!initial}>
        <div className="form-grid">
          <Field label="Avg heart rate" info={<InfoTip term="zones" />}>
            <NumberInput value={f.avgHr} onChange={(v) => set({ avgHr: v })} unit="bpm" step="1" />
          </Field>
          <Field label="Max heart rate">
            <NumberInput value={f.maxHr} onChange={(v) => set({ maxHr: v })} unit="bpm" step="1" />
          </Field>
          <Field label="Calories" hint={!f.calories ? `Estimated: ${estimate} cal` : ''} info={<InfoTip term="calories" />}>
            <NumberInput value={f.calories} onChange={(v) => set({ calories: v })} unit="cal" step="1" placeholder={String(estimate)} />
          </Field>
          {has('power') && (
            <Field label="Avg power" info={<InfoTip term="power" />}>
              <NumberInput value={f.avgPower} onChange={(v) => set({ avgPower: v })} unit="W" step="1" />
            </Field>
          )}
          {has('cadence') && (
            <Field label="Avg cadence" info={<InfoTip term="cadence" />}>
              <NumberInput value={f.cadence} onChange={(v) => set({ cadence: v })} unit={sp.cadenceUnit || 'spm'} step="1" />
            </Field>
          )}
          <Field label="Title" wide>
            <input className="plain-input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={`e.g. Morning ${sp.name.toLowerCase()}`} />
          </Field>
          <Field label="Notes" wide>
            <textarea className="plain-input" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="How it went, the route, who you trained with…" />
          </Field>
        </div>
      </Disclosure>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn primary" disabled={durationMin <= 0}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

export function RemoveChip({ label, onRemove }) {
  return (
    <span className="tag">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`}>
        <XIcon width={12} height={12} />
      </button>
    </span>
  )
}
