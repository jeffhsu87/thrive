import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { TrashIcon, XIcon } from '../components/Icons.jsx'
import { Segmented } from '../components/Fields.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { addDays, currentStreak, dayKey, rangeKeys } from '../lib/date.js'

const SUGGESTIONS = [
  ['💧', 'Drink a glass of water on waking'],
  ['🙆', 'Stretch for 5 minutes'],
  ['🚶', 'Take a 10-minute walk'],
  ['🥦', 'Eat a vegetable with every meal'],
  ['📵', 'No screens 30 min before bed'],
  ['🧘', 'One minute of deep breathing'],
  ['💊', 'Take vitamins'],
  ['📖', 'Read 10 pages'],
  ['☀️', 'Get outside in morning light'],
  ['🙏', 'Write down one thing I’m grateful for'],
]
const EMOJIS = ['✅', '💧', '🙆', '🚶', '🥦', '📵', '🧘', '💊', '📖', '☀️', '🙏', '🏋️', '🦷', '🛏️', '🍎', '🎵']

function HabitsSection() {
  const { habits, habitLog, actions } = useHealth()
  const { notify } = useFeedback()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const days = rangeKeys(addDays(new Date(), -6), 7)
  const today = dayKey()

  function add(e, preset) {
    e?.preventDefault()
    const n = (preset?.[1] || name).trim()
    if (!n) return
    actions.addHabit({ name: n, emoji: preset?.[0] || emoji })
    setName('')
  }
  function toggle(day, h) {
    const was = (habitLog[day] || []).includes(h.id)
    actions.toggleHabit(day, h.id)
    if (!was && day === today) {
      const left = habits.filter((x) => x.id !== h.id && !(habitLog[today] || []).includes(x.id)).length
      notify(left === 0 ? '🎉 All habits done today. Amazing!' : `${h.emoji} Done! ${left} to go today.`)
    }
  }

  return (
    <section className="stack">
      <form className="card todo-composer" onSubmit={add}>
        <select className="select emoji-select" value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Habit icon">
          {EMOJIS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <input className="plain-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a daily habit" />
        <button className="btn primary" disabled={!name.trim()}>Add</button>
      </form>

      {habits.length === 0 ? (
        <div className="card pad">
          <p className="muted">Try one of these. Tiny habits are easier to keep:</p>
          <div className="habit-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s[1]} className="habit-chip" onClick={() => add(null, s)}>
                <span aria-hidden>{s[0]}</span> {s[1]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card habit-table">
          <div className="habit-row head" aria-hidden>
            <span />
            {days.map((d) => (
              <span key={d} className="habit-day">{new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            ))}
            <span className="hide-sm">Streak</span>
            <span />
          </div>
          {habits.map((h) => {
            const doneDays = Object.entries(habitLog).filter(([, ids]) => ids?.includes(h.id)).map(([d]) => d)
            const streak = currentStreak(doneDays)
            return (
              <div key={h.id} className="habit-row">
                <span className="habit-name"><span aria-hidden>{h.emoji}</span> {h.name}</span>
                {days.map((d) => {
                  const on = (habitLog[d] || []).includes(h.id)
                  return (
                    <button key={d} className={'habit-cell' + (on ? ' on' : '') + (d === today ? ' today' : '')} aria-pressed={on} aria-label={`${h.name} on ${new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'long' })}`} onClick={() => toggle(d, h)}>
                      {on ? '✓' : ''}
                    </button>
                  )
                })}
                <span className="hide-sm small">{streak ? `🔥 ${streak}` : '—'}</span>
                <button
                  className="icon-btn"
                  aria-label={`Delete ${h.name}`}
                  onClick={() => {
                    actions.removeHabit(h.id)
                    notify(`Removed ${h.name}`, { action: () => actions.addHabit(h) })
                  }}
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

const FILTERS = { all: () => true, active: (t) => !t.done, done: (t) => t.done }

function TodosSection() {
  const [todos, setTodos] = useLocalStorage('todos', [])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('all')
  function addTodo(e) {
    e.preventDefault()
    if (!title.trim()) return
    setTodos((l) => [...l, { id: crypto.randomUUID(), title: title.trim(), done: false }])
    setTitle('')
  }
  const toggle = (id) => setTodos((l) => l.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id) => setTodos((l) => l.filter((t) => t.id !== id))
  const remaining = todos.filter((t) => !t.done).length
  const visible = todos.filter(FILTERS[filter])
  return (
    <section className="stack">
      <p className="muted">{todos.length === 0 ? 'Nothing on your plate yet.' : `${remaining} of ${todos.length} left to do.`}</p>
      <form onSubmit={addTodo} className="card todo-composer">
        <input className="plain-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter (e.g. book a physio session)" />
        <button type="submit" className="btn primary" disabled={!title.trim()}>Add</button>
      </form>
      {todos.length > 0 && (
        <>
          <Segmented small value={filter} onChange={setFilter} options={Object.keys(FILTERS).map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }))} />
          <ul className="card todos">
            {visible.length === 0 && <li className="todo empty-row">Nothing here.</li>}
            {visible.map((t) => (
              <li key={t.id} className={'todo' + (t.done ? ' done' : '')}>
                <label>
                  <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                  <span>{t.title}</span>
                </label>
                <button className="icon-btn" onClick={() => remove(t.id)} aria-label="Delete task"><XIcon width={16} height={16} /></button>
              </li>
            ))}
          </ul>
          {todos.length > remaining && <button className="link-btn" onClick={() => setTodos((l) => l.filter((t) => !t.done))}>Clear completed</button>}
        </>
      )}
    </section>
  )
}

export default function Habits() {
  const [tab, setTab] = useLocalStorage('habits-tab', 'habits')
  return (
    <section className="page narrow">
      <PageHeader eyebrow="Plan" title="Habits & to-dos">Build healthy routines one small step at a time, and keep track of everything else.</PageHeader>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'habits', label: 'Daily habits' }, { value: 'todos', label: 'To-dos' }]} />
      {tab === 'habits' ? <HabitsSection /> : <TodosSection />}
    </section>
  )
}
