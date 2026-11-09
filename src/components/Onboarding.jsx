import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHealth } from '../store/Health.jsx'
import { EXPERIENCE, FOCUS_OPTIONS, normalizeProfile, suggestTargets } from '../lib/profile.js'
import { Field, NumberInput, Segmented, numOrNull } from './Fields.jsx'
import { toKg, weightUnit } from '../lib/units.js'

/** Friendly first-run setup. Every step can be skipped. */
export default function Onboarding() {
  const { profile, setProfile, actions } = useHealth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [p, setP] = useState(() => ({ ...profile, heightCm: profile.heightCm ?? '', weightKg: '', birthYear: profile.birthYear ?? '' }))
  const set = (patch) => setP((c) => ({ ...c, ...patch }))

  function finish(start) {
    const clean = normalizeProfile({
      ...p,
      heightCm: numOrNull(p.heightCm),
      birthYear: numOrNull(p.birthYear),
      weightKg: numOrNull(p.weightKg) != null ? Math.round(toKg(Number(p.weightKg), p.units) * 10) / 10 : profile.weightKg,
    })
    setProfile({ ...clean, targets: suggestTargets(clean), onboarded: true })
    if (start === 'sample') actions.loadSampleData()
    navigate(start === 'devices' ? '/devices' : start === 'workout' ? '/activity' : '/today')
  }

  const steps = [
    <div key="hi" className="stack center-text">
      <div className="onboard-hero" aria-hidden>🌱</div>
      <h1>Welcome to Thrive</h1>
      <p className="muted">One calm place for your workouts, sleep, recovery, food, habits and journal. It takes about a minute to set up.</p>
      <Field label="What should we call you?">
        <input className="plain-input big" autoFocus value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your first name" onKeyDown={(e) => e.key === 'Enter' && setStep(1)} />
      </Field>
    </div>,
    <div key="you" className="stack">
      <h2>A little about you</h2>
      <p className="muted small">This makes calorie estimates and heart rate zones more accurate. Skip anything you like.</p>
      <Field label="Units">
        <Segmented value={p.units} onChange={(v) => set({ units: v })} options={[{ value: 'metric', label: 'Metric (kg, km)' }, { value: 'imperial', label: 'Imperial (lb, mi)' }]} />
      </Field>
      <div className="form-grid">
        <Field label="Year of birth"><NumberInput value={p.birthYear} onChange={(v) => set({ birthYear: v })} step="1" placeholder="e.g. 1990" /></Field>
        <Field label="Sex">
          <select className="select" value={p.sex} onChange={(e) => set({ sex: e.target.value })}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field label="Height (cm)" hint={p.units === 'imperial' ? 'You can enter feet and inches later in Settings' : ''}><NumberInput value={p.heightCm} onChange={(v) => set({ heightCm: v })} unit="cm" step="1" /></Field>
        <Field label="Weight"><NumberInput value={p.weightKg} onChange={(v) => set({ weightKg: v })} unit={weightUnit(p.units)} /></Field>
      </div>
    </div>,
    <div key="exp" className="stack">
      <h2>Where are you starting from?</h2>
      <p className="muted small">There is no wrong answer. Thrive adjusts how much detail it shows.</p>
      <div className="choice-grid">
        {EXPERIENCE.map((x) => (
          <button key={x.id} type="button" className={'choice' + (p.experience === x.id ? ' selected' : '')} aria-pressed={p.experience === x.id} onClick={() => set({ experience: x.id })}>
            <span aria-hidden>{x.emoji}</span>
            <strong>{x.label}</strong>
            <small>{x.desc}</small>
          </button>
        ))}
      </div>
    </div>,
    <div key="focus" className="stack">
      <h2>What would you like to work on?</h2>
      <p className="muted small">Pick as many as you like.</p>
      <div className="habit-chips">
        {FOCUS_OPTIONS.map((f) => {
          const on = p.focus.includes(f.id)
          return (
            <button key={f.id} type="button" className={'habit-chip big' + (on ? ' on' : '')} aria-pressed={on} onClick={() => set({ focus: on ? p.focus.filter((x) => x !== f.id) : [...p.focus, f.id] })}>
              <span aria-hidden>{f.emoji}</span> {f.label}
            </button>
          )
        })}
      </div>
    </div>,
    <div key="start" className="stack">
      <h2>How would you like to start{p.name ? `, ${p.name}` : ''}?</h2>
      <div className="choice-grid">
        <button className="choice" onClick={() => finish('devices')}>
          <span aria-hidden>⌚</span>
          <strong>Connect a device</strong>
          <small>WHOOP, Apple Watch, Garmin, Oura, Fitbit, Polar and more, or import files.</small>
        </button>
        <button className="choice" onClick={() => finish('sample')}>
          <span aria-hidden>🧪</span>
          <strong>Explore with sample data</strong>
          <small>See everything filled in. You can remove the sample data any time in Settings.</small>
        </button>
        <button className="choice" onClick={() => finish('fresh')}>
          <span aria-hidden>✨</span>
          <strong>Start fresh</strong>
          <small>Log things by hand as you go.</small>
        </button>
      </div>
    </div>,
  ]
  const last = step === steps.length - 1

  return (
    <div className="onboard-backdrop">
      <div className="onboard card" role="dialog" aria-modal="true" aria-label="Set up Thrive">
        <div className="onboard-dots" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        {steps[step]}
        <div className="form-actions">
          {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button> : <button className="btn ghost" onClick={() => finish('fresh')}>Skip setup</button>}
          {!last && <button className="btn primary" onClick={() => setStep(step + 1)}>Continue</button>}
        </div>
      </div>
    </div>
  )
}
