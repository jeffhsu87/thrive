// Parsers that turn exported files into this app's activity, sleep and daily-metric records.
import { dayKey, uid } from './date.js'
import { haversineKm } from './metrics.js'

const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// ---------- Sport name mapping ----------
const SPORT_WORDS = [
  [/trail/i, 'trail_run'], [/treadmill/i, 'treadmill'], [/run|jog/i, 'run'], [/mountain bik|mtb/i, 'mtb'],
  [/indoor.*(cycl|bik|rid)|spin|virtual ?ride|peloton/i, 'indoor_ride'], [/cycl|bik|ride|road/i, 'ride'],
  [/open.?water/i, 'open_water'], [/swim|pool/i, 'swim'], [/hik/i, 'hike'], [/walk/i, 'walk'], [/row/i, 'row'],
  [/ellip/i, 'elliptical'], [/stair/i, 'stairs'], [/hiit|interval/i, 'hiit'], [/cross ?fit|functional/i, 'functional'],
  [/strength|weight|lift|gym/i, 'strength'], [/yoga/i, 'yoga'], [/pilates/i, 'pilates'], [/stretch|mobility|flexib/i, 'stretching'],
  [/dance/i, 'dance'], [/climb/i, 'climb'], [/boulder/i, 'bouldering'], [/golf/i, 'golf'], [/soccer|football \(soccer\)/i, 'soccer'],
  [/basketball/i, 'basketball'], [/volleyball/i, 'volleyball'], [/american football/i, 'football'], [/tennis/i, 'tennis'],
  [/pickleball/i, 'pickleball'], [/badminton/i, 'badminton'], [/squash/i, 'squash'], [/table.?tennis|ping/i, 'table_tennis'],
  [/padel/i, 'padel'], [/hockey/i, 'hockey'], [/rugby/i, 'rugby'], [/baseball|softball/i, 'baseball'], [/cricket/i, 'cricket'],
  [/ski.*cross|cross.?country|nordic/i, 'xc_ski'], [/snowboard/i, 'snowboard'], [/ski/i, 'ski'], [/skat/i, 'ice_skate'],
  [/box/i, 'boxing'], [/kickbox/i, 'kickboxing'], [/martial|karate|taekwondo|judo/i, 'martial_arts'], [/jiu|bjj/i, 'bjj'],
  [/surf/i, 'surf'], [/paddle|sup/i, 'sup'], [/kayak|canoe/i, 'kayak'], [/jump.?rope/i, 'jump_rope'], [/wheelchair/i, 'wheelchair'],
]
export function mapSport(name) {
  if (!name) return 'other'
  const clean = String(name).replace(/^HKWorkoutActivityType/, '').replace(/([a-z])([A-Z])/g, '$1 $2')
  if (/traditional strength|functional strength/i.test(clean)) return 'strength'
  for (const [re, id] of SPORT_WORDS) if (re.test(clean)) return id
  return 'other'
}

// ---------- GPX / TCX ----------
const firstText = (el, name) => {
  const found = el.getElementsByTagNameNS('*', name)[0]
  return found ? found.textContent : null
}

function resampleHr(points, startMs, durationSec) {
  const interval = durationSec > 4 * 3600 ? 60 : durationSec > 3600 ? 20 : 10
  const buckets = Math.ceil(durationSec / interval) || 1
  const sums = new Array(buckets).fill(0)
  const counts = new Array(buckets).fill(0)
  points.forEach((p) => {
    if (!p.hr || !p.t) return
    const i = Math.min(buckets - 1, Math.floor((p.t - startMs) / 1000 / interval))
    if (i < 0) return
    sums[i] += p.hr
    counts[i]++
  })
  let last = null
  const bpm = sums.map((s, i) => {
    if (counts[i]) last = Math.round(s / counts[i])
    return last
  })
  return bpm.some(Boolean) ? { interval, bpm } : null
}

