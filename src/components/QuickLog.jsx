import { createContext, useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import WorkoutForm from './forms/WorkoutForm.jsx'
import MealForm from './forms/MealForm.jsx'
import SleepForm from './forms/SleepForm.jsx'
import CheckInForm from './forms/CheckInForm.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { workoutCheer } from '../lib/coach.js'
import { dayKey, startOfWeek } from '../lib/date.js'
import { summarize } from '../lib/stats.js'
import { fmtHours, fmtWater } from '../lib/units.js'
import { MEAL_TYPES } from '../lib/foods.js'

const LogContext = createContext(null)
export const useQuickLog = () => useContext(LogContext)

const TILES = [
  { kind: 'workout', emoji: '🏃', label: 'Workout', desc: 'Any sport or activity' },
  { kind: 'live', emoji: '⏱️', label: 'Live workout', desc: 'Timer, GPS & heart rate' },
  { kind: 'meal', emoji: '🥗', label: 'Food', desc: 'Meals and snacks' },
  { kind: 'water', emoji: '💧', label: 'Water', desc: 'Add a glass (250 ml)' },
  { kind: 'sleep', emoji: '😴', label: 'Sleep', desc: 'Last night' },
  { kind: 'checkin', emoji: '⚖️', label: 'Body check-in', desc: 'Weight, steps, heart' },
  { kind: 'journal', emoji: '📓', label: 'Journal', desc: 'Mood & reflection' },
  { kind: 'mindful', emoji: '🌿', label: 'Breathe', desc: 'Guided breathing' },
  { kind: 'habits', emoji: '✅', label: 'Habits', desc: 'Tick off today' },
]

const TITLES = { workout: 'Log a workout', meal: 'Log food', sleep: 'Log sleep', checkin: 'Body check-in', edit: 'Edit workout', editSleep: 'Edit sleep' }

export function QuickLogProvider({ children }) {
  const [state, setState] = useState(null)
  const navigate = useNavigate()
  const { profile, index, actions } = useHealth()
  const { notify } = useFeedback()
  const open = useCallback((kind = 'menu', props = {}) => setState({ kind, props }), [])
  const close = useCallback(() => setState(null), [])

  function pick(kind) {
    if (kind === 'live') return close(), navigate('/activity/live')
    if (kind === 'journal') return close(), navigate('/journal')
    if (kind === 'mindful') return close(), navigate('/mindful')
    if (kind === 'habits') return close(), navigate('/habits')
    if (kind === 'water') {
      close()
      actions.addWater(dayKey(), 250)
      const total = index.get(dayKey()).waterMl + 250
      const goal = profile.targets.waterMl
      notify(total >= goal ? `💧 Water goal reached: ${fmtWater(total, profile.units)}!` : `💧 ${fmtWater(total, profile.units)} today. ${Math.ceil((goal - total) / 250)} glasses to go.`, { action: () => actions.addWater(dayKey(), -250) })
      return
    }
    setState({ kind, props: {} })
  }

  function saveWorkout(a) {
    const isEdit = state.kind === 'edit'
    if (isEdit) actions.updateActivity(a.id, a)
    else actions.addActivity(a)
    close()
    if (isEdit) return notify('Workout updated')
    const inWeek = new Date(a.start) >= startOfWeek()
    const n = summarize(index, startOfWeek(), 7, profile).workouts + (inWeek ? 1 : 0)
    notify(inWeek ? workoutCheer(a, n, profile) : 'Workout saved. Nice work!')
  }

  function saveSleep(s) {
    actions.addSleep(s)
    close()
    const need = profile.targets.sleepHours * 60
    notify(s.durationMin >= need - 15 ? `😴 ${fmtHours(s.durationMin)}: right on target. Your body thanks you.` : `😴 ${fmtHours(s.durationMin)} logged. An earlier night tonight will help.`)
  }

  const k = state?.kind
  return (
    <LogContext.Provider value={{ open, close }}>
      {children}
      <Modal open={!!state} onClose={close} title={k === 'menu' ? 'What would you like to log?' : TITLES[k] || 'Log'} wide={k === 'workout' || k === 'edit' || k === 'meal'}>
        {k === 'menu' && (
          <div className="log-tiles">
            {TILES.map((t) => (
              <button key={t.kind} className="log-tile" onClick={() => pick(t.kind)}>
                <span className="log-emoji" aria-hidden>{t.emoji}</span>
                <strong>{t.label}</strong>
                <small>{t.desc}</small>
              </button>
            ))}
          </div>
        )}
        {(k === 'workout' || k === 'edit') && <WorkoutForm initial={state.props.activity} presetSport={state.props.sport} onSave={saveWorkout} onCancel={close} submitLabel={k === 'edit' ? 'Save changes' : 'Save workout'} />}
        {k === 'meal' && (
          <MealForm
            day={state.props.day}
            mealType={state.props.mealType}
            onCancel={close}
            onDone={(items) => {
              close()
              const cal = items.reduce((s, m) => s + m.cal * (m.servings || 1), 0)
              notify(`${MEAL_TYPES.find((m) => m.id === items[0].mealType)?.emoji || '🍽️'} Added ${Math.round(cal)} cal. Nice job tracking!`)
            }}
          />
        )}
        {(k === 'sleep' || k === 'editSleep') && <SleepForm initial={state.props.sleep} onSave={saveSleep} onCancel={close} />}
        {k === 'checkin' && (
          <CheckInForm
            onCancel={close}
            onDone={() => {
              close()
              notify('✅ Check-in saved')
            }}
          />
        )}
      </Modal>
    </LogContext.Provider>
  )
}
