import { useId, useState } from 'react'
import { XIcon } from './Icons.jsx'

const clean = (s) => s.trim().replace(/^#/, '').toLowerCase()

export default function TagInput({ tags, onChange, suggestions = [] }) {
  const [text, setText] = useState('')
  const listId = useId()

  function commit() {
    const tag = clean(text)
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setText('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !text && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="tag-input">
      {tags.map((t) => (
        <span key={t} className="tag">
          #{t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
            <XIcon width={12} height={12} />
          </button>
        </span>
      ))}
      <input
        value={text}
        list={listId}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length ? 'Add tag' : 'work, family, health…'}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !tags.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  )
}
