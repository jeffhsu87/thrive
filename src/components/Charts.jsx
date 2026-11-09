import { useLayoutEffect, useRef, useState } from 'react'
import { TableIcon } from './Icons.jsx'
import InfoTip from './InfoTip.jsx'

// Hand-built SVG charts. Marks: bars ≤24px with 4px rounded data-ends, 2px lines, ≥8px dots with a
// surface ring, hairline grid. Every chart has a hover/focus tooltip and its card offers a table view.

export function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function niceStep(raw) {
  if (!(raw > 0)) return 1
  const p = 10 ** Math.floor(Math.log10(raw))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

export function scale(min, max, count = 4) {
  if (max === min) max = min + 1
  const step = niceStep((max - min) / count)
  const lo = Math.floor(min / step + 1e-9) * step
  const hi = Math.ceil(max / step - 1e-9) * step
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { lo, hi, ticks }
}

export const compact = (v) => {
  const a = Math.abs(v)
  if (a >= 1e6) return `${Math.round((v / 1e6) * 10) / 10}M`
  if (a >= 1e4) return `${Math.round((v / 1e3) * 10) / 10}K`
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

const barPath = (x, y, w, h, r = 4) => {
  r = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function Tip({ x, y, width, children }) {
  const left = Math.min(Math.max(x, 80), Math.max(80, width - 80))
  return (
    <div className="viz-tip" style={{ left, top: y }} role="status">
      {children}
    </div>
  )
}

const showLabel = (i, n, every) => (n - 1 - i) % every === 0

export function Legend({ items }) {
  return (
    <ul className="viz-legend">
      {items.map((it) => (
        <li key={it.label}>
          <span className={`key ${it.shape || 'rect'}`} style={{ background: it.color }} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

/** Single-series column chart. data: [{ key, label, value, tip?, color? }] */
export function BarChart({ data, height = 170, format = compact, color = 'var(--series-1)', goal, goalLabel = 'Goal', label, tickFormat = compact }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const padL = 40, padR = 10, padT = 14, padB = 24
  const vals = data.map((d) => d.value).filter((v) => v != null)
  const { hi, ticks } = scale(0, Math.max(goal || 0, ...vals, 0) || 1, 3)
  const innerW = Math.max(0, w - padL - padR)
  const innerH = height - padT - padB
  const band = innerW / Math.max(data.length, 1)
  const barW = Math.min(24, Math.max(3, band * 0.62))
  const y = (v) => padT + innerH - (v / hi) * innerH
  const every = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 46)))
  return (
    <div className="viz" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-base' : 'viz-grid'} />
              <text x={padL - 7} y={y(t)} className="viz-tick" textAnchor="end" dominantBaseline="middle">{tickFormat(t)}</text>
            </g>
          ))}
          {goal != null && goal > 0 && (
            <g>
              <line x1={padL} x2={w - padR} y1={y(goal)} y2={y(goal)} className="viz-goal" />
              <text x={w - padR} y={y(goal) - 5} className="viz-goal-label" textAnchor="end">{goalLabel}</text>
            </g>
          )}
          {data.map((d, i) => {
            const cx = padL + band * i + band / 2
            const h = d.value > 0 ? (d.value / hi) * innerH : 0
            return (
              <g key={d.key}>
                {h > 0 && <path d={barPath(cx - barW / 2, y(d.value), barW, h)} fill={d.color || color} className={'viz-bar' + (hover === i ? ' is-hover' : '')} />}
                {showLabel(i, data.length, every) && (
                  <text x={cx} y={height - 6} className="viz-tick" textAnchor="middle">{d.label}</text>
                )}
                <rect
                  x={padL + band * i}
                  y={padT}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.tip || d.label}: ${d.value == null ? 'no data' : format(d.value)}`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {hover != null && data[hover] && (
        <Tip x={padL + band * hover + band / 2} y={data[hover].value ? y(data[hover].value) : y(0)} width={w}>
          <strong>{data[hover].value == null ? 'No data' : format(data[hover].value)}</strong>
          <span>{data[hover].tip || data[hover].label}</span>
        </Tip>
      )}
    </div>
  )
}

/** Stacked columns. data: [{ key, label, tip?, parts: { [k]: value } }], keys: [{ key, label, color }] */
export function StackedBars({ data, keys, height = 190, format = compact, goal, goalLabel = 'Goal', label, tickFormat = compact }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const padL = 40, padR = 10, padT = 14, padB = 24
  const totals = data.map((d) => keys.reduce((s, k) => s + (d.parts?.[k.key] || 0), 0))
  const { hi, ticks } = scale(0, Math.max(goal || 0, ...totals, 0) || 1, 3)
  const innerW = Math.max(0, w - padL - padR)
  const innerH = height - padT - padB
  const band = innerW / Math.max(data.length, 1)
  const barW = Math.min(24, Math.max(3, band * 0.62))
  const y = (v) => padT + innerH - (v / hi) * innerH
  const every = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 46)))
  return (
    <div>
      <div className="viz" ref={ref} style={{ height }}>
        {w > 0 && (
          <svg width={w} height={height} role="img" aria-label={label}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-base' : 'viz-grid'} />
                <text x={padL - 7} y={y(t)} className="viz-tick" textAnchor="end" dominantBaseline="middle">{tickFormat(t)}</text>
              </g>
            ))}
            {goal != null && goal > 0 && (
              <g>
                <line x1={padL} x2={w - padR} y1={y(goal)} y2={y(goal)} className="viz-goal" />
                <text x={w - padR} y={y(goal) - 5} className="viz-goal-label" textAnchor="end">{goalLabel}</text>
              </g>
            )}
            {data.map((d, i) => {
              const cx = padL + band * i + band / 2
              let acc = 0
              const present = keys.filter((k) => d.parts?.[k.key] > 0)
              return (
                <g key={d.key} className={hover === i ? 'is-hover' : ''}>
                  {present.map((k, j) => {
                    const v = d.parts[k.key]
                    const top = y(acc + v)
                    const bottom = y(acc)
                    acc += v
                    const isTop = j === present.length - 1
                    const gap = isTop ? 0 : 2
                    const h = Math.max(0, bottom - top - gap)
                    if (h <= 0) return null
                    return isTop ? (
                      <path key={k.key} d={barPath(cx - barW / 2, top, barW, h)} fill={k.color} className="viz-bar" />
                    ) : (
                      <rect key={k.key} x={cx - barW / 2} y={top + gap} width={barW} height={h} fill={k.color} className="viz-bar" />
                    )
                  })}
                  {showLabel(i, data.length, every) && <text x={cx} y={height - 6} className="viz-tick" textAnchor="middle">{d.label}</text>}
                  <rect
                    x={padL + band * i}
                    y={padT}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.tip || d.label}: ${keys.map((k) => `${k.label} ${format(d.parts?.[k.key] || 0)}`).join(', ')}`}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              )
            })}
          </svg>
        )}
        {hover != null && data[hover] && (
          <Tip x={padL + band * hover + band / 2} y={y(totals[hover])} width={w}>
            <span className="tip-head">{data[hover].tip || data[hover].label}</span>
            {totals[hover] ? (
              [...keys].reverse().map((k) =>
                data[hover].parts?.[k.key] ? (
                  <span key={k.key} className="tip-row">
                    <i style={{ background: k.color }} />
                    <strong>{format(data[hover].parts[k.key])}</strong> {k.label}
                  </span>
                ) : null
              )
            ) : (
              <strong>No data</strong>
            )}
          </Tip>
        )}
      </div>
      <Legend items={keys.map((k) => ({ label: k.label, color: k.color }))} />
    </div>
  )
}