function summarizeTrack(points, sport, extra = {}) {
  const timed = points.filter((p) => p.t)
  if (!timed.length) return null
  const startMs = timed[0].t
  const endMs = timed[timed.length - 1].t
  const durationSec = Math.max(60, (endMs - startMs) / 1000)
  let dist = 0
  let gain = 0
  let lastEle = null
  for (let i = 1; i < points.length; i++) {
    if (points[i].lat != null && points[i - 1].lat != null) dist += haversineKm(points[i - 1], points[i])
  }
  points.forEach((p) => {
    if (p.ele == null) return
    if (lastEle != null && p.ele - lastEle > 0.5) gain += p.ele - lastEle
    if (lastEle == null || Math.abs(p.ele - lastEle) > 0.5) lastEle = p.ele
  })
  const hrs = points.map((p) => p.hr).filter(Boolean)
  const cads = points.map((p) => p.cad).filter(Boolean)
  const watts = points.map((p) => p.watts).filter((w) => w != null)
  const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null)
  return {
    id: uid(),
    sport,
    start: new Date(startMs).toISOString(),
    durationMin: Math.round(durationSec / 60),
    distanceKm: extra.distanceKm ?? (dist ? Math.round(dist * 100) / 100 : null),
    elevationM: gain ? Math.round(gain) : null,
    avgHr: avg(hrs),
    maxHr: hrs.length ? Math.max(...hrs) : null,
    cadence: avg(cads),
    avgPower: avg(watts),
    calories: extra.calories ?? null,
    hr: resampleHr(points, startMs, durationSec),
    title: extra.title || null,
    source: 'import',
  }
}

export function parseGPX(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This GPX file could not be read.')
  const tracks = [...doc.getElementsByTagNameNS('*', 'trk')]
  return tracks
    .map((trk) => {
      const pts = [...trk.getElementsByTagNameNS('*', 'trkpt')].map((p) => ({
        lat: num(p.getAttribute('lat')),
        lon: num(p.getAttribute('lon')),
        ele: num(firstText(p, 'ele')),
        t: firstText(p, 'time') ? Date.parse(firstText(p, 'time')) : null,
        hr: num(firstText(p, 'hr')),
        cad: num(firstText(p, 'cad')),
        watts: num(firstText(p, 'power')),
      }))
      const type = firstText(trk, 'type')
      const name = firstText(trk, 'name')
      return summarizeTrack(pts, mapSport(type || name || 'run'), { title: name })
    })
    .filter(Boolean)
}

export function parseTCX(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This TCX file could not be read.')
  return [...doc.getElementsByTagNameNS('*', 'Activity')]
    .map((act) => {
      const laps = [...act.getElementsByTagNameNS('*', 'Lap')]
      const distanceM = laps.reduce((s, l) => s + (num(firstText(l, 'DistanceMeters')) || 0), 0)
      const calories = laps.reduce((s, l) => s + (num(firstText(l, 'Calories')) || 0), 0)
      const pts = [...act.getElementsByTagNameNS('*', 'Trackpoint')].map((p) => {
        const pos = p.getElementsByTagNameNS('*', 'Position')[0]
        const hrEl = p.getElementsByTagNameNS('*', 'HeartRateBpm')[0]
        return {
          lat: pos ? num(firstText(pos, 'LatitudeDegrees')) : null,
          lon: pos ? num(firstText(pos, 'LongitudeDegrees')) : null,
          ele: num(firstText(p, 'AltitudeMeters')),
          t: firstText(p, 'Time') ? Date.parse(firstText(p, 'Time')) : null,
          hr: hrEl ? num(firstText(hrEl, 'Value')) : null,
          cad: num(firstText(p, 'Cadence')) ?? num(firstText(p, 'RunCadence')),
          watts: num(firstText(p, 'Watts')),
        }
      })
      const sportAttr = act.getAttribute('Sport')
      const notes = firstText(act, 'Notes')
      const a = summarizeTrack(pts, mapSport(sportAttr === 'Other' ? notes || 'other' : sportAttr), { distanceKm: distanceM ? Math.round(distanceM / 10) / 100 : undefined, calories: calories || undefined })
      if (!a && laps.length) {
        const start = laps[0].getAttribute('StartTime')
        const secs = laps.reduce((s, l) => s + (num(firstText(l, 'TotalTimeSeconds')) || 0), 0)
        return { id: uid(), sport: mapSport(sportAttr), start: new Date(start).toISOString(), durationMin: Math.round(secs / 60), distanceKm: distanceM / 1000 || null, calories: calories || null, source: 'import' }
      }
      return a
    })
    .filter(Boolean)
}

