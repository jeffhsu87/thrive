import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { XIcon } from '../components/Icons.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'

const FILTERS = { all: () => true, active: (t) => !t.done, done: (t) => t.done }

export default function Todos() {
  const [todos, setTodos] = useLocalStorage('todos', [])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('all')

  function addTodo(e) {
    e.preventDefault()
    if (!title.trim()) return
    setTodos([...todos, { id: crypto.randomUUID(), title: title.trim(), done: false }])
    setTitle('')
  }

  const toggle = (id) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id) => setTodos(todos.filter((t) => t.id !== id))
  const clearDone = () => setTodos(todos.filter((t) => !t.done))
  const remaining = todos.filter((t) => !t.done).length
  const visible = todos.filter(FILTERS[filter])

  return (
    <section>
      <PageHeader eyebrow="Tasks" title="Todos">
        {todos.length === 0 ? 'Nothing on your plate yet.' : `${remaining} of ${todos.length} left to do.`}
      </PageHeader>

      <form onSubmit={addTodo} className="card todo-composer">
        <input className="plain-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter" />
        <button type="submit" className="btn primary" disabled={!title.trim()}>Add</button>
      </form>

      {todos.length > 0 && (
        <>
          <div className="segmented" role="tablist">
            {Object.keys(FILTERS).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

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

          {todos.length > remaining && (
            <button className="link-btn clear-done" onClick={clearDone}>Clear completed</button>
          )}
        </>
      )}
    </section>
  )
}