/** Multi-series line chart with crosshair. data: [{ key, label, tip?, [seriesKey]: value }] */
export function LineChart({ data, series, height = 180, format = compact, label, zeroBase = false, band, tickFormat = compact, yDomain }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const padL = 40, padR = 14, padT = 14, padB = 24
  const vals = data.flatMap((d) => series.map((s) => d[s.key])).filter((v) => v != null)
  let lo = yDomain ? yDomain[0] : Math.min(...vals, band ? band.lo : Infinity)
  let hiRaw = yDomain ? yDomain[1] : Math.max(...vals, band ? band.hi : -Infinity)
  if (!vals.length) {
    lo = 0
    hiRaw = 1
  }
  if (zeroBase) lo = 0
  else if (!yDomain) {
    const pad = (hiRaw - lo) * 0.15 || Math.abs(hiRaw) * 0.1 || 1
    lo -= pad
    hiRaw += pad
  }
  const sc = scale(lo, hiRaw, 3)
  const innerW = Math.max(0, w - padL - padR)
  const innerH = height - padT - padB
  const x = (i) => padL + (data.length <= 1 ? innerW / 2 : (i * innerW) / (data.length - 1))
  const y = (v) => padT + innerH - ((v - sc.lo) / (sc.hi - sc.lo)) * innerH
  const every = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 52)))

  const pathFor = (key) => {
    let d = ''
    let pen = false
    data.forEach((row, i) => {
      const v = row[key]
      if (v == null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i)},${y(v)}`
      pen = true
    })
    return d
  }
  const isolated = (key) => data.map((row, i) => (row[key] != null && data[i - 1]?.[key] == null && data[i + 1]?.[key] == null ? i : null)).filter((i) => i != null)
  const lastIndex = (key) => {
    for (let i = data.length - 1; i >= 0; i--) if (data[i][key] != null) return i
    return null
  }

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = data.length <= 1 ? 0 : Math.round(((px - padL) / innerW) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }
  function onKey(e) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1))
    if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? data.length) - 1))
  }

  return (
    <div>
      <div className="viz" ref={ref} style={{ height }}>
        {w > 0 && (
          <svg
            width={w}
            height={height}
            role="img"
            aria-label={label}
            tabIndex={0}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          >
            {band && (
              <rect x={padL} width={innerW} y={y(band.hi)} height={Math.max(0, y(band.lo) - y(band.hi))} className="viz-band" />
            )}
            {sc.ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="viz-grid" />
                <text x={padL - 7} y={y(t)} className="viz-tick" textAnchor="end" dominantBaseline="middle">{tickFormat(t)}</text>
              </g>
            ))}
            {data.map((row, i) =>
              showLabel(i, data.length, every) ? (
                <text key={row.key} x={x(i)} y={height - 6} className="viz-tick" textAnchor="middle">{row.label}</text>
              ) : null
            )}
            {series.map((s) => (
              <g key={s.key}>
                {s.area && (
                  <path d={`${pathFor(s.key)}V${y(sc.lo)}H${x(data.findIndex((r) => r[s.key] != null))}Z`} fill={s.color} opacity="0.1" />
                )}
                <path d={pathFor(s.key)} fill="none" stroke={s.color} className="viz-line" />
                {isolated(s.key).map((i) => (
                  <circle key={i} cx={x(i)} cy={y(data[i][s.key])} r="3" fill={s.color} />
                ))}
                {lastIndex(s.key) != null && hover == null && (
                  <circle cx={x(lastIndex(s.key))} cy={y(data[lastIndex(s.key)][s.key])} r="4" fill={s.color} className="viz-dot" />
                )}
              </g>
            ))}
            {hover != null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} className="viz-cross" />
                {series.map((s) =>
                  data[hover][s.key] != null ? <circle key={s.key} cx={x(hover)} cy={y(data[hover][s.key])} r="4.5" fill={s.color} className="viz-dot" /> : null
                )}
              </g>
            )}
          </svg>
        )}
        {hover != null && data[hover] && (
          <Tip x={x(hover)} y={padT + 4} width={w}>
            <span className="tip-head">{data[hover].tip || data[hover].label}</span>
            {series.map((s) => (
              <span key={s.key} className="tip-row">
                <i className="line" style={{ background: s.color }} />
                <strong>{data[hover][s.key] == null ? '—' : format(data[hover][s.key], s.key)}</strong>
                {series.length > 1 || s.label ? ` ${s.label || ''}` : ''}
              </span>
            ))}
          </Tip>
        )}
      </div>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color, shape: 'line' }))} />}
      {band?.label && <p className="viz-note"><span className="band-key" /> {band.label}</p>}
    </div>
  )
}

/** Floating columns between two values, e.g. bedtime → wake time. data: [{ key, label, start, end, tip }] */
export function RangeBars({ data, height = 190, tickFormat, format, label, color = 'var(--series-1)' }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const padL = 58, padR = 10, padT = 10, padB = 24
  const valid = data.filter((d) => d.start != null && d.end != null)
  const lo = Math.min(...valid.map((d) => d.start), 300)
  const hiV = Math.max(...valid.map((d) => d.end), 720)
  const step = 120
  const sLo = Math.floor(lo / step) * step
  const sHi = Math.ceil(hiV / step) * step
  const ticks = []
  for (let v = sLo; v <= sHi; v += step) ticks.push(v)
  const innerW = Math.max(0, w - padL - padR)
  const innerH = height - padT - padB
  const y = (v) => padT + ((v - sLo) / (sHi - sLo)) * innerH
  const bandW = innerW / Math.max(data.length, 1)
  const barW = Math.min(16, Math.max(3, bandW * 0.55))
  const every = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 46)))
  return (
    <div className="viz" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="viz-grid" />
              <text x={padL - 7} y={y(t)} className="viz-tick" textAnchor="end" dominantBaseline="middle">{tickFormat(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + bandW * i + bandW / 2
            return (
              <g key={d.key}>
                {d.start != null && d.end != null && (
                  <rect x={cx - barW / 2} y={y(d.start)} width={barW} height={Math.max(2, y(d.end) - y(d.start))} rx={Math.min(4, barW / 2)} fill={color} className={'viz-bar' + (hover === i ? ' is-hover' : '')} />
                )}
                {showLabel(i, data.length, every) && <text x={cx} y={height - 6} className="viz-tick" textAnchor="middle">{d.label}</text>}
                <rect
                  x={padL + bandW * i}
                  y={padT}
                  width={bandW}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.tip || d.label}: ${d.start == null ? 'no data' : format(d)}`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {hover != null && data[hover] && (
        <Tip x={padL + bandW * hover + bandW / 2} y={data[hover].start != null ? y(data[hover].start) : padT + 10} width={w}>
          <strong>{data[hover].start == null ? 'No data' : format(data[hover])}</strong>
          <span>{data[hover].tip || data[hover].label}</span>
        </Tip>
      )}
    </div>
  )
}

