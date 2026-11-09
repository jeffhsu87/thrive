import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { SportPicker } from '../components/forms/WorkoutForm.jsx'
import { BluetoothIcon, PauseIcon, PinIcon, PlayIcon, StopIcon } from '../components/Icons.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { bleSupported, connectHeartRate } from '../lib/ble.js'
import { FEELS, sportFor } from '../lib/sports.js'
import { ZONES, estimateCalories, haversineKm, maxHrOf, zoneOf } from '../lib/metrics.js'
import { fmtClock, fmtDist, fmtPace, fmtDuration } from '../lib/units.js'
import { workoutCheer } from '../lib/coach.js'
import { startOfWeek } from '../lib/date.js'
import { summarize } from '../lib/stats.js'
import { ZONE_COLORS } from './ActivityDetail.jsx'
import AssistantChat, { canSpeak, speak } from '../components/Assistant.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { recoveryStatus } from '../lib/metrics.js'
import { dayKey } from '../lib/date.js'

const SAMPLE_SEC = 5

export default function LiveWorkout() {
  const { profile, index, actions } = useHealth()
  const { notify } = useFeedback()
  const navigate = useNavigate()
  const u = profile.units
  const [sport, setSport] = useState(null)
  const [phase, setPhase] = useState('setup')
  const [elapsed, setElapsed] = useState(0)
  const [bpm, setBpm] = useState(null)
  const [hrDevice, setHrDevice] = useState(null)
  const [hrError, setHrError] = useState('')
  const [gps, setGps] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')
  const [km, setKm] = useState(0)
  const [laps, setLaps] = useState([])
  const [rpe, setRpe] = useState(null)
  const [cues, setCues] = useLocalStorage('live-voice-cues', false)
  const lastCue = useRef({ at: 0, warnAt: -999 })

  const r = useRef({ acc: 0, resumedAt: null, startedAt: null, samples: [], lastSample: 0, bpm: null, lastPos: null, km: 0, watch: null, wake: null, hr: null })
  const maxHr = maxHrOf(profile)

  useEffect(() => () => {
    const s = r.current
    if (s.watch != null) navigator.geolocation?.clearWatch(s.watch)
    s.hr?.disconnect()
    s.wake?.release?.()
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const t = setInterval(() => {
      const s = r.current
      const sec = s.acc + (Date.now() - s.resumedAt) / 1000
      setElapsed(sec)
      if (sec - s.lastSample >= SAMPLE_SEC) {
        s.samples.push(s.bpm)
        s.lastSample = sec
      }
    }, 500)
    return () => clearInterval(t)
  }, [phase])

  // Snapshot of the session for the coach, read whenever a question is asked.
  const liveRef = useRef(null)
  liveRef.current = () => {
    const s = r.current
    const bpms = s.samples.filter(Boolean)
    return {
      sport,
      phase,
      elapsedSec: elapsed,
      bpm,
      zone: bpm ? zoneOf(bpm, maxHr) : null,
      avgBpm: bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null,
      km: s.km,
      laps,
    }
  }
  const getLive = () => liveRef.current()

  // Optional spoken updates every 5 minutes, plus a warning if effort is too high for today's recovery.
  useEffect(() => {
    if (!cues || phase !== 'running') return
    const c = lastCue.current
    const mins = Math.floor(elapsed / 60)
    if (mins > 0 && mins % 5 === 0 && mins !== c.at) {
      c.at = mins
      const parts = [`${mins} minutes`]
      if (r.current.km > 0.05) parts.push(fmtDist(r.current.km, u, 2).replace(' km', ' kilometres').replace(' mi', ' miles'))
      if (bpm) parts.push(`heart rate ${bpm}, zone ${zoneOf(bpm, maxHr)}`)
      speak(parts.join(', ') + '.')
    }
    const rec = recoveryStatus(index.get(dayKey()).recovery)
    if (bpm && rec?.level === 'critical' && zoneOf(bpm, maxHr) >= 4 && elapsed - c.warnAt > 180) {
      c.warnAt = elapsed
      speak('Your recovery is low today. Ease off to an easy pace.')
    }
  }, [elapsed, cues, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pairHr() {
    setHrError('')
    try {
      const dev = await connectHeartRate({
        onBpm: (b) => {
          r.current.bpm = b
          setBpm(b)
        },
        onDisconnect: () => {
          setHrDevice(null)
          setBpm(null)
          r.current.bpm = null
        },
      })
      r.current.hr = dev
      setHrDevice(dev)
    } catch (e) {
      if (e?.name !== 'NotFoundError') setHrError(e?.message || 'Could not connect to the heart rate monitor.')
    }
  }

  function startGps() {
    if (!navigator.geolocation) return setGpsStatus('Location is not available in this browser.')
    setGpsStatus('Finding your location…')
    r.current.watch = navigator.geolocation.watchPosition(
      (p) => {
        const s = r.current
        setGpsStatus(`GPS ready · ±${Math.round(p.coords.accuracy)} m`)
        if (p.coords.accuracy > 35) return
        const pt = { lat: p.coords.latitude, lon: p.coords.longitude }
        // Only count movement while the clock is running (resumedAt is null before start and while paused).
        if (s.lastPos && s.resumedAt) {
          const d = haversineKm(s.lastPos, pt)
          if (d > 0.003 && d < 0.5) {
            s.km += d
            setKm(s.km)
          }
        }
        s.lastPos = pt
      },
      (err) => setGpsStatus(err.code === 1 ? 'Location permission was denied.' : 'Waiting for GPS signal…'),
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
    setGps(true)
  }

  async function begin() {
    const s = r.current
    s.startedAt = new Date()
    s.resumedAt = Date.now()
    setPhase('running')
    try {
      s.wake = await navigator.wakeLock?.request('screen')
    } catch {
      /* screen may sleep; recording continues */
    }
  }
  function pause() {
    const s = r.current
    s.acc += (Date.now() - s.resumedAt) / 1000
    s.resumedAt = null
    setPhase('paused')
  }
  function resume() {
    r.current.resumedAt = Date.now()
    setPhase('running')
  }
  function lap() {
    setLaps((l) => [...l, { t: elapsed, km: r.current.km }])
  }
  function finish() {
    if (phase === 'running') pause()
    if (r.current.watch != null) navigator.geolocation.clearWatch(r.current.watch)
    r.current.wake?.release?.()
    setPhase('done')
  }

  function build() {
    const s = r.current
    const bpms = s.samples.filter(Boolean)
    const a = {
      sport,
      start: s.startedAt.toISOString(),
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      distanceKm: s.km > 0.01 ? Math.round(s.km * 1000) / 1000 : null,
      avgHr: bpms.length ? Math.round(bpms.reduce((x, y) => x + y, 0) / bpms.length) : null,
      maxHr: bpms.length ? Math.max(...bpms) : null,
      hr: bpms.length ? { interval: SAMPLE_SEC, bpm: s.samples } : null,
      rpe,
      source: 'live',
      laps: laps.length || null,
    }
    return a
  }

  function save() {
    const a = actions.addActivity(build())
    r.current.hr?.disconnect()
    const n = summarize(index, startOfWeek(), 7, profile).workouts + 1
    notify(workoutCheer(a, n, profile))
    navigate(`/activity/${a.id}`)
  }

  if (!sport)
    return (
      <section className="page narrow">
        <Link to="/activity" className="link-btn back">← Activity</Link>
        <PageHeader eyebrow="Live workout" title="What are you doing?">Pick an activity, then pair a heart rate monitor or turn on GPS if you like.</PageHeader>
        <div className="card pad"><SportPicker onPick={setSport} /></div>
      </section>
    )

  const sp = sportFor(sport)
  const zone = bpm ? zoneOf(bpm, maxHr) : null
  const zoneInfo = zone ? ZONES[zone - 1] : null
  const pace = fmtPace(sp.pace || 'pace', elapsed / 60, km, u)

  if (phase === 'done') {
    const a = build()
    return (
      <section className="page narrow">
        <PageHeader eyebrow="Workout complete" title={`${sp.emoji} Great work!`}>Here is your summary. Add how it felt, then save.</PageHeader>
        <div className="card pad stack">
          <div className="stats three">
            <div className="stat"><span className="stat-label">Time</span><span className="stat-value">{fmtDuration(a.durationMin)}</span></div>
            <div className="stat"><span className="stat-label">Distance</span><span className="stat-value">{a.distanceKm ? fmtDist(a.distanceKm, u, 2) : '—'}</span></div>
            <div className="stat"><span className="stat-label">Avg heart rate</span><span className="stat-value">{a.avgHr ?? '—'}{a.avgHr && <small> bpm</small>}</span></div>
          </div>
          <p className="muted">About {estimateCalories(a, profile)} active calories.</p>
          <div className="feel-picker" role="radiogroup" aria-label="How did it feel?">
            {FEELS.map((x) => (
              <button type="button" key={x.value} role="radio" aria-checked={rpe === x.value} className={'feel' + (rpe === x.value ? ' selected' : '')} onClick={() => setRpe(x.value)}>
                <span aria-hidden>{x.emoji}</span>
                <small>{x.label}</small>
              </button>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn ghost danger" onClick={() => navigate('/activity')}>Discard</button>
            <button className="btn primary" onClick={save}>Save workout</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page narrow">
      <Link to="/activity" className="link-btn back">← Activity</Link>
      <div className="live card" style={zoneInfo ? { '--zone': ZONE_COLORS[zone] } : undefined}>
        <p className="eyebrow">{sp.emoji} {sp.name} {phase === 'paused' && '· Paused'}</p>
        <div className="live-clock" aria-live="off">{fmtClock(elapsed)}</div>
        <div className="live-metrics">
          <div>
            <span className="live-label">Heart rate</span>
            <span className="live-value">{bpm ?? '—'}<small> bpm</small></span>
            {zoneInfo && <span className="zone-pill">Zone {zone} · {zoneInfo.name}</span>}
          </div>
          <div>
            <span className="live-label">Distance</span>
            <span className="live-value">{gps ? fmtDist(km, u, 2) : '—'}</span>
            {gps && pace && <span className="muted small">{pace}</span>}
          </div>
        </div>
        {zoneInfo && <p className="muted small center">{zoneInfo.desc}</p>}
        <div className="live-controls">
          {phase === 'setup' && (
            <button className="btn primary big" onClick={begin}><PlayIcon /> Start</button>
          )}
          {phase === 'running' && (
            <>
              <button className="btn ghost big" onClick={lap}>Lap</button>
              <button className="btn primary big" onClick={pause}><PauseIcon /> Pause</button>
            </>
          )}
          {phase === 'paused' && (
            <>
              <button className="btn primary big" onClick={resume}><PlayIcon /> Resume</button>
              <button className="btn ghost big danger" onClick={finish}><StopIcon /> Finish</button>
            </>
          )}
        </div>
        {laps.length > 0 && (
          <ol className="laps">
            {laps.map((l, i) => (
              <li key={i}>Lap {i + 1}: {fmtClock(l.t - (laps[i - 1]?.t || 0))}{gps ? ` · ${fmtDist(l.km - (laps[i - 1]?.km || 0), u, 2)}` : ''}</li>
            ))}
          </ol>
        )}
      </div>

      <section className="card pad live-coach-card">
        <header className="row between wrap gap">
          <h3>Coach</h3>
          {canSpeak() && (
            <label className="switch-row inline small">
              <input type="checkbox" checked={cues} onChange={(e) => setCues(e.target.checked)} />
              <span>Spoken updates every 5 min</span>
            </label>
          )}
        </header>
        <AssistantChat mode="live" getLive={getLive} compact />
      </section>

      <div className="two-col">
        <section className="card pad">
          <h3><BluetoothIcon width={16} height={16} /> Heart rate monitor</h3>
          {hrDevice ? (
            <p>Connected to <strong>{hrDevice.name}</strong>{hrDevice.battery != null ? ` · battery ${hrDevice.battery}%` : ''}</p>
          ) : bleSupported() ? (
            <>
              <p className="muted small">Works with chest straps (Polar H10, Garmin HRM, Wahoo TICKR), arm bands, and watches set to broadcast heart rate.</p>
              <button className="btn ghost" onClick={pairHr}>Pair via Bluetooth</button>
            </>
          ) : (
            <p className="muted small">This browser does not support Bluetooth. Use Chrome or Edge on a computer or Android phone to pair a heart rate monitor.</p>
          )}
          {hrError && <p className="error small">{hrError}</p>}
        </section>
        <section className="card pad">
          <h3><PinIcon width={16} height={16} /> GPS distance</h3>
          {gps ? <p className="muted small">{gpsStatus}</p> : (
            <>
              <p className="muted small">Track distance and pace outdoors using this device’s location. Keep this page open while you move.</p>
              <button className="btn ghost" onClick={startGps}>Turn on GPS</button>
            </>
          )}
        </section>
      </div>
      {phase !== 'setup' && <button className="link-btn" onClick={finish}>Finish workout</button>}
    </section>
  )
}
