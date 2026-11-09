import { addDays, addMonths, daysInMonth, monthShort, shortDate, startOfMonth, startOfWeek } from './date.js'

export const PERIOD_KINDS = { week: 'Week', month: 'Month', year: 'Year' }

/**
 * A reporting period `offset` steps back from the current one, its previous period,
 * and 12 history buckets (weeks for week view, months otherwise) for trend lines.
 */
export function periodRange(kind, offset = 0) {
  if (kind === 'week') {
    const start = addDays(startOfWeek(), -7 * offset)
    return {
      kind,
      start,
      n: 7,
      prevStart: addDays(start, -7),
      prevN: 7,
      label: offset === 0 ? 'This week' : offset === 1 ? 'Last week' : `Week of ${shortDate(start)}`,
      longLabel: `${shortDate(start)} – ${shortDate(addDays(start, 6))}`,
      prevLabel: 'the previous week',
      buckets: Array.from({ length: 12 }, (_, i) => ({ start: addDays(start, -7 * (11 - i)), n: 7, label: shortDate(addDays(start, -7 * (11 - i))) })),
    }
  }
  if (kind === 'month') {
    const start = addMonths(startOfMonth(), -offset)
    const prev = addMonths(start, -1)
    return {
      kind,
      start,
      n: daysInMonth(start),
      prevStart: prev,
      prevN: daysInMonth(prev),
      label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      longLabel: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      prevLabel: prev.toLocaleDateString(undefined, { month: 'long' }),
      buckets: Array.from({ length: 12 }, (_, i) => {
        const s = addMonths(start, -(11 - i))
        return { start: s, n: daysInMonth(s), label: monthShort(s) }
      }),
    }
  }
  const y = new Date().getFullYear() - offset
  const start = new Date(y, 0, 1)
  const days = (yy) => Math.round((new Date(yy + 1, 0, 1) - new Date(yy, 0, 1)) / 864e5)
  return {
    kind,
    start,
    n: days(y),
    prevStart: new Date(y - 1, 0, 1),
    prevN: days(y - 1),
    label: String(y),
    longLabel: String(y),
    prevLabel: String(y - 1),
    buckets: Array.from({ length: 12 }, (_, i) => {
      const s = new Date(y, i, 1)
      return { start: s, n: daysInMonth(s), label: monthShort(s) }
    }),
  }
}

/** Days of the period that have already happened (the whole period for past ones). */
export function elapsedDays(p) {
  const n = Math.round((Date.now() - p.start.getTime()) / 864e5) + 1
  return Math.max(1, Math.min(p.n, n))
}