// ---------- CSV ----------
export function parseCSVText(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ','
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  row.push(field)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  const headers = (rows.shift() || []).map((h) => h.trim().replace(/^\uFEFF/, ''))
  return { headers, rows: rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()]))) }
}

/** Duration text → minutes. Handles "1:02:03", "45:10", and numbers with the unit given in the header. */
function durationMin(value, header) {
  if (value == null || value === '') return null
  const v = String(value).trim()
  if (v.includes(':')) {
    const parts = v.split(':').map(Number)
    if (parts.some(Number.isNaN)) return null
    const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]]
    return h * 60 + m + s / 60
  }
  const n = num(v)
  if (n == null) return null
  const h = header.toLowerCase()
  // Match explicit unit markers only, so headers like "Deep (SWS) duration (min)" are not read as seconds.
  if (/\((ms|millis\w*)\)|millisecond/.test(h)) return n / 60000
  if (/\((s|sec|secs|seconds)\)|\bseconds?\b/.test(h)) return n / 60
  if (/\((h|hr|hrs|hours?)\)|\bhours?\b/.test(h)) return n * 60
  return n
}

function distanceKm(value, header) {
  const n = num(value)
  if (n == null) return null
  const h = header.toLowerCase()
  if (/\bmi\b|mile/.test(h)) return n * 1.609344
  if (/\(m\)|meter|metre/.test(h) && !/km/.test(h)) return n / 1000
  return n
}

const parseDate = (v) => {
  if (!v) return null
  const t = Date.parse(String(v).replace(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d(:\d\d)?)$/, '$1T$2'))
  return Number.isNaN(t) ? null : new Date(t)
}

/**
 * Header-keyword importer that understands most CSV exports (WHOOP, Oura, Garmin, Fitbit, Strava,
 * Peloton or a hand-made sheet). Returns whatever activities, sleep and daily metrics it can find.
 */
