import PageHeader from '../components/PageHeader.jsx'
import { Meter } from '../components/Charts.jsx'
import { useHealth } from '../store/Health.jsx'
import { BADGE_GROUPS, LEVEL_NAMES } from '../lib/achievements.js'
import { dailyQuote } from '../lib/coach.js'
import { fmtNum } from '../lib/units.js'

export default function Rewards() {
  const { level, stats, badges } = useHealth()
  const earned = badges.filter((b) => b.earned)
  const streaks = [
    { emoji: '🔥', label: 'Activity streak', value: stats.activeStreak, unit: 'days', best: stats.bestActiveStreak, hint: stats.activeToday ? 'Active today. Nice!' : stats.activeStreak ? 'Move today to keep it going' : 'Any workout starts a streak' },
    { emoji: '📆', label: 'Check-in streak', value: stats.logStreak, unit: 'days', best: stats.bestLogStreak, hint: 'Log anything: food, water, sleep, a journal entry' },
    { emoji: '🗓️', label: 'Weekly goal streak', value: stats.weekStreak, unit: 'weeks', hint: 'Weeks in a row hitting your workout target' },
  ]

  return (
    <section className="page">
      <PageHeader eyebrow="Plan" title="Rewards">
        Every workout, glass of water and good night earns progress. Celebrate it.
      </PageHeader>

      <section className="card pad level-card">
        <div className="level-badge" aria-hidden>
          <span>{level.level}</span>
        </div>
        <div className="grow stack-sm">
          <p className="eyebrow">Level {level.level}</p>
          <h2>{level.name}</h2>
          <Meter value={level.xp - level.start} max={level.next - level.start} height={10} label="Progress to next level" />
          <p className="muted small">
            {fmtNum(level.xp)} XP · {fmtNum(level.next - level.xp)} XP to level {level.level + 1}
            {level.level < LEVEL_NAMES.length ? ` (${LEVEL_NAMES[level.level]})` : ''}
          </p>
        </div>
        <details className="xp-help">
          <summary>How do I earn XP?</summary>
          <ul className="small">
            <li>Workout: 50 XP + 1 XP per minute</li>
            <li>Journal entry: 20 XP</li>
            <li>Night of sleep tracked: 10 XP</li>
            <li>Hitting your water goal: 10 XP</li>
            <li>Food logged: 5 XP · Habit ticked: 5 XP</li>
            <li>Mindful minute: 2 XP</li>
            <li>Badge: 100 XP · Goal completed: 150 XP</li>
          </ul>
        </details>
      </section>

      <div className="stats three">
        {streaks.map((s) => (
          <div key={s.label} className="stat streak">
            <span className="stat-label">{s.emoji} {s.label}</span>
            <span className="stat-value">{s.value}<small> {s.unit}</small></span>
            <span className="stat-sub">{s.best ? `Best: ${s.best} ${s.unit} · ` : ''}{s.hint}</span>
          </div>
        ))}
      </div>

      <p className="quote">“{dailyQuote()}”</p>

      <p className="muted">{earned.length} of {badges.length} badges earned</p>
      {BADGE_GROUPS.map((g) => (
        <section key={g}>
          <h2 className="section-title">{g}</h2>
          <div className="badge-grid">
            {badges.filter((b) => b.group === g).map((b) => (
              <article key={b.id} className={'badge card' + (b.earned ? ' earned' : '')} aria-label={`${b.name}: ${b.earned ? 'earned' : `${Math.round(b.pct * 100)}% done`}`}>
                <span className={'badge-emoji' + (b.earned ? '' : ' locked')} aria-hidden>{b.emoji}</span>
                <strong>{b.name}</strong>
                <small className="muted">{b.desc}</small>
                {b.earned ? (
                  <span className="earned-tag">✓ Earned</span>
                ) : (
                  <>
                    <Meter value={b.pct} max={1} height={6} label={`${b.name} progress`} />
                    <small className="muted">{fmtNum(Math.min(b.value, b.target), b.target % 1 ? 1 : 0)} / {fmtNum(b.target, b.target % 1 ? 1 : 0)}</small>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}