export const STAGE_KEYS = [
  { key: 'awake', label: 'Awake', color: 'var(--stage-awake)' },
  { key: 'rem', label: 'REM', color: 'var(--stage-rem)' },
  { key: 'light', label: 'Light', color: 'var(--stage-light)' },
  { key: 'deep', label: 'Deep', color: 'var(--stage-deep)' },
]

/** Sleep stages through the night. segments: [{ stage, min }] */
export function Hypnogram({ segments, bedtime, height = 150 }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const padL = 50, padR = 10, padT = 6, padB = 22
  const total = segments.reduce((s, x) => s + x.min, 0) || 1
  const innerW = Math.max(0, w - padL - padR)
  const rowH = (height - padT - padB) / 4
  const rows = { awake: 0, rem: 1, light: 2, deep: 3 }
  const start = new Date(bedtime).getTime()
  let acc = 0
  const segs = segments.map((s) => {
    const out = { ...s, x0: acc }
    acc += s.min
    return out
  })
  const xOf = (min) => padL + (min / total) * innerW
  const firstHour = Math.ceil(start / 3600000) * 3600000
  const hourTicks = []
  for (let t = firstHour; t < start + total * 60000; t += 3600000) hourTicks.push(t)
  const tickEvery = Math.ceil(hourTicks.length / Math.max(1, Math.floor(innerW / 50)))
  const fmt = (t) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric' })
  return (
    <div>
      <div className="viz" ref={ref} style={{ height }}>
        {w > 0 && (
          <svg width={w} height={height} role="img" aria-label="Sleep stages through the night">
            {STAGE_KEYS.map((k) => (
              <text key={k.key} x={padL - 8} y={padT + rows[k.key] * rowH + rowH / 2} className="viz-tick" textAnchor="end" dominantBaseline="middle">{k.label}</text>
            ))}
            {hourTicks.map((t, i) =>
              i % tickEvery === 0 ? (
                <g key={t}>
                  <line x1={xOf((t - start) / 60000)} x2={xOf((t - start) / 60000)} y1={padT} y2={height - padB} className="viz-grid" />
                  <text x={xOf((t - start) / 60000)} y={height - 6} className="viz-tick" textAnchor="middle">{fmt(t)}</text>
                </g>
              ) : null
            )}
            {segs.map((s, i) => {
              const k = STAGE_KEYS.find((x) => x.key === s.stage)
              return (
                <rect
                  key={i}
                  x={xOf(s.x0)}
                  y={padT + rows[s.stage] * rowH + 3}
                  width={Math.max(1, xOf(s.x0 + s.min) - xOf(s.x0) - 1)}
                  height={rowH - 6}
                  rx="2"
                  fill={k?.color}
                  className={'viz-bar' + (hover === i ? ' is-hover' : '')}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              )
            })}
          </svg>
        )}
        {hover != null && segs[hover] && (
          <Tip x={(xOf(segs[hover].x0) + xOf(segs[hover].x0 + segs[hover].min)) / 2} y={padT + rows[segs[hover].stage] * rowH} width={w}>
            <strong>{segs[hover].min} min</strong>
            <span>
              {STAGE_KEYS.find((k) => k.key === segs[hover].stage)?.label} · {new Date(start + segs[hover].x0 * 60000).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
          </Tip>
        )}
      </div>
    </div>
  )
}

/** Circular progress. The track is a light step of the same color. */
export function Ring({ value, max = 100, size = 116, stroke = 10, color = 'var(--series-1)', label, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min((value || 0) / max, 1))
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: `color-mix(in srgb, ${color} 18%, var(--surface))` }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={pct > 0 ? 'ring-progress' : undefined}
          style={{ transition: 'stroke-dashoffset 0.6s ease', color }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/** Thin progress meter. */
export function Meter({ value, max, color = 'var(--accent)', label, height = 8 }) {
  const pct = max ? Math.max(0, Math.min(value / max, 1)) : 0
  return (
    <div className="meter" style={{ height, '--meter': color }} role="meter" aria-valuenow={Math.round(value || 0)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <span style={{ width: `${pct * 100}%` }} />
    </div>
  )
}

/** One whole split into parts (thin, 8px). parts: [{ label, value, color }] */
export function SegmentedBar({ parts, format = (v) => v, legend = true }) {
  const total = parts.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div>
      <div className="segbar" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(', ')}>
        {parts.map((p) =>
          p.value > 0 ? <span key={p.label} style={{ flexGrow: p.value, background: p.color }} title={`${p.label}: ${format(p.value)} (${Math.round((p.value / total) * 100)}%)`} /> : null
        )}
      </div>
      {legend && (
        <ul className="viz-legend">
          {parts.map((p) => (
            <li key={p.label}>
              <span className="key rect" style={{ background: p.color }} aria-hidden />
              {p.label} <strong>{format(p.value)}</strong>
              {total > 0 && <span className="muted"> · {Math.round(((p.value || 0) / total) * 100)}%</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Sparkline({ values, width = 96, height = 28, color = 'var(--series-1)' }) {
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v != null)
  if (pts.length < 2) return <svg width={width} height={height} aria-hidden />
  const min = Math.min(...pts.map((p) => p[1]))
  const max = Math.max(...pts.map((p) => p[1]))
  const x = (i) => 4 + (i / (values.length - 1)) * (width - 8)
  const y = (v) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8)
  const d = pts.map(([i, v], j) => `${j ? 'L' : 'M'}${x(i)},${y(v)}`).join('')
  const [li, lv] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} aria-hidden className="sparkline">
      <path d={d} fill="none" stroke="var(--spark)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(li)} cy={y(lv)} r="3" fill={color} />
    </svg>
  )
}

/** Card wrapper with title, optional info tip, and a table view toggle for accessibility. */
export function ChartCard({ title, subtitle, info, table, actions, children, className = '' }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section className={`card chart-card ${className}`}>
      <header className="chart-head">
        <div>
          <h3>
            {title} {info && <InfoTip term={info} />}
          </h3>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <div className="chart-actions">
          {actions}
          {table && (
            <button className={'icon-btn' + (asTable ? ' active' : '')} onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} title={asTable ? 'Show chart' : 'Show as table'}>
              <TableIcon width={16} height={16} />
            </button>
          )}
        </div>
      </header>
      {asTable && table ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}
