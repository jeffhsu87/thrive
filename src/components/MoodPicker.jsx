import { MOODS } from '../lib/moods.js'

export default function MoodPicker({ value, onChange }) {
  return (
    <div className="mood-picker" role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => {
        const selected = value === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={'mood-option' + (selected ? ' selected' : '')}
            style={{ '--mood': m.color }}
            onClick={() => onChange(selected ? null : m.value)}
          >
            <span className="mood-emoji">{m.emoji}</span>
            <span className="mood-label">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
