import { useEffect } from 'react'

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action()
            onDismiss()
          }}
        >
          {toast.actionLabel || 'Undo'}
        </button>
      )}
    </div>
  )
}
