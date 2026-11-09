import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '../store/Health.jsx'

/** App-wide toast with optional undo action. */
export function GlobalToast() {
  const { toast, setToast } = useFeedback()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.action ? 6000 : 3800)
    return () => clearTimeout(t)
  }, [toast, setToast])
  if (!toast) return null
  return (
    <div className="toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action()
            setToast(null)
          }}
        >
          {toast.actionLabel || 'Undo'}
        </button>
      )}
    </div>
  )
}

const CONFETTI = Array.from({ length: 28 }, (_, i) => i)

/** Badge and level-up celebration. */
export function Celebration() {
  const { celebration, setCelebration } = useFeedback()
  const navigate = useNavigate()
  useEffect(() => {
    if (!celebration) return
    const onKey = (e) => e.key === 'Escape' && setCelebration(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [celebration, setCelebration])
  if (!celebration) return null
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <div className="celebrate-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setCelebration(null)}>
      {!reduce && (
        <div className="confetti" aria-hidden>
          {CONFETTI.map((i) => (
            <i key={i} style={{ '--i': i, left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.08}s` }} />
          ))}
        </div>
      )}
      <div className="celebrate card" role="alertdialog" aria-label={celebration.title}>
        <div className="celebrate-emoji">{celebration.emoji}</div>
        <h2>{celebration.title}</h2>
        <p>{celebration.body}</p>
        <div className="row center gap">
          {celebration.to && (
            <button
              className="btn ghost"
              onClick={() => {
                setCelebration(null)
                navigate(celebration.to)
              }}
            >
              See rewards
            </button>
          )}
          <button className="btn primary" autoFocus onClick={() => setCelebration(null)}>
            Awesome!
          </button>
        </div>
      </div>
    </div>
  )
}
