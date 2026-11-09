import { useMemo, useState } from 'react'
import { MEAL_TYPES, mealTypeForNow, searchFoods } from '../../lib/foods.js'
import { dayKey } from '../../lib/date.js'
import { useHealth } from '../../store/Health.jsx'
import { Field, NumberInput, Segmented, Stepper, numOrNull } from '../Fields.jsx'
import { SearchIcon, TrashIcon } from '../Icons.jsx'

const macroLine = (f, n = 1) => `${Math.round(f.cal * n)} cal · P ${Math.round(f.p * n)}g · C ${Math.round(f.c * n)}g · F ${Math.round(f.f * n)}g`

export default function MealForm({ day = dayKey(), mealType: initialType, onDone, onCancel }) {
  const { meals, actions } = useHealth()
  const [mealType, setMealType] = useState(initialType || mealTypeForNow())
  const [mode, setMode] = useState('search')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState([])
  const [quick, setQuick] = useState({ name: '', cal: '', p: '', c: '', f: '' })

  const recent = useMemo(() => {
    const seen = new Map()
    for (let i = meals.length - 1; i >= 0 && seen.size < 8; i--) {
      const m = meals[i]
      if (!seen.has(m.name)) seen.set(m.name, { id: `recent-${m.name}`, name: m.name, serving: m.serving, cal: m.cal, p: m.p, c: m.c, f: m.f, foodId: m.foodId })
    }
    return [...seen.values()]
  }, [meals])
  const results = useMemo(() => searchFoods(q, 40), [q])

  const add = (food) =>
    setPicked((cur) => {
      const i = cur.findIndex((x) => x.food.name === food.name)
      if (i === -1) return [...cur, { food, servings: 1 }]
      return cur.map((x, j) => (j === i ? { ...x, servings: x.servings + 1 } : x))
    })
  const total = picked.reduce((s, x) => ({ cal: s.cal + x.food.cal * x.servings, p: s.p + x.food.p * x.servings, c: s.c + x.food.c * x.servings, f: s.f + x.food.f * x.servings }), { cal: 0, p: 0, c: 0, f: 0 })

  function save() {
    let items = picked.map(({ food, servings }) => ({ day, mealType, foodId: food.foodId || food.id, name: food.name, serving: food.serving, servings, cal: food.cal, p: food.p, c: food.c, f: food.f }))
    if (mode === 'quick') {
      const cal = numOrNull(quick.cal)
      if (cal == null) return
      items = [{ day, mealType, name: quick.name.trim() || 'Quick add', serving: '1 serving', servings: 1, cal, p: numOrNull(quick.p) || 0, c: numOrNull(quick.c) || 0, f: numOrNull(quick.f) || 0 }]
    }
    if (!items.length) return
    actions.addMeals(items)
    onDone?.(items)
  }

  const canSave = mode === 'quick' ? numOrNull(quick.cal) != null : picked.length > 0

  return (
    <div className="form">
      <Segmented label="Meal" value={mealType} onChange={setMealType} options={MEAL_TYPES.map((m) => ({ value: m.id, label: `${m.emoji} ${m.label}` }))} />
      <Segmented small label="Entry mode" value={mode} onChange={setMode} options={[{ value: 'search', label: 'Search foods' }, { value: 'quick', label: 'Quick add' }]} />

      {mode === 'search' ? (
        <>
          <label className="search">
            <SearchIcon width={16} height={16} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods: banana, chicken, latte…" />
          </label>
          {!q && recent.length > 0 && (
            <>
              <p className="field-label">Recent</p>
              <div className="food-list">
                {recent.map((f) => (
                  <button type="button" key={f.id} className="food-row" onClick={() => add(f)}>
                    <span>
                      <strong>{f.name}</strong>
                      <small>{f.serving}</small>
                    </span>
                    <small className="muted">{macroLine(f)}</small>
                    <span className="food-add" aria-hidden>+</span>
                  </button>
                ))}
              </div>
              <p className="field-label">All foods</p>
            </>
          )}
          <div className="food-list scroll">
            {results.map((f) => (
              <button type="button" key={f.id} className="food-row" onClick={() => add(f)}>
                <span>
                  <strong>{f.name}</strong>
                  <small>{f.serving}</small>
                </span>
                <small className="muted">{macroLine(f)}</small>
                <span className="food-add" aria-hidden>+</span>
              </button>
            ))}
            {!results.length && (
              <p className="muted small pad">
                No match. Try another word, or use <button type="button" className="link-btn" onClick={() => { setMode('quick'); setQuick((x) => ({ ...x, name: q })) }}>Quick add</button>.
              </p>
            )}
          </div>
          {picked.length > 0 && (
            <div className="picked">
              <p className="field-label">Adding to {MEAL_TYPES.find((m) => m.id === mealType).label.toLowerCase()}</p>
              {picked.map((x, i) => (
                <div className="picked-row" key={x.food.name}>
                  <span>
                    <strong>{x.food.name}</strong>
                    <small className="muted">{macroLine(x.food, x.servings)}</small>
                  </span>
                  <Stepper value={x.servings} step={0.5} min={0.5} label="Servings" onChange={(v) => setPicked((cur) => cur.map((y, j) => (j === i ? { ...y, servings: v } : y)))} />
                  <button type="button" className="icon-btn" aria-label={`Remove ${x.food.name}`} onClick={() => setPicked((cur) => cur.filter((_, j) => j !== i))}>
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>
              ))}
              <p className="picked-total">Total: {macroLine(total)}</p>
            </div>
          )}
        </>
      ) : (
        <div className="form-grid">
          <Field label="What did you eat?" wide>
            <input autoFocus className="plain-input" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} placeholder="e.g. Homemade lasagna" />
          </Field>
          <Field label="Calories">
            <NumberInput value={quick.cal} onChange={(v) => setQuick({ ...quick, cal: v })} unit="cal" step="1" />
          </Field>
          <Field label="Protein">
            <NumberInput value={quick.p} onChange={(v) => setQuick({ ...quick, p: v })} unit="g" placeholder="Optional" />
          </Field>
          <Field label="Carbs">
            <NumberInput value={quick.c} onChange={(v) => setQuick({ ...quick, c: v })} unit="g" placeholder="Optional" />
          </Field>
          <Field label="Fat">
            <NumberInput value={quick.f} onChange={(v) => setQuick({ ...quick, f: v })} unit="g" placeholder="Optional" />
          </Field>
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="btn primary" disabled={!canSave} onClick={save}>
          {mode === 'quick' || picked.length <= 1 ? 'Add food' : `Add ${picked.length} foods`}
        </button>
      </div>
    </div>
  )
}
