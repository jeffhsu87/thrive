import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { Field, NumberInput, Segmented, numOrNull } from '../components/Fields.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { DownloadIcon, UploadIcon } from '../components/Icons.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { EXPERIENCE, FOCUS_OPTIONS, suggestTargets } from '../lib/profile.js'
import { ZONES, maxHrOf, zoneRange } from '../lib/metrics.js'
import { kgTo, mlTo, toKg, toMl, weightUnit, waterUnit, isImperial } from '../lib/units.js'

const cmToFtIn = (cm) => {
  const inches = cm / 2.54
  return [Math.floor(inches / 12), Math.round(inches % 12)]
}

export default function Settings() {
  const { profile, setProfile, actions, devices } = useHealth()
  const { notify } = useFeedback()
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef(null)
  const u = profile.units
  const t = profile.targets
  const setT = (patch) => setProfile({ targets: patch })
  const setR = (patch) => setProfile({ reminders: patch })
  const hasSample = Object.values(devices).some((d) => d.demo)

  async function enableNotifications(patch) {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
    setR(patch)
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(actions.exportAll(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `thrive-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  async function importData(file) {
    try {
      actions.importBackup(JSON.parse(await file.text()))
      notify('Backup restored')
    } catch (e) {
      notify(e.message || 'That file could not be restored.')
    }
  }

  const [ft, inch] = profile.heightCm ? cmToFtIn(profile.heightCm) : ['', '']

  return (
    <section className="page narrow">
      <PageHeader eyebrow="Setup" title="Settings">Everything here is saved on this device only.</PageHeader>

      <section className="card pad stack">
        <h3>About you</h3>
        <p className="muted small">Used to personalise calorie estimates, heart rate zones and targets. All optional.</p>
        <div className="form-grid">
          <Field label="Name">
            <input className="plain-input" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="What should we call you?" />
          </Field>
          <Field label="Year of birth">
            <NumberInput value={profile.birthYear ?? ''} onChange={(v) => setProfile({ birthYear: numOrNull(v) })} step="1" min={1900} placeholder="e.g. 1990" />
          </Field>
          <Field label="Sex" hint="For calorie formulas">
            <select className="select" value={profile.sex} onChange={(e) => setProfile({ sex: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Units">
            <Segmented small value={u} onChange={(v) => setProfile({ units: v })} options={[{ value: 'metric', label: 'Metric' }, { value: 'imperial', label: 'Imperial' }]} />
          </Field>
          <Field label="Height">
            {isImperial(u) ? (
              <span className="duration-input">
                <NumberInput value={ft} onChange={(v) => setProfile({ heightCm: numOrNull(v) != null ? Math.round((Number(v) * 12 + (Number(inch) || 0)) * 2.54) : null })} unit="ft" step="1" aria-label="Feet" />
                <NumberInput value={inch} onChange={(v) => setProfile({ heightCm: Math.round(((Number(ft) || 0) * 12 + (Number(v) || 0)) * 2.54) })} unit="in" step="1" aria-label="Inches" />
              </span>
            ) : (
              <NumberInput value={profile.heightCm ?? ''} onChange={(v) => setProfile({ heightCm: numOrNull(v) })} unit="cm" step="1" />
            )}
          </Field>
          <Field label="Weight">
            <NumberInput value={profile.weightKg != null ? Math.round(kgTo(profile.weightKg, u) * 10) / 10 : ''} onChange={(v) => setProfile({ weightKg: numOrNull(v) != null ? Math.round(toKg(Number(v), u) * 10) / 10 : null })} unit={weightUnit(u)} />
          </Field>
        </div>
        <Field label="Experience" wide>
          <div className="choice-grid">
            {EXPERIENCE.map((x) => (
              <button key={x.id} type="button" className={'choice' + (profile.experience === x.id ? ' selected' : '')} aria-pressed={profile.experience === x.id} onClick={() => setProfile({ experience: x.id })}>
                <span aria-hidden>{x.emoji}</span>
                <strong>{x.label}</strong>
                <small>{x.desc}</small>
              </button>
            ))}
          </div>
        </Field>
        <Field label="What matters to you" wide>
          <div className="habit-chips">
            {FOCUS_OPTIONS.map((f) => {
              const on = profile.focus.includes(f.id)
              return (
                <button key={f.id} type="button" className={'habit-chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setProfile({ focus: on ? profile.focus.filter((x) => x !== f.id) : [...profile.focus, f.id] })}>
                  <span aria-hidden>{f.emoji}</span> {f.label}
                </button>
              )
            })}
          </div>
        </Field>
      </section>

      <section className="card pad stack">
        <header className="row between wrap">
          <h3>Daily & weekly targets</h3>
          <button className="btn ghost small" onClick={() => { setT(suggestTargets(profile)); notify('Targets updated from your profile') }}>✨ Suggest for me</button>
        </header>
        <div className="form-grid">
          <Field label="Workouts per week"><NumberInput value={t.workoutsPerWeek} onChange={(v) => setT({ workoutsPerWeek: numOrNull(v) || 1 })} step="1" min={1} /></Field>
          <Field label="Active minutes per week" info={<InfoTip term="activeMinutes" />}><NumberInput value={t.activeMinutesPerWeek} onChange={(v) => setT({ activeMinutesPerWeek: numOrNull(v) || 30 })} unit="min" step="10" /></Field>
          <Field label="Steps per day"><NumberInput value={t.steps} onChange={(v) => setT({ steps: numOrNull(v) || 1000 })} step="500" /></Field>
          <Field label="Sleep per night"><NumberInput value={t.sleepHours} onChange={(v) => setT({ sleepHours: numOrNull(v) || 7 })} unit="h" step="0.25" /></Field>
          <Field label="Calories per day" info={<InfoTip term="calories" />}><NumberInput value={t.calories} onChange={(v) => setT({ calories: numOrNull(v) || 1200 })} unit="cal" step="50" /></Field>
          <Field label="Water per day"><NumberInput value={Math.round(mlTo(t.waterMl, u))} onChange={(v) => setT({ waterMl: Math.round(toMl(numOrNull(v) || 0, u)) || 1500 })} unit={waterUnit(u)} step={isImperial(u) ? 4 : 250} /></Field>
          <Field label="Protein" info={<InfoTip term="macros" />}><NumberInput value={t.protein} onChange={(v) => setT({ protein: numOrNull(v) || 0 })} unit="g" step="5" /></Field>
          <Field label="Carbs"><NumberInput value={t.carbs} onChange={(v) => setT({ carbs: numOrNull(v) || 0 })} unit="g" step="5" /></Field>
          <Field label="Fat"><NumberInput value={t.fat} onChange={(v) => setT({ fat: numOrNull(v) || 0 })} unit="g" step="5" /></Field>
        </div>
      </section>

      <section className="card pad stack">
        <h3>Heart rate <InfoTip term="zones" /></h3>
        <Field label="Maximum heart rate" hint={profile.maxHr ? 'Set by you' : `Estimated from your age: ${maxHrOf(profile)} bpm. Enter your own if you know it from a hard test.`}>
          <NumberInput value={profile.maxHr ?? ''} onChange={(v) => setProfile({ maxHr: numOrNull(v) })} unit="bpm" step="1" placeholder={String(maxHrOf(profile))} />
        </Field>
        <ul className="zone-list compact">
          {ZONES.map((z) => {
            const [lo, hi] = zoneRange(z, maxHrOf(profile))
            return <li key={z.n}><strong>Zone {z.n} · {z.name}</strong><span className="muted">{lo}–{hi} bpm</span></li>
          })}
        </ul>
      </section>

      <section className="card pad stack">
        <h3>Display</h3>
        <Field label="Theme">
          <Segmented small value={profile.theme} onChange={(v) => setProfile({ theme: v })} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'Automatic' }]} />
        </Field>
        <label className="switch-row">
          <input type="checkbox" checked={profile.showAdvanced} onChange={(e) => setProfile({ showAdvanced: e.target.checked })} />
          <span>
            <strong>Show detailed metrics</strong>
            <small className="muted">Macros, strain targets and extra numbers on the Today screen. Off keeps things simple.</small>
          </span>
        </label>
      </section>

      <section className="card pad stack">
        <h3>Reminders</h3>
        <p className="muted small">Gentle nudges while Thrive is open in a browser tab. Your browser may ask for permission to show notifications.</p>
        <label className="switch-row">
          <input type="checkbox" checked={profile.reminders.water} onChange={(e) => enableNotifications({ water: e.target.checked })} />
          <span><strong>Drink water</strong><small className="muted">Every 2 hours during the day if you are behind</small></span>
        </label>
        <label className="switch-row">
          <input type="checkbox" checked={profile.reminders.move} onChange={(e) => enableNotifications({ move: e.target.checked })} />
          <span><strong>Get moving</strong><small className="muted">Mid-afternoon if you have not been active today</small></span>
        </label>
        <div className="switch-row">
          <input type="checkbox" id="rem-bed" checked={profile.reminders.bedtime} onChange={(e) => enableNotifications({ bedtime: e.target.checked })} />
          <label htmlFor="rem-bed"><strong>Wind down for bed</strong></label>
          <input type="time" className="date-input small" value={profile.reminders.bedtimeAt} onChange={(e) => setR({ bedtimeAt: e.target.value })} aria-label="Bedtime reminder time" />
        </div>
        <div className="switch-row">
          <input type="checkbox" id="rem-journal" checked={profile.reminders.journal} onChange={(e) => enableNotifications({ journal: e.target.checked })} />
          <label htmlFor="rem-journal"><strong>Evening check-in</strong></label>
          <input type="time" className="date-input small" value={profile.reminders.journalAt} onChange={(e) => setR({ journalAt: e.target.value })} aria-label="Journal reminder time" />
        </div>
      </section>

      <section className="card pad stack">
        <h3>Your data</h3>
        <p className="muted small">Thrive stores everything in this browser. Export a backup now and then, especially before clearing your browser data.</p>
        <div className="row gap wrap">
          <button className="btn ghost" onClick={exportData}><DownloadIcon width={16} height={16} /> Export backup</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}><UploadIcon width={16} height={16} /> Restore backup</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files[0] && importData(e.target.files[0])} />
          {hasSample ? (
            <button className="btn ghost" onClick={() => { actions.removeSampleData(); notify('Sample data removed') }}>Remove sample data</button>
          ) : (
            <button className="btn ghost" onClick={() => { actions.loadSampleData(); notify('Sample data added. Explore away!') }}>Load sample data</button>
          )}
          <button className="btn ghost danger" onClick={() => setConfirmReset(true)}>Erase everything</button>
        </div>
      </section>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Erase all data?">
        <p>This permanently deletes your workouts, sleep, food, goals, habits, journal entries and to-dos from this browser. Export a backup first if you might want them later.</p>
        <div className="form-actions">
          <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          <button className="btn primary danger-fill" onClick={() => { actions.resetAll(); setConfirmReset(false); notify('All data erased') }}>Erase everything</button>
        </div>
      </Modal>
    </section>
  )
}
