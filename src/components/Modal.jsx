import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from './Icons.jsx'

/** Accessible dialog. Becomes a bottom sheet on small screens. */
export default function Modal({ open, onClose, title, children, wide = false, footer, drawer = false }) {
  const ref = useRef(null)
  const lastFocus = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement
    const el = ref.current
    const first = el?.querySelector('[autofocus], input, select, textarea, button:not(.modal-close)')
    ;(first || el)?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled)
        if (!items.length) return
        const [a, z] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
      lastFocus.current?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className={'modal-backdrop' + (drawer ? ' drawer-backdrop' : '')} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '') + (drawer ? ' drawer' : '')} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  )
}
