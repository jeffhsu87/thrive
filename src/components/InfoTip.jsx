import { useEffect, useId, useRef, useState } from 'react'
import { GLOSSARY } from '../lib/glossary.js'

/** Small "?" button that explains a metric in plain language. */
export default function InfoTip({ term }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const id = useId()
  const entry = GLOSSARY[term]

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!entry) return null
  return (
    <span className="infotip" ref={ref}>
      <button type="button" className="infotip-btn" aria-expanded={open} aria-controls={id} aria-label={`What is ${entry.title}?`} onClick={() => setOpen((o) => !o)}>
        ?
      </button>
      {open && (
        <span className="infotip-pop" id={id} role="dialog">
          <strong>{entry.title}</strong>
          <span>{entry.body}</span>
        </span>
      )}
    </span>
  )
}