export function parseCSV(text, fileName = '') {
  const { headers, rows } = parseCSVText(text)
  const find = (...res) => headers.find((h) => res.some((re) => re.test(h)))
  const col = {
    date: find(/^(date|day|summary_date|calendar date|activity date)$/i, /cycle start/i, /^start( time)?$/i, /start ?date|date ?time|timestamp|workout timestamp/i, /date/i),
    sport: find(/activity type|sport|workout type|fitness discipline|^activity$|activity name|^type$/i),
    duration: find(/^(moving time|elapsed time|duration|time|length)/i, /duration \(min\)|duration/i),
    distance: find(/distance/i),
    calories: find(/calor|energy burned|kcal/i),
    avgHr: find(/avg.*h(ea)?r|average heart rate|average hr|avg hr/i),
    maxHr: find(/max.*h(ea)?r/i),
    elevation: find(/ascent|elevation gain|total ascent|elev/i),
    power: find(/avg.*(power|watts)|average power|avg\. watts/i),
    cadence: find(/cadence/i),
    strain: find(/strain/i),
    recovery: find(/recovery score|readiness( score)?$|^readiness|nightly recharge/i),
    hrv: find(/heart rate variability|hrv/i),
    rhr: find(/resting heart rate|lowest resting|resting hr|^rhr/i),
    steps: find(/^steps$|step count|total steps/i),
    spo2: find(/blood oxygen|spo2/i),
    skinTemp: find(/skin temp|temperature (deviation|delta)/i),
    resp: find(/respiratory rate|breath/i),
    weight: find(/^weight|body ?mass/i),
    asleep: find(/asleep duration|total sleep|sleep duration|minutes asleep|time asleep/i),
    inBed: find(/in bed duration|time in bed|minutes in bed/i),
    deep: find(/deep/i),
    rem: find(/\brem\b/i),
    light: find(/light sleep|^light/i),
    awake: find(/awake duration|minutes awake|^awake/i),
    sleepScore: find(/sleep (score|performance)/i),
    sleepStart: find(/sleep onset|bedtime start|sleep start|^start time$/i),
    sleepEnd: find(/wake onset|bedtime end|sleep end|^end time$/i),
  }
  const out = { activities: [], sleep: [], daily: [], kind: [] }
  if (!col.date) throw new Error('Could not find a date column in this CSV.')

  const isWorkoutFile = col.sport && col.duration && !col.recovery
  const isSleepFile = col.asleep || (col.deep && col.rem)
  const isDailyFile = col.recovery || col.hrv || col.rhr || col.steps || col.weight || col.spo2

  rows.forEach((r) => {
    const date = parseDate(r[col.date])
    if (!date) return
    if (isWorkoutFile) {
      const minutes = durationMin(r[col.duration], col.duration)
      if (!minutes) return
      out.activities.push({
        id: uid(),
        sport: mapSport(r[col.sport]),
        start: date.toISOString(),
        durationMin: Math.round(minutes),
        distanceKm: col.distance ? (distanceKm(r[col.distance], col.distance) ? Math.round(distanceKm(r[col.distance], col.distance) * 100) / 100 : null) : null,
        calories: col.calories ? num(r[col.calories]) : null,
        avgHr: col.avgHr ? num(r[col.avgHr]) : null,
        maxHr: col.maxHr ? num(r[col.maxHr]) : null,
        elevationM: col.elevation ? num(r[col.elevation]) : null,
        avgPower: col.power ? num(r[col.power]) : null,
        cadence: col.cadence ? num(r[col.cadence]) : null,
        strain: col.strain ? num(r[col.strain]) : undefined,
        source: 'import',
      })
      return
    }
    const wakeDate = col.sleepEnd ? parseDate(r[col.sleepEnd]) || date : date
    const key = dayKey(col.sleepEnd && parseDate(r[col.sleepEnd]) ? wakeDate : date)
    if (isSleepFile) {
      const asleep = col.asleep ? durationMin(r[col.asleep], col.asleep) : null
      const st = {
        deep: col.deep ? durationMin(r[col.deep], col.deep) : null,
        rem: col.rem ? durationMin(r[col.rem], col.rem) : null,
        light: col.light ? durationMin(r[col.light], col.light) : null,
        awake: col.awake ? durationMin(r[col.awake], col.awake) : null,
      }
      const hasStages = st.deep != null && st.rem != null
      const total = asleep ?? (hasStages ? (st.deep || 0) + (st.rem || 0) + (st.light || 0) : null)
      if (total) {
        const fixed = (v) => (v == null ? 0 : Math.round(v > 1000 ? v / 60 : v))
        const durMin = Math.round(total > 1000 ? total / 60 : total)
        out.sleep.push({
          id: uid(),
          date: key,
          bedtime: col.sleepStart && parseDate(r[col.sleepStart]) ? parseDate(r[col.sleepStart]).toISOString() : null,
          wake: col.sleepEnd && parseDate(r[col.sleepEnd]) ? parseDate(r[col.sleepEnd]).toISOString() : null,
          durationMin: durMin,
          stages: hasStages ? { deep: fixed(st.deep), rem: fixed(st.rem), light: fixed(st.light), awake: fixed(st.awake) } : null,
          score: col.sleepScore ? num(r[col.sleepScore]) : null,
          respRate: col.resp ? num(r[col.resp]) : null,
          source: 'import',
        })
      }
    }
    if (isDailyFile) {
      const rec = {
        id: uid(),
        // When the file says when you woke up (e.g. WHOOP cycles start at sleep onset), the metrics belong to that morning.
        day: key,
        source: 'import',
        recovery: col.recovery ? num(r[col.recovery]) : null,
        strain: col.strain ? num(r[col.strain]) : null,
        hrv: col.hrv ? num(r[col.hrv]) : null,
        rhr: col.rhr ? num(r[col.rhr]) : null,
        steps: col.steps ? num(r[col.steps]) : null,
        spo2: col.spo2 ? num(r[col.spo2]) : null,
        skinTemp: col.skinTemp ? num(r[col.skinTemp]) : null,
        respRate: col.resp ? num(r[col.resp]) : null,
        weightKg: col.weight ? (/lb/i.test(col.weight) ? num(r[col.weight]) / 2.20462 : num(r[col.weight])) : null,
      }
      // WHOOP skin temp is absolute °C; keep only deviations.
      if (rec.skinTemp != null && Math.abs(rec.skinTemp) > 5) rec.skinTemp = null
      if (Object.entries(rec).some(([k, v]) => !['id', 'day', 'source'].includes(k) && v != null)) out.daily.push(rec)
    }
  })
  if (out.activities.length) out.kind.push('workouts')
  if (out.sleep.length) out.kind.push('sleep')
  if (out.daily.length) out.kind.push('daily metrics')
  if (!out.kind.length) throw new Error(`Nothing recognizable was found in ${fileName || 'this CSV'}. Check that it has a date column plus workout, sleep or health columns.`)
  return out
}

