import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import { NAV } from './Sidebar.jsx'
import { SearchIcon } from './Icons.jsx'

// The main screens in swipe / tab order: the daily loop first, then everything else.
const CORE = ['/today', '/recovery', '/activity', '/sleep', '/nutrition', '/coach', '/trends', '/reports']
const ALL = NAV.flatMap((g) => g.links.map((l) => ({ ...l, group: g.group })))
export const SCREENS = [...CORE.map((to) => ALL.find((l) => l.to === to)), ...ALL.filter((l) => !CORE.includes(l.to))]

/** Which screen a path belongs to (e.g. /activity/123 → Activity). */
export function screenIndex(pathname) {
  let best = -1
  SCREENS.forEach((s, i) => {
    if ((pathname === s.to || pathname.startsWith(s.to + '/')) && (best === -1 || s.to.length > SCREENS[best].to.length)) best = i
  })
  return best
}

const isTyping = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** Sticky, horizontally scrolling tabs for phones. Tap any screen; the current one stays in view. */
export function ScreenTabs({ onSearch }) {
  const { pathname } = useLocation()
  const ref = useRef(null)
  const current = screenIndex(pathname)
  useEffect(() => {
    const el = ref.current?.querySelector('.screen-tab.active')
    el?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [pathname])
  return (
    <nav className="screen-tabs" aria-label="Screens">
      <div className="screen-tabs-scroll" ref={ref}>
        {SCREENS.map((s, i) => (
          <NavLink key={s.to} to={s.to} className={'screen-tab' + (i === current ? ' active' : '')} aria-current={i === current ? 'page' : undefined}>
            <s.Icon width={15} height={15} />
            {s.short || s.label}
          </NavLink>
        ))}
      </div>
      <button className="screen-search" onClick={onSearch} aria-label="Find a screen">
        <SearchIcon width={18} height={18} />
      </button>
    </nav>
  )
}

/** Searchable list of every screen. Opens with ⌘K / Ctrl+K or "/". */
export function QuickSwitcher({ open, onClose }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? SCREENS.filter((x) => `${x.label} ${x.group}`.toLowerCase().includes(s)) : SCREENS
  }, [q])
  useEffect(() => {
    if (open) {
      setQ('')
      setSel(Math.max(0, screenIndex(pathname)))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSel((i) => Math.min(i, Math.max(0, results.length - 1))), [results])

  function go(s) {
    if (!s) return
    onClose()
    navigate(s.to)
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[sel])
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Go to screen">
      <div className="switcher" onKeyDown={onKey}>
        <label className="search">
          <SearchIcon width={16} height={16} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a screen name…" aria-label="Screen name" aria-controls="switcher-list" />
        </label>
        <ul className="switcher-list" id="switcher-list" role="listbox" aria-label="Screens">
          {results.map((s, i) => (
            <li key={s.to} role="option" aria-selected={i === sel}>
              <button className={'switcher-item' + (i === sel ? ' sel' : '') + (screenIndex(pathname) === SCREENS.indexOf(s) ? ' current' : '')} onMouseEnter={() => setSel(i)} onClick={() => go(s)}>
                <s.Icon />
                <span>{s.label}</span>
                <small>{s.group}</small>
              </button>
            </li>
          ))}
          {!results.length && <li className="muted small pad">No screen matches “{q}”.</li>}
        </ul>
        <p className="switcher-hint muted small hide-sm">
          <kbd>↑</kbd> <kbd>↓</kbd> to choose · <kbd>Enter</kbd> to open · <kbd>[</kbd> <kbd>]</kbd> previous / next screen anywhere
        </p>
      </div>
    </Modal>
  )
}

/**
 * App-wide screen navigation: ⌘K / Ctrl+K or "/" opens the switcher, "[" and "]" step through screens,
 * and on touch screens a horizontal swipe on the page moves to the previous / next screen.
 */
export function useScreenNavigation(mainRef) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const step = (dir) => {
    const i = screenIndex(pathRef.current)
    const next = SCREENS[(Math.max(0, i) + dir + SCREENS.length) % SCREENS.length]
    navigate(next.to)
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSwitcherOpen((o) => !o)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('.modal-backdrop, .onboard-backdrop, .celebrate-backdrop')) return
      if (e.key === '/') {
        e.preventDefault()
        setSwitcherOpen(true)
      } else if (e.key === ']') step(1)
      else if (e.key === '[') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    let start = null
    // Horizontal swipes inside these keep their own meaning (scrolling lists, chart tooltips, inputs, live recording).
    const SKIP = '.viz, .scroll-x, .quick-row, .coach-suggest, .coach-log, .table-wrap, .calendar, .habit-table, .filter-chips, .segmented, input, textarea, select, .live, .food-list'
    const onStart = (e) => {
      if (e.touches.length !== 1 || e.target.closest(SKIP)) return (start = null)
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    }
    const onEnd = (e) => {
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const fast = Date.now() - start.t < 600
      start = null
      if (fast && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) step(dx < 0 ? 1 : -1)
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [mainRef]) // eslint-disable-line react-hooks/exhaustive-deps

  return { switcherOpen, openSwitcher: () => setSwitcherOpen(true), closeSwitcher: () => setSwitcherOpen(false) }
}
