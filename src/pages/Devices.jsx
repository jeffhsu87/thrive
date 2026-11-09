import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { BluetoothIcon, UploadIcon } from '../components/Icons.jsx'
import { useFeedback, useHealth } from '../store/Health.jsx'
import { CAP_LABELS, DEVICES } from '../lib/devices.js'
import { CSV_TEMPLATE, importFile } from '../lib/importers.js'
import { bleSupported, connectHeartRate } from '../lib/ble.js'
import { sportFor } from '../lib/sports.js'

const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 1440) return `${Math.round(m / 60)} h ago`
  return new Date(iso).toLocaleDateString()
}

function HeartStrapCard() {
  const [dev, setDev] = useState(null)
  const [bpm, setBpm] = useState(null)
  const [err, setErr] = useState('')
  async function pair() {
    setErr('')
    try {
      const d = await connectHeartRate({ onBpm: setBpm, onDisconnect: () => { setDev(null); setBpm(null) } })
      setDev(d)
    } catch (e) {
      if (e?.name !== 'NotFoundError') setErr(e?.message || 'Could not connect.')
    }
  }
  return (
    <article className="card device-card live-device">
      <header>
        <span className="device-mark" aria-hidden><BluetoothIcon /></span>
        <div>
          <h3>Heart rate monitor</h3>
          <p className="muted small">Chest strap · arm band · broadcast mode</p>
        </div>
        {dev && <span className="connected-pill">● Live</span>}
      </header>
      <p className="small">Connects for real over Bluetooth: Polar H10/H9, Garmin HRM, Wahoo TICKR, Coospo, Scosche, and watches set to broadcast heart rate (Garmin, Polar, WHOOP, COROS).</p>
      {dev ? (
        <div className="live-bpm">
          <span className="beat" aria-hidden>♥</span>
          <strong>{bpm ?? '—'}</strong> bpm · {dev.name}
          {dev.battery != null && <span className="muted small"> · battery {dev.battery}%</span>}
        </div>
      ) : null}
      <div className="row gap wrap">
        {bleSupported() ? (
          dev ? (
            <button className="btn ghost" onClick={() => dev.disconnect()}>Disconnect</button>
          ) : (
            <button className="btn primary" onClick={pair}>Pair & test</button>
          )
        ) : (
          <p className="muted small">Bluetooth needs Chrome or Edge (desktop or Android). Safari and iOS do not support it yet.</p>
        )}
        <Link className="btn ghost" to="/activity/live">Use in a live workout</Link>
      </div>
      {err && <p className="error small">{err}</p>}
    </article>
  )
}

