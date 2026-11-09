import { useLayoutEffect, useRef, useState } from 'react'
import MoodPicker from './MoodPicker.jsx'
import EnergyPicker from './EnergyPicker.jsx'
import TagInput from './TagInput.jsx'
import { SparkleIcon } from './Icons.jsx'
import { PROMPTS } from '../lib/moods.js'
import { dayKey } from '../lib/date.js'

export const EMPTY_ENTRY = { title: '', body: '', mood: null, energy: null, tags: [], gratitude: '', day: '' }

export const isBlank = (v) => !v.title.trim() && !v.body.trim() && !v.mood && !v.gratitude.trim()

export default function EntryEditor({ value, onChange, onSubmit, onCancel, submitLabel = 'Save entry', tagSuggestions, status, autoFocus }) {
  const bodyRef = useRef(null)
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length))
  const set = (patch) => onChange({ ...value, ...patch })

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value.body])

  function submit(e) {
    e?.preventDefault()
    if (!isBlank(value)) onSubmit()
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e)
    if (e.key === 'Escape' && onCancel) onCancel()
  }

  return (
    <form className="editor" onSubmit={submit} onKeyDown={onKeyDown}>
      <div className="editor-section">
        <span className="field-label">How are you feeling?</span>
        <MoodPicker value={value.mood} onChange={(mood) => set({ mood })} />
      </div>

      <input
        className="editor-title"
        value={value.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="Title (optional)"
        autoFocus={autoFocus}
      />
      <div className="editor-body-wrap">
        <textarea
          ref={bodyRef}
          className="editor-body"
          value={value.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder={PROMPTS[promptIndex]}
          rows={4}
        />
        {!value.body && (
          <button
            type="button"
            className="prompt-shuffle"
            onClick={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)}
            title="Show another writing prompt"
          >
            <SparkleIcon width={14} height={14} /> New prompt
          </button>
        )}
      </div>

      <div className="editor-details">
        <div className="detail">
          <span className="field-label">Energy</span>
          <EnergyPicker value={value.energy} onChange={(energy) => set({ energy })} />
        </div>
        <label className="detail">
          <span className="field-label">Date</span>
          <input
            type="date"
            className="date-input"
            value={value.day || dayKey()}
            max={dayKey()}
            onChange={(e) => set({ day: e.target.value })}
          />
        </label>
        <div className="detail detail-wide">
          <span className="field-label">Tags</span>
          <TagInput tags={value.tags} onChange={(tags) => set({ tags })} suggestions={tagSuggestions} />
        </div>
        <label className="detail detail-wide">
          <span className="field-label">Grateful for</span>
          <input
            className="plain-input"
            value={value.gratitude}
            onChange={(e) => set({ gratitude: e.target.value })}
            placeholder="One small thing…"
          />
        </label>
      </div>

      <div className="editor-actions">
        <span className="editor-status">{status}</span>
        <span className="kbd-hint">⌘ ↵ to save</span>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn primary" disabled={isBlank(value)}>{submitLabel}</button>
      </div>
    </form>
  )
}