// ---------- Apple Health export.xml (streamed, works with very large files) ----------
const appleDate = (s) => (s ? new Date(s.replace(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d) ?([+-]\d\d)(\d\d)$/, '$1T$2$3:$4')) : null)
const attrs = (tag) => {
  const o = {}
  tag.replace(/(\w+)="([^"]*)"/g, (_, k, v) => (o[k] = v))
  return o
}

export async function parseAppleHealth(file, onProgress) {
  const stepsBySource = new Map()
  const rhr = new Map()
  const hrv = new Map()
  const weight = new Map()
  const sleepNights = new Map()
  const activities = []
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let read = 0
  const handle = (tag) => {
    const a = attrs(tag)
    if (tag.startsWith('<Workout ')) {
      const start = appleDate(a.startDate)
      if (!start) return
      let minutes = num(a.duration)
      if (a.durationUnit === 's') minutes /= 60
      if (a.durationUnit === 'hr') minutes *= 60
      let km = num(a.totalDistance)
      if (km != null && a.totalDistanceUnit === 'mi') km *= 1.609344
      if (km != null && a.totalDistanceUnit === 'm') km /= 1000
      activities.push({ id: uid(), sport: mapSport(a.workoutActivityType), start: start.toISOString(), durationMin: Math.round(minutes || 0), distanceKm: km ? Math.round(km * 100) / 100 : null, calories: num(a.totalEnergyBurned), source: 'import' })
      return
    }
    const type = a.type || ''
    const start = appleDate(a.startDate)
    if (!start) return
    const key = dayKey(start)
    if (type.endsWith('StepCount')) {
      const k = `${key}|${a.sourceName}`
      stepsBySource.set(k, (stepsBySource.get(k) || 0) + (num(a.value) || 0))
    } else if (type.endsWith('RestingHeartRate')) rhr.set(key, num(a.value))
    else if (type.endsWith('HeartRateVariabilitySDNN')) hrv.set(key, [...(hrv.get(key) || []), num(a.value)])
    else if (type.endsWith('BodyMass')) weight.set(key, a.unit === 'lb' ? num(a.value) / 2.20462 : num(a.value))
    else if (type.endsWith('SleepAnalysis')) {
      const end = appleDate(a.endDate)
      const night = dayKey(new Date(end.getTime() + 6 * 3600000))
      const n = sleepNights.get(night) || { start: start, end, deep: 0, rem: 0, light: 0, awake: 0, asleep: 0, inBed: 0 }
      const min = (end - start) / 60000
      const v = a.value || ''
      if (v.endsWith('InBed')) n.inBed += min
      else if (v.endsWith('Awake')) n.awake += min
      else {
        n.asleep += min
        if (v.endsWith('Deep')) n.deep += min
        else if (v.endsWith('REM')) n.rem += min
        else if (v.endsWith('Core')) n.light += min
      }
      if (start < n.start) n.start = start
      if (end > n.end) n.end = end
      sleepNights.set(night, n)
    }
  }
  const tagRe = /<(Record|Workout) [^>]*>/g
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    read += value.length
    buffer += value
    let last = 0
    let m
    tagRe.lastIndex = 0
    while ((m = tagRe.exec(buffer))) {
      handle(m[0])
      last = tagRe.lastIndex
    }
    const open = buffer.lastIndexOf('<')
    buffer = buffer.slice(Math.max(last, open > last ? open : buffer.length))
    onProgress?.(Math.min(read / file.size, 1))
  }

  const stepsByDay = new Map()
  stepsBySource.forEach((v, k) => {
    const day = k.split('|')[0]
    stepsByDay.set(day, Math.max(stepsByDay.get(day) || 0, v))
  })
  const days = new Set([...stepsByDay.keys(), ...rhr.keys(), ...hrv.keys(), ...weight.keys()])
  const daily = [...days].map((day) => {
    const h = hrv.get(day)
    return {
      id: uid(),
      day,
      source: 'import',
      steps: stepsByDay.has(day) ? Math.round(stepsByDay.get(day)) : null,
      rhr: rhr.get(day) ?? null,
      hrv: h ? Math.round(h.reduce((s, x) => s + x, 0) / h.length) : null,
      weightKg: weight.has(day) ? Math.round(weight.get(day) * 10) / 10 : null,
    }
  })
  const sleep = [...sleepNights.entries()]
    .filter(([, n]) => n.asleep > 60 || n.inBed > 60)
    .map(([date, n]) => {
      const hasStages = n.deep + n.rem + n.light > 0
      return {
        id: uid(),
        date,
        bedtime: n.start.toISOString(),
        wake: n.end.toISOString(),
        durationMin: Math.round(n.asleep || n.inBed),
        stages: hasStages ? { deep: Math.round(n.deep), rem: Math.round(n.rem), light: Math.round(n.light), awake: Math.round(n.awake) } : null,
        source: 'import',
      }
    })
  return { activities, sleep, daily, kind: ['Apple Health'] }
}

