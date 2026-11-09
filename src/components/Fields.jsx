import { useId } from 'react'
import { ChevronDown } from './Icons.jsx'

export function Field({ label, hint, children, wide, info }) {
  return (
    <label className={'field' + (wide ? ' wide' : '')}>
      <span className="field-label">
        {label}
        {info}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function NumberInput({ value, onChange, unit, min = 0, step = 'any', placeholder, ...rest }) {
  return (
    <span className="num-input">
      <input
        type="number"
        inputMode="decimal"
        className="plain-input"
        value={value ?? ''}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
        {...rest}
      />
      {unit && <span className="num-unit">{unit}</span>}
    </span>
  )
}

export function Segmented({ options, value, onChange, label, small }) {
  return (
    <div className={'segmented' + (small ? ' small' : '')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Disclosure({ title, children, defaultOpen = false }) {
  const id = useId()
  return (
    <details className="disclosure" open={defaultOpen || undefined}>
      <summary aria-controls={id}>
        <span>{title}</span>
        <ChevronDown width={16} height={16} />
      </summary>
      <div id={id} className="disclosure-body">{children}</div>
    </details>
  )
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label }) {
  const v = Number(value) || 0
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, Math.round((v - step) * 100) / 100))} aria-label="Decrease">−</button>
      <span>{v}</span>
      <button type="button" onClick={() => onChange(Math.min(max, Math.round((v + step) * 100) / 100))} aria-label="Increase">+</button>
    </span>
  )
}

export const numOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))
