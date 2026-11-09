import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import InfoTip from '../components/InfoTip.jsx'
import { BarChart, Meter, Ring, SegmentedBar, STAGE_KEYS } from '../components/Charts.jsx'
import { ActivityRow, MacroMeters, RecCard, StatusPill, STATUS_COLOR, WaterTracker } from '../components/Bits.jsx'
import { useQuickLog } from '../components/QuickLog.jsx'
import { useHealth } from '../store/Health.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { dayKey, addDays, formatTime, greeting, longDate, rangeKeys, startOfWeek, weekdayShort } from '../lib/date.js'
import { recoveryStatus, sleepLabel, strainLabel } from '../lib/metrics.js'
import { headline } from '../lib/coach.js'
import { STATUS_TEXT } from '../lib/goals.js'
import { fmtDuration, fmtHours, fmtNum } from '../lib/units.js'
import { summarize } from '../lib/stats.js'
import { LastWeekCard } from './Reports.jsx'

function GettingStarted() {
  const { profile, stats, goals, devices, meals, index } = useHealth()
  const { open } = useQuickLog()
  const [hidden, setHidden] = useLocalStorage('hide-getting-started', false)
  const steps = [
    { done: !!profile.name && !!profile.weightKg, label: 'Complete your profile', to: '/settings' },
    { done: Object.keys(devices).length > 0, label: 'Connect a device or import data', to: '/devices' },
    { done: stats.workouts > 0, label: 'Log your first workout', log: 'workout' },
    { done: meals.length > 0, label: 'Log a meal', log: 'meal' },
    { done: goals.length > 0, label: 'Set a goal', to: '/goals' },
    { done: [...index.days.values()].some((d) => d.journalCount), label: 'Write a journal entry', to: '/journal' },
  ]
  const n = steps.filter((s) => s.done).length
  if (hidden || n === steps.length) return null
  return (
    <section className="card getting-started">
      <header className="row between">
        <div>
          <h3>Getting started</h3>
          <p className="muted small">{n} of {steps.length} done. Each step makes your insights smarter.</p>
        </div>
        <button className="link-btn" onClick={() => setHidden(true)}>Hide</button>
      </header>
      <Meter value={n} max={steps.length} label="Getting started progress" />
      <ul className="checklist">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'done' : ''}>
            <span className="check" aria-hidden>{s.done ? '✓' : ''}</span>
            {s.done ? (
              <span>{s.label}</span>
            ) : s.to ? (
              <Link to={s.to}>{s.label}</Link>
            ) : (
              <button className="link-btn" onClick={() => open(s.log)}>{s.label}</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Three big dials, each a shortcut to its screen. */
function DialRow() {
  const { index, profile } = useHealth()
  const today = index.get(dayKey())
  const st = recoveryStatus(today.recovery)
  const steps = today.steps != null ? ` · ${fmtNum(today.steps)} steps` : ''
  const dials = [
    {
      to: '/recovery',
      label: 'Recovery',
      value: today.recovery,
      max: 100,
      text: today.recovery != null ? `${today.recovery}%` : '—',
      color: st ? STATUS_COLOR[st.level] : 'var(--zone-0)',
      sub: st ? <><span aria-hidden>{st.icon}</span> {st.label}</> : 'Log sleep to see it',
    },
    {
      to: '/activity',
      label: 'Strain',
      value: today.strain || 0,
      max: 21,
      text: fmtNum(today.strain || 0, 1),
      color: 'var(--series-1)',
      sub: today.activeMin ? `${fmtDuration(today.activeMin)} active${steps}` : today.strain ? `${strainLabel(today.strain)} day${steps}` : `No workouts yet${steps}`,
    },
    {
      to: '/sleep',
      label: 'Sleep',
      value: today.sleepScore || 0,
      max: 100,
      text: today.sleepScore != null ? `${today.sleepScore}` : '—',
      color: 'var(--series-7)',
      sub: today.sleepMin != null ? `${fmtHours(today.sleepMin)} · ${sleepLabel(today.sleepScore)}` : `Goal ${profile.targets.sleepHours} h`,
    },
  ]
  return (
    <div className="dials" role="list">
      {dials.map((d) => (
        <Link key={d.to} to={d.to} className="dial card" role="listitem" aria-label={`${d.label} ${d.text}. Open ${d.label}`}>
          <Ring value={d.value} max={d.max} size={124} stroke={11} color={d.color} label={`${d.label} ${d.text}`}>
            <strong className="ring-value">{d.text}</strong>
          </Ring>
          <span className="dial-label">{d.label}</span>
          <span className="dial-sub">{d.sub}</span>
        </Link>
      ))}
    </div>
  )
}

export default function Today() {
  const { profile, index, recs, stats, goalsProgress, badges, habits, habitLog, actions } = useHealth()
  const { open } = useQuickLog()
  const key = dayKey()
  const today = index.get(key)
  const t = profile.targets
  const status = recoveryStatus(today.recovery)
  const sleep = today.sleep
  const week = summarize(index, startOfWeek(), 7, profile)
  const weekBars = rangeKeys(startOfWeek(), 7).map((k) => ({ key: k, label: weekdayShort(new Date(`${k}T12:00`)), value: index.get(k).activeMin || 0, tip: new Date(`${k}T12:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) }))
  const nextBadges = badges.filter((b) => !b.earned).sort((a, b) => b.pct - a.pct).slice(0, 3)
  const todaysHabits = habitLog[key] || []
  const simple = profile.experience === 'beginner' && !profile.showAdvanced

  return (
    <section className="page">
      <PageHeader eyebrow={longDate()} title={`${greeting()}${profile.name ? `, ${profile.name}` : ''}`} actions={<button className="btn primary" onClick={() => open()}>+ Log</button>}>
        {headline({ stats, today, profile })}
      </PageHeader>

      <GettingStarted />

      <DialRow />

      <div className="glance-grid">
        <article className="card glance">
          <header>
            <h3>Recovery <InfoTip term="recovery" /></h3>
            {today.recoveryEstimated && <span className="muted small">Estimated</span>}
          </header>
          {status ? (
            <div className="glance-body">
              <div>
                <StatusPill score={today.recovery} />
                <p className="small">{status.advice}</p>
                {!simple && <p className="muted small">Ideal strain today: {status.strainTarget[0]}–{status.strainTarget[1]}</p>}
              </div>
            </div>
          ) : (
            <div className="glance-empty">
              <p className="muted small">Log last night’s sleep or connect a wearable to see how ready you are.</p>
              <button className="btn ghost small" onClick={() => open('sleep')}>Log sleep</button>
            </div>
          )}
        </article>

        <article className="card glance">
          <header>
            <h3>Sleep <InfoTip term="sleepScore" /></h3>
            <Link to="/sleep" className="link-btn">Details</Link>
          </header>
          {sleep ? (
            <div className="glance-body column">
              <div className="row gap baseline">
                <span className="big-number">{fmtHours(sleep.durationMin)}</span>
                <span className="muted">
                  Score {today.sleepScore} · {sleepLabel(today.sleepScore)}
                </span>
              </div>
              {sleep.bedtime && sleep.wake && <p className="muted small">{formatTime(sleep.bedtime)} → {formatTime(sleep.wake)}</p>}
              <Meter value={sleep.durationMin} max={t.sleepHours * 60} color="var(--series-1)" label="Sleep vs goal" />
              {sleep.stages && <SegmentedBar legend={!simple} parts={STAGE_KEYS.map((k) => ({ label: k.label, value: sleep.stages[k.key] || 0, color: k.color }))} format={(v) => fmtDuration(v)} />}
            </div>
          ) : (
            <div className="glance-empty">
              <p className="muted small">How did you sleep? It takes 10 seconds.</p>
              <button className="btn ghost small" onClick={() => open('sleep')}>Log sleep</button>
            </div>
          )}
        </article>

        <article className="card glance">
          <header>
            <h3>Nutrition <InfoTip term="macros" /></h3>
            <Link to="/nutrition" className="link-btn">Details</Link>
          </header>
          <div className="glance-body">
            <Ring value={today.calIn} max={t.calories} color="var(--series-2)" label={`${Math.round(today.calIn)} of ${t.calories} calories`}>
              <strong className="ring-value">{fmtNum(today.calIn)}</strong>
              <small>of {fmtNum(t.calories)} cal</small>
            </Ring>
            <div className="grow">{simple ? <p className="muted small">{today.meals.length ? `${today.meals.length} foods logged today.` : 'Nothing logged yet today.'}</p> : <MacroMeters day={today} targets={t} />}</div>
          </div>
          <WaterTracker compact />
        </article>
      </div>

      <div className="quick-row" role="group" aria-label="Quick log">
        {[
          ['workout', '🏃', 'Workout'],
          ['meal', '🥗', 'Food'],
          ['sleep', '😴', 'Sleep'],
          ['checkin', '⚖️', 'Weigh-in'],
        ].map(([k, e, l]) => (
          <button key={k} className="quick-btn" onClick={() => open(k)}>
            <span aria-hidden>{e}</span> {l}
          </button>
        ))}
        <Link to="/journal" className="quick-btn"><span aria-hidden>📓</span> Journal</Link>
        <Link to="/mindful" className="quick-btn"><span aria-hidden>🌿</span> Breathe</Link>
      </div>

      <div className="two-col">
        <div className="stack">
          <section>
            <h2 className="section-title">Your coach suggests</h2>
            <div className="stack-sm">
              {recs.slice(0, 3).map((r) => <RecCard key={r.id} rec={r} />)}
              {recs.length > 3 && <Link to="/goals" className="link-btn">See all {recs.length} suggestions →</Link>}
            </div>
          </section>

          <section className="card pad">
            <header className="row between">
              <h3>This week</h3>
              <span className="muted small">
                {week.workouts} of {t.workoutsPerWeek} workouts · {fmtDuration(week.activeMin)} of {fmtDuration(t.activeMinutesPerWeek)}
              </span>
            </header>
            <Meter value={week.activeMin} max={t.activeMinutesPerWeek} label="Weekly active minutes" />
            <BarChart data={weekBars} height={150} goal={Math.round(t.activeMinutesPerWeek / 7)} goalLabel="Daily pace" format={(v) => fmtDuration(v)} label="Active minutes per day this week" />
          </section>

          {today.activities.length > 0 && (
            <section className="card list-card">
              <h3 className="pad-x">Today’s workouts</h3>
              {today.activities.map((a) => <ActivityRow key={a.id} a={a} />)}
            </section>
          )}
        </div>

        <div className="stack">
          <LastWeekCard />

          <section className="card pad">
            <header className="row between">
              <h3>Habits today</h3>
              <Link to="/habits" className="link-btn">Manage</Link>
            </header>
            {habits.length ? (
              <div className="habit-chips">
                {habits.map((h) => {
                  const on = todaysHabits.includes(h.id)
                  return (
                    <button key={h.id} className={'habit-chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => actions.toggleHabit(key, h.id)}>
                      <span aria-hidden>{on ? '✓' : h.emoji}</span> {h.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="muted small">Small daily habits like stretching or drinking water make a big difference. <Link to="/habits">Add your first habit</Link>.</p>
            )}
          </section>

          <section className="card pad">
            <header className="row between">
              <h3>Goals</h3>
              <Link to="/goals" className="link-btn">{goalsProgress.length ? 'All goals' : 'Set a goal'}</Link>
            </header>
            {goalsProgress.length ? (
              <div className="stack-sm">
                {goalsProgress.slice(0, 4).map((g) => (
                  <div key={g.goal.id} className="goal-mini">
                    <span className="row between">
                      <span>{g.def.emoji} {g.goal.title}</span>
                      <span className={`goal-status ${g.status}`}>{STATUS_TEXT[g.status]}</span>
                    </span>
                    <Meter value={g.pct} max={1} label={`${g.goal.title}: ${Math.round(g.pct * 100)}%`} />
                    <small className="muted">{g.currentText} of {g.targetText}{g.periodLabel ? ` ${g.periodLabel}` : ''}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Pick something small and specific, like “3 workouts a week”.</p>
            )}
          </section>

          <section className="card pad">
            <header className="row between">
              <h3>Almost there</h3>
              <Link to="/rewards" className="link-btn">All badges</Link>
            </header>
            <div className="stack-sm">
              {nextBadges.map((b) => (
                <div key={b.id} className="badge-mini">
                  <span className="badge-emoji locked" aria-hidden>{b.emoji}</span>
                  <div className="grow">
                    <span className="row between">
                      <strong>{b.name}</strong>
                      <small className="muted">{Math.round(b.pct * 100)}%</small>
                    </span>
                    <small className="muted">{b.desc}</small>
                    <Meter value={b.pct} max={1} height={6} label={`${b.name} progress`} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {!simple && (
            <section className="card pad">
              <h3>Yesterday</h3>
              {(() => {
                const y = index.get(dayKey(addDays(new Date(), -1)))
                return (
                  <ul className="kv">
                    <li><span>Strain</span><strong>{y.strain != null ? fmtNum(y.strain, 1) : '—'}</strong></li>
                    <li><span>Active</span><strong>{fmtDuration(y.activeMin)}</strong></li>
                    <li><span>Calories eaten</span><strong>{y.meals.length ? fmtNum(y.calIn) : '—'}</strong></li>
                    <li><span>Steps</span><strong>{fmtNum(y.steps)}</strong></li>
                  </ul>
                )
              })()}
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
