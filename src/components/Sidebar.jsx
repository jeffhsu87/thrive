import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BookIcon, BoltIcon, ChatIcon, ReportIcon, ForkIcon, SearchIcon, GearIcon, GridIcon, HomeIcon, LeafIcon, ListIcon, MoonIcon, PlusIcon, PulseIcon, ScaleIcon, TargetIcon, TrendIcon, TrophyIcon, WatchIcon,
} from './Icons.jsx'
import { useQuickLog } from './QuickLog.jsx'
import { useHealth } from '../store/Health.jsx'
import { longDate } from '../lib/date.js'

export const NAV = [
  {
    group: 'Overview',
    links: [
      { to: '/today', label: 'Today', Icon: HomeIcon },
      { to: '/coach', label: 'Coach', Icon: ChatIcon },
      { to: '/trends', label: 'Progress', Icon: TrendIcon },
      { to: '/reports', label: 'Reports', Icon: ReportIcon },
    ],
  },
  {
    group: 'Track',
    links: [
      { to: '/activity', label: 'Activity', Icon: BoltIcon },
      { to: '/sleep', label: 'Sleep', Icon: MoonIcon },
      { to: '/recovery', label: 'Recovery & heart', short: 'Recovery', Icon: PulseIcon },
      { to: '/nutrition', label: 'Nutrition', Icon: ForkIcon },
      { to: '/body', label: 'Body', Icon: ScaleIcon },
    ],
  },
  { group: 'Mind', links: [{ to: '/journal', label: 'Journal', Icon: BookIcon }, { to: '/mindful', label: 'Mindfulness', Icon: LeafIcon }] },
  {
    group: 'Plan',
    links: [
      { to: '/goals', label: 'Goals & coach', short: 'Goals', Icon: TargetIcon },
      { to: '/habits', label: 'Habits & to-dos', short: 'Habits', Icon: ListIcon },
      { to: '/rewards', label: 'Rewards', Icon: TrophyIcon },
    ],
  },
  { group: 'Setup', links: [{ to: '/devices', label: 'Devices & import', short: 'Devices', Icon: WatchIcon }, { to: '/settings', label: 'Settings', Icon: GearIcon }] },
]

const navClass = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '')

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export default function Sidebar({ onSearch }) {
  const { open } = useQuickLog()
  const { level, stats } = useHealth()
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>T</span>
        <span>Thrive</span>
      </div>
      <button className="btn primary log-btn" onClick={() => open()}>
        <PlusIcon width={18} height={18} /> Log
      </button>
      <button className="jump-btn" onClick={onSearch}>
        <SearchIcon width={15} height={15} />
        <span>Jump to…</span>
        <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <nav className="nav-groups" aria-label="Main">
        {NAV.map((g) => (
          <div key={g.group} className="nav-group">
            <p className="nav-group-label">{g.group}</p>
            {g.links.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={navClass}>
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <NavLink to="/rewards" className="sidebar-foot">
        <span className="level-chip">Lv {level.level}</span>
        <span>
          {level.name}
          <small>{stats.activeStreak ? `🔥 ${stats.activeStreak}-day streak` : longDate()}</small>
        </span>
      </NavLink>
    </aside>
  )
}

/** Bottom tab bar for phones, with a "More" sheet holding the full menu. */
export function MobileNav() {
  const { open } = useQuickLog()
  const [more, setMore] = useState(false)
  const location = useLocation()
  useEffect(() => setMore(false), [location.pathname])
  const tabs = [
    { to: '/today', label: 'Today', Icon: HomeIcon },
    { to: '/activity', label: 'Activity', Icon: BoltIcon },
    null,
    { to: '/coach', label: 'Coach', Icon: ChatIcon },
  ]
  return (
    <>
      <nav className="mobile-nav" aria-label="Main">
        {tabs.map((t, i) =>
          t ? (
            <NavLink key={t.to} to={t.to} className={navClass}>
              <t.Icon />
              <span>{t.label}</span>
            </NavLink>
          ) : (
            <button key={i} className="mobile-log" onClick={() => open()} aria-label="Log something">
              <PlusIcon width={24} height={24} />
            </button>
          )
        )}
        <button className={'nav-link' + (more ? ' active' : '')} onClick={() => setMore((m) => !m)} aria-expanded={more}>
          <GridIcon />
          <span>More</span>
        </button>
      </nav>
      {more && (
        <div className="more-sheet" onPointerDown={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="more-panel card">
            {NAV.map((g) => (
              <div key={g.group} className="nav-group">
                <p className="nav-group-label">{g.group}</p>
                <div className="more-grid">
                  {g.links.map(({ to, label, Icon }) => (
                    <NavLink key={to} to={to} className={navClass}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
