import { useState } from 'react'
import PageHeader, { Empty } from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { Meter } from '../components/Charts.jsx'
import { Field, NumberInput, numOrNull } from '../components/Fields.jsx'
import { RecCard } from '../components/Bits.jsx'
import { PencilIcon, TrashIcon } from '../components/Icons.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { GOAL_TEMPLATES, GOAL_TYPES, STATUS_TEXT, targetFromDisplay, targetToDisplay, unitLabel } from '../lib/goals.js'
import { allSports, sportFor } from '../lib/sports.js'
import { shortDate } from '../lib/date.js'

function GoalEditor({ initial, onSave, onCancel }) {
  const { profile, index } = useHealth()
  const u = profile.units
  const [type, setType] = useState(initial?.type || null)
  const [title, setTitle] = useState(initial?.title || '')
  const [target, setTarget] = useState(initial ? targetToDisplay(initial, u) : '')
  const [sport, setSport] = useState(initial?.sport || '')
  const [deadline, setDeadline] = useState(initial?.deadline || '')

  if (!type)
    return (
      <div className="stack">
        <p className="field-label">Popular goals</p>
        <div className="template-grid">
          {GOAL_TEMPLATES.map((t) => (
            <button
              key={t.title}
              className="template"
              onClick={() => {
                setType(t.type)
                setTitle(t.title)
                setTarget(targetToDisplay({ type: t.type, target: t.target }, u))
                setSport(t.sport || '')
              }}
            >
              <span aria-hidden>{GOAL_TYPES[t.type].emoji}</span> {t.title}
            </button>
          ))}
        </div>
        <p className="field-label">Or build your own</p>
        <div className="template-grid">
          {Object.entries(GOAL_TYPES).map(([id, d]) => (
            <button key={id} className="template subtle" onClick={() => { setType(id); setTarget(targetToDisplay({ type: id, target: id === 'weight_target' && profile.weightKg ? Math.round(profile.weightKg - 3) : d.def }, u)) }}>
              <span aria-hidden>{d.emoji}</span> {d.label}
            </button>
          ))}
        </div>
      </div>
    )

  const def = GOAL_TYPES[type]
  function submit(e) {
    e.preventDefault()
    const t = numOrNull(target)
    if (!t || t <= 0) return
    let startValue = initial?.startValue
    if (type === 'weight_target' && startValue == null) {
      for (const d of [...index.days.values()].sort((a, b) => b.key.localeCompare(a.key))) if (d.weightKg != null) { startValue = d.weightKg; break }
      startValue = startValue ?? profile.weightKg ?? null
    }
    onSave({ type, title: title.trim() || def.label, target: targetFromDisplay(type, t, u), sport: def.sportFilter ? sport || null : null, deadline: deadline || null, startValue, count: initial?.count || 0 })
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="goal-type">{def.emoji} {def.label} <button type="button" className="link-btn" onClick={() => setType(null)}>Change</button></p>
      <p className="muted small">{def.hint}</p>
      <div className="form-grid">
        <Field label="Name your goal" wide>
          <input className="plain-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={def.label} autoFocus />
        </Field>
        <Field label="Target">
          <NumberInput value={target} onChange={setTarget} unit={unitLabel(type, u)} />
        </Field>
        {def.sportFilter && (
          <Field label="Activity">
            <select className="select" value={sport} onChange={(e) => setSport(e.target.value)}>
              <option value="">Any activity</option>
              {allSports().filter((s) => s.fields.includes('distance') || s.fields.includes('swim')).map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          </Field>
        )}
        {(def.period === 'target' || def.period === 'once' || def.period === 'count') && (
          <Field label="Target date (optional)">
            <input type="date" className="date-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" type="submit" disabled={!numOrNull(target)}>{initial ? 'Save goal' : 'Add goal'}</button>
      </div>
    </form>
  )
}

export default function Goals() {
  const { goalsProgress, recs, actions } = useHealth()
  const { notify } = useFeedback()
  const [editing, setEditing] = useState(null)

  function save(g) {
    if (editing === 'new') {
      actions.addGoal(g)
      notify(`🎯 Goal set: ${g.title}. You’ve got this!`)
    } else {
      actions.updateGoal(editing.id, g)
      notify('Goal updated')
    }
    setEditing(null)
  }

  return (
    <section className="page">
      <PageHeader eyebrow="Plan" title="Goals & coach" actions={<button className="btn primary" onClick={() => setEditing('new')}>+ New goal</button>}>
        Small, specific goals are the ones that stick. Your coach adapts to how you are doing.
      </PageHeader>

      {goalsProgress.length === 0 ? (
        <Empty title="No goals yet" action={<button className="btn primary" onClick={() => setEditing('new')}>Choose a goal</button>}>
          Start with one goal you are confident you can hit this week. You can always raise the bar later.
        </Empty>
      ) : (
        <div className="goal-grid">
          {goalsProgress.map((g) => (
            <article key={g.goal.id} className={`card goal-card ${g.status}`}>
              <header className="row between">
                <h3>{g.def.emoji} {g.goal.title}</h3>
                <span className="row">
                  <button className="icon-btn" aria-label="Edit goal" onClick={() => setEditing(g.goal)}><PencilIcon width={16} height={16} /></button>
                  <button
                    className="icon-btn"
                    aria-label="Delete goal"
                    onClick={() => {
                      actions.removeGoal(g.goal.id)
                      notify('Goal removed', { action: () => actions.addGoal(g.goal) })
                    }}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </span>
              </header>
              <p className="goal-numbers">
                <strong>{g.currentText}</strong> <span className="muted">of {g.targetText}{g.periodLabel ? ` ${g.periodLabel}` : ''}</span>
              </p>
              <Meter value={g.pct} max={1} color={g.done ? 'var(--status-good)' : 'var(--accent)'} label={`${g.goal.title}: ${Math.round(g.pct * 100)}%`} />
              <p className="row between small">
                <span className={`goal-status ${g.status}`}>{g.done ? '✓ ' : g.status === 'behind' ? '! ' : ''}{STATUS_TEXT[g.status]}</span>
                <span className="muted">{g.note}</span>
              </p>
              {g.goal.sport && <p className="muted small">{sportFor(g.goal.sport).emoji} {sportFor(g.goal.sport).name} only</p>}
              {g.goal.deadline && <p className="muted small">Target date: {shortDate(`${g.goal.deadline}T12:00`)}</p>}
              {g.history?.length > 0 && (
                <div className="hit-row" aria-label="Recent history">
                  {g.history.map((h, i) => (
                    <span key={i} className={'hit' + (h.hit ? ' on' : h.value == null ? ' empty' : '')} title={`${shortDate(h.label)}: ${h.hit ? 'goal hit' : 'not hit'}`} aria-label={`${shortDate(h.label)}: ${h.hit ? 'hit' : 'not hit'}`}>
                      {h.hit ? '✓' : ''}
                    </span>
                  ))}
                  {g.streak > 1 && <span className="small">🔥 {g.streak} in a row</span>}
                </div>
              )}
              {g.manual && !g.done && (
                <button className="btn ghost small" onClick={() => actions.updateGoal(g.goal.id, { count: (g.goal.count || 0) + 1 })}>+1</button>
              )}
            </article>
          ))}
        </div>
      )}

      <h2 className="section-title">Your coach suggests</h2>
      <div className="rec-grid">
        {recs.map((r) => <RecCard key={r.id} rec={r} />)}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New goal' : 'Edit goal'} wide>
        {editing && <GoalEditor initial={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Modal>
    </section>
  )
}