/** Pick a parser from the file name / contents. */
export async function importFile(file, onProgress) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xml') && file.size > 1e6) return parseAppleHealth(file, onProgress)
  const text = await file.text()
  if (name.endsWith('.gpx')) return { activities: parseGPX(text), sleep: [], daily: [], kind: ['workouts'] }
  if (name.endsWith('.tcx')) return { activities: parseTCX(text), sleep: [], daily: [], kind: ['workouts'] }
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCSV(text, file.name)
  if (name.endsWith('.xml')) {
    if (text.includes('<HealthData')) return parseAppleHealth(file, onProgress)
    if (text.includes('<gpx')) return { activities: parseGPX(text), sleep: [], daily: [], kind: ['workouts'] }
    if (text.includes('TrainingCenterDatabase')) return { activities: parseTCX(text), sleep: [], daily: [], kind: ['workouts'] }
  }
  if (name.endsWith('.fit')) throw new Error('FIT files are not supported yet. Export the activity as GPX or TCX instead.')
  if (name.endsWith('.zip')) throw new Error('Please unzip the export first, then choose the file inside (for Apple Health: export.xml).')
  throw new Error('Unsupported file type. Use GPX, TCX, CSV or Apple Health export.xml.')
}

export const CSV_TEMPLATE = 'date,activity type,duration (min),distance (km),calories,avg heart rate\n2026-01-05 07:30,Running,32,5.1,310,148\n2026-01-06 18:00,Strength training,45,,220,112\n'
