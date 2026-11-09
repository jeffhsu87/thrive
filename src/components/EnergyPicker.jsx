import { ENERGY_LABELS } from '../lib/moods.js'

export default function EnergyPicker({ value, onChange }) {
  return (
    <div className="energy">
      <div className="energy-bars" role="radiogroup" aria-label="Energy">
        {ENERGY_LABELS.map((label, i) => {
          const level = i + 1
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={value === level}
              aria-label={label}
              title={label}
              className={'energy-bar' + (value && level <= value ? ' on' : '')}
              style={{ height: 8 + i * 4 }}
              onClick={() => onChange(value === level ? null : level)}
            />
          )
        })}
      </div>
      <span className="energy-label">{value ? ENERGY_LABELS[value - 1] : 'Not set'}</span>
    </div>
  )
}
