import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader, { Stat } from '../components/PageHeader.jsx'
import { Segmented } from '../components/Fields.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { addDays, startOfWeek } from '../lib/date.js'
import { summarize } from '../lib/stats.js'
import { fmtClock, fmtDuration } from '../lib/units.js'

// Phases: [label, seconds, scale target]
const PATTERNS = {
  calm: { name: 'Calm breathing', desc: 'Slow, even breaths to settle your nervous system.', phases: [['Breathe in', 5, 1], ['Breathe out', 5, 0.55]] },
  box: { name: 'Box breathing', desc: 'Used by athletes to focus under pressure.', phases: [['Breathe in', 4, 1], ['Hold', 4, 1], ['Breathe out', 4, 0.55], ['Hold', 4, 0.55]] },
  sleep: { name: '4-7-8 for sleep', desc: 'A longer exhale to help you wind down before bed.', phases: [['Breathe in', 4, 1], ['Hold', 7, 1], ['Breathe out', 8, 0.55]] },
  timer: { name: 'Quiet timer', desc: 'Sit comfortably and simply notice your breath. A soft chime ends the session.', phases: null },
}

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 528
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 2.6)
  } catch {
    /* audio unavailable */
  }
}

export default function Mindfulness() {
  const { index, profile, actions } = useHealth()
  const { notify } = useFeedback()
  const [pattern, setPattern] = useState('calm')
  const [minutes, setMinutes] = useState(3)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const p = PATTERNS[pattern]
  const total = minutes * 60
  const week = summarize(index, startOfWeek(), 7, profile)
  const month = summarize(index, addDays(new Date(), -29), 30, profile)

  useEffect(() => {
    if (!running) return
    startRef.current = Date.now() - elapsed * 1000
    const t = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000
      if (e >= total) {
        clearInterval(t)
        setRunning(false)
        setElapsed(0)
        chime()
        actions.addMindful({ minutes, kind: pattern })
        notify(`🌿 ${minutes} mindful minute${minutes === 1 ? '' : 's'}. Well done for taking a pause.`)
        return
      }
      setElapsed(e)
    }, 100)
    return () => clearInterval(t)
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  let phaseLabel = 'Ready when you are'
  let scale = 0.7
  let phaseDur = 4
  if (running && p.phases) {
    const cycle = p.phases.reduce((s, x) => s + x[1], 0)
    let t = elapsed % cycle
    for (const [label, dur, target] of p.phases) {
      if (t < dur) {
        phaseLabel = label
        scale = target
        phaseDur = dur
        break
      }
      t -= dur
    }
  } else if (running) {
    phaseLabel = 'Just breathe'
    scale = 0.85
  }

  function stop() {
    setRunning(false)
    const m = Math.floor(elapsed / 60)
    if (m >= 1) {
      actions.addMindful({ minutes: m, kind: pattern })
      notify(`🌿 ${m} mindful minute${m === 1 ? '' : 's'} logged.`)
    }
    setElapsed(0)
  }

  return (
    <section className="page narrow">
      <PageHeader eyebrow="Mind" title="Mindfulness">A few calm breaths lower stress, improve focus and can even raise your HRV over time.</PageHeader>

      <div className="stats three">
        <Stat label="This week" value={fmtDuration(week.mindfulMin)} />
        <Stat label="Last 30 days" value={fmtDuration(month.mindfulMin)} />
        <Stat label="Mood · 30 days" value={month.avgMood ? `${month.avgMood.toFixed(1)} / 5` : '—'} sub={<Link to="/journal">Check in on the journal</Link>} />
      </div>

      <section className="card pad breathe-card">
        {!running && (
          <div className="stack-sm">
            <Segmented value={pattern} onChange={setPattern} label="Exercise" options={Object.entries(PATTERNS).map(([value, x]) => ({ value, label: x.name }))} />
            <p className="muted small center">{p.desc}</p>
            <Segmented small value={minutes} onChange={setMinutes} label="Length" options={[1, 3, 5, 10].map((m) => ({ value: m, label: `${m} min` }))} />
          </div>
        )}
        <div className="breathe-stage" aria-live="polite">
          <div className="breathe-circle" style={{ transform: `scale(${scale})`, transitionDuration: `${running ? phaseDur : 0.6}s` }} />
          <div className="breathe-text">
            <strong>{phaseLabel}</strong>
            {running && <small>{fmtClock(total - elapsed)} left</small>}
          </div>
        </div>
        <div className="row center gap">
          {running ? (
            <button className="btn ghost" onClick={stop}>End session</button>
          ) : (
            <button className="btn primary big" onClick={() => setRunning(true)}>Begin {minutes}-minute session</button>
          )}
        </div>
      </section>

      <section className="card pad">
        <h3>Why it helps</h3>
        <ul className="tips">
          <li><span aria-hidden>❤️</span><span><strong>Calms your heart.</strong> Slow breathing (about 6 breaths a minute) activates the body’s relaxation response.</span></li>
          <li><span aria-hidden>😴</span><span><strong>Better sleep.</strong> A short session before bed makes it easier to fall asleep.</span></li>
          <li><span aria-hidden>🏃</span><span><strong>Faster recovery.</strong> Lower stress means your body can put more energy into adapting to training.</span></li>
        </ul>
      </section>
    </section>
  )
}
