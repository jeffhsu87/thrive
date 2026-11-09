import { useEffect, useRef } from 'react'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { getStored, setStored } from './useLocalStorage.js'
import { dayKey } from '../lib/date.js'

const minutesNow = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Gentle reminders while the app is open. Uses system notifications when allowed, otherwise a toast. */
export default function useReminders() {
  const { profile, index } = useHealth()
  const { notify } = useFeedback()
  const ctx = useRef({ profile, index, notify })
  ctx.current = { profile, index, notify }

  useEffect(() => {
    function fire(id, title, body) {
      const key = dayKey()
      const log = getStored('reminder-log', {})
      if (log[id] === key) return
      setStored('reminder-log', { ...log, [id]: key })
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        try {
          new Notification(title, { body })
          return
        } catch {
          /* fall through to toast */
        }
      }
      ctx.current.notify(`${title} ${body}`)
    }
    function check() {
      const { profile: p, index: idx } = ctx.current
      const r = p.reminders
      const today = idx.get(dayKey())
      const now = minutesNow()
      if (r.water && now >= 9 * 60 && now <= 20 * 60) {
        const slot = Math.floor((now - 9 * 60) / 120)
        const expected = (p.targets.waterMl * (now - 9 * 60)) / (11 * 60)
        if (today.waterMl < expected * 0.7) fire(`water-${slot}`, '💧 Time for water.', 'A glass now keeps you on track for today.')
      }
      if (r.move && now >= 15 * 60 && now < 18 * 60 && !today.activities.length) fire('move', '🚶 How about a short walk?', 'Even 10 minutes of movement counts.')
      if (r.bedtime && now >= toMin(r.bedtimeAt) && now < toMin(r.bedtimeAt) + 60) fire('bed', '🌙 Time to wind down.', 'Dim the lights and put the screens away for better sleep.')
      if (r.journal && now >= toMin(r.journalAt) && now < toMin(r.journalAt) + 120 && !today.journalCount) fire('journal', '📓 Evening check-in.', 'How was your day? One line is enough.')
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [])
}