function ImportPanel() {
  const { actions } = useHealth()
  const { notify } = useFeedback()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const input = useRef(null)

  async function handle(files) {
    setError('')
    setBusy(true)
    const merged = { activities: [], sleep: [], daily: [], names: [] }
    try {
      for (const f of files) {
        setProgress(f.size > 5e6 ? 0 : null)
        const r = await importFile(f, (p) => setProgress(p))
        merged.activities.push(...r.activities)
        merged.sleep.push(...r.sleep)
        merged.daily.push(...r.daily)
        merged.names.push(f.name)
      }
      if (!merged.activities.length && !merged.sleep.length && !merged.daily.length) throw new Error('No workouts, sleep or health data were found in that file.')
      setPreview(merged)
    } catch (e) {
      setError(e.message || 'Import failed.')
    } finally {
      setBusy(false)
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  function confirm() {
    actions.importRecords(preview, preview.names.join(', '))
    notify(`📥 Imported ${preview.activities.length} workouts, ${preview.sleep.length} nights and ${preview.daily.length} days of health data`)
    setPreview(null)
  }

  const dateRange = (list, f) => {
    const ds = list.map(f).filter(Boolean).sort()
    return ds.length ? `${new Date(ds[0]).toLocaleDateString()} – ${new Date(ds[ds.length - 1]).toLocaleDateString()}` : ''
  }

  return (
    <section className="card pad">
      <h3><UploadIcon width={18} height={18} /> Import from files</h3>
      <p className="muted small">Bring in your history from any device. Files are read on this computer and never uploaded anywhere.</p>
      <div
        className={'dropzone' + (drag ? ' drag' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle([...e.dataTransfer.files]) }}
      >
        <p><strong>Drop files here</strong> or</p>
        <button className="btn primary" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Reading…' : 'Choose files'}</button>
        <input ref={input} type="file" multiple hidden accept=".gpx,.tcx,.csv,.xml,.txt" onChange={(e) => handle([...e.target.files])} />
        <p className="muted small">GPX · TCX · CSV (WHOOP, Oura, Garmin, Fitbit, Strava, Peloton…) · Apple Health export.xml</p>
        {progress != null && <progress value={progress} max={1} aria-label="Import progress" />}
      </div>
      {error && <p className="error small">{error}</p>}
      <details className="disclosure plain">
        <summary>Making your own CSV?</summary>
        <p className="small muted">Use a header row like this. Columns are matched by name, so order does not matter.</p>
        <pre className="code">{CSV_TEMPLATE}</pre>
      </details>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Ready to import">
        {preview && (
          <div className="stack">
            <ul className="kv">
              <li><span>Workouts</span><strong>{preview.activities.length}</strong></li>
              <li><span>Nights of sleep</span><strong>{preview.sleep.length}</strong></li>
              <li><span>Days of health data</span><strong>{preview.daily.length}</strong></li>
            </ul>
            {preview.activities.length > 0 && (
              <p className="muted small">
                {dateRange(preview.activities, (a) => a.start)} · {[...new Set(preview.activities.map((a) => sportFor(a.sport).name))].slice(0, 5).join(', ')}
              </p>
            )}
            <p className="muted small">Duplicates of workouts you already have are skipped automatically.</p>
            <div className="form-actions">
              <button className="btn ghost" onClick={() => setPreview(null)}>Cancel</button>
              <button className="btn primary" onClick={confirm}>Import</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

export default function Devices() {
  const { devices, actions, activities, sleep, daily } = useHealth()
  const { notify } = useFeedback()
  const [info, setInfo] = useState(null)
  const counts = (src) => ({ a: activities.filter((x) => x.source === src).length, s: sleep.filter((x) => x.source === src).length, d: daily.filter((x) => x.source === src).length })

  function connect(dev) {
    const data = actions.connectDemo(dev.id)
    notify(`⌚ ${dev.name} connected (demo): ${data.activities.length} workouts and ${data.sleep.length} nights added`)
  }

  const imported = counts('import')

  return (
    <section className="page">
      <PageHeader eyebrow="Setup" title="Devices & import">Connect the gear you already use. The more data, the smarter your insights.</PageHeader>

      <div className="notice">
        <strong>About connections:</strong> live syncing with WHOOP, Garmin, Oura, Fitbit and others needs an account with each company’s developer program and a server, which this version does not have yet. For now, <strong>Connect</strong> adds realistic <em>sample</em> data so you can explore, and <strong>Import</strong> below brings in your <em>real</em> history from exported files. Heart rate monitors connect for real over Bluetooth.
      </div>

      <div className="two-col">
        <HeartStrapCard />
        <ImportPanel />
      </div>

      {imported.a + imported.s + imported.d > 0 && (
        <section className="card pad">
          <h3>Imported data</h3>
          <ul className="kv">
            <li>
              <span>From files{devices.import?.lastSync ? ` · last import ${ago(devices.import.lastSync)}` : ''}</span>
              <span className="row gap">
                <strong>{imported.a} workouts · {imported.s} nights · {imported.d} days</strong>
                <button
                  className="link-btn danger"
                  onClick={() => {
                    actions.disconnect('import')
                    notify('Imported data removed')
                  }}
                >
                  Remove
                </button>
              </span>
            </li>
          </ul>
        </section>
      )}

      <h2 className="section-title">Wearables & apps</h2>
      <div className="device-grid">
        {DEVICES.map((dev) => {
          const st = devices[dev.id]
          const c = counts(dev.id)
          return (
            <article key={dev.id} className={'card device-card' + (st ? ' connected' : '')}>
              <header>
                <span className="device-mark" aria-hidden>{dev.mark || '⌚'}</span>
                <div>
                  <h3>{dev.name}</h3>
                  <p className="muted small">{dev.kind}</p>
                </div>
                {st && <span className="connected-pill">✓ {st.demo ? 'Demo' : 'Connected'}</span>}
              </header>
              <p className="small">{dev.blurb}</p>
              <div className="cap-chips">
                {dev.caps.map((c2) => <span key={c2} className="cap">{c2 === 'recovery' && dev.recoveryName ? dev.recoveryName : CAP_LABELS[c2]}</span>)}
              </div>
              {st && <p className="muted small">Synced {ago(st.lastSync)} · {c.a} workouts · {c.s} nights · {c.d} days</p>}
              <div className="row gap wrap">
                {st ? (
                  <>
                    <button className="btn ghost small" onClick={() => { actions.connectDemo(dev.id); notify(`${dev.name} synced`) }}>Sync now</button>
                    <button className="btn ghost small danger" onClick={() => { actions.disconnect(dev.id); notify(`${dev.name} disconnected and its sample data removed`) }}>Disconnect</button>
                  </>
                ) : (
                  <button className="btn primary small" onClick={() => connect(dev)}>Connect (demo)</button>
                )}
                <button className="link-btn" onClick={() => setInfo(dev)}>Import real data</button>
              </div>
            </article>
          )
        })}
      </div>

      <Modal open={!!info} onClose={() => setInfo(null)} title={info ? `Import from ${info.name}` : ''}>
        {info && (
          <div className="stack">
            <p>{info.importHint}</p>
            <p className="muted small">Then use <strong>Import from files</strong> on this page. Your files stay on this device.</p>
            <div className="form-actions">
              <button className="btn primary" onClick={() => setInfo(null)}>Got it</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
