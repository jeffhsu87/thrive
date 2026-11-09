// Sport catalog. `met` is the metabolic equivalent used for calorie estimates when no heart rate is
// available. `fields` controls which sport-specific inputs appear; `pace` picks how speed is shown.
export const CATEGORIES = [
  { id: 'cardio', label: 'Cardio & endurance' },
  { id: 'strength', label: 'Strength & gym' },
  { id: 'mind', label: 'Mind & body' },
  { id: 'outdoor', label: 'Outdoor & adventure' },
  { id: 'team', label: 'Team sports' },
  { id: 'racket', label: 'Racket sports' },
  { id: 'water', label: 'Water sports' },
  { id: 'winter', label: 'Winter sports' },
  { id: 'combat', label: 'Combat sports' },
  { id: 'other', label: 'Everyday & other' },
]

const s = (id, name, emoji, cat, met, fields = [], pace = null, extra = {}) => ({ id, name, emoji, cat, met, fields, pace, ...extra })
const DIST = ['distance']
const ROUTE = ['distance', 'elevation']

export const SPORTS = [
  // Cardio
  s('run', 'Running', '🏃', 'cardio', 9.8, [...ROUTE, 'cadence'], 'pace', { cadenceUnit: 'spm' }),
  s('trail_run', 'Trail running', '⛰️', 'cardio', 10, [...ROUTE, 'cadence'], 'pace', { cadenceUnit: 'spm' }),
  s('treadmill', 'Treadmill', '🏃', 'cardio', 9, ['distance', 'incline'], 'pace'),
  s('walk', 'Walking', '🚶', 'cardio', 3.5, ROUTE, 'pace'),
  s('ride', 'Cycling', '🚴', 'cardio', 8, [...ROUTE, 'power', 'cadence'], 'speed', { cadenceUnit: 'rpm' }),
  s('indoor_ride', 'Indoor cycling', '🚲', 'cardio', 7, ['distance', 'power', 'cadence'], 'speed', { cadenceUnit: 'rpm' }),
  s('mtb', 'Mountain biking', '🚵', 'cardio', 8.5, [...ROUTE, 'power', 'cadence'], 'speed', { cadenceUnit: 'rpm' }),
  s('row', 'Rowing', '🚣', 'cardio', 7, ['distance', 'power', 'cadence'], 'row', { cadenceUnit: 'spm' }),
  s('elliptical', 'Elliptical', '🔁', 'cardio', 5),
  s('stairs', 'Stair climber', '🪜', 'cardio', 9, ['floors']),
  s('hiit', 'HIIT', '⚡', 'cardio', 8, ['rounds']),
  s('jump_rope', 'Jump rope', '🪢', 'cardio', 11),
  s('dance', 'Dance', '💃', 'cardio', 5.5),
  s('cardio_class', 'Cardio class', '🎵', 'cardio', 6.5),
  // Strength
  s('strength', 'Strength training', '🏋️', 'strength', 5, ['sets']),
  s('functional', 'CrossFit / functional', '🔥', 'strength', 8, ['sets', 'rounds']),
  s('bodyweight', 'Bodyweight & calisthenics', '🤸', 'strength', 4.5, ['sets']),
  s('circuit', 'Circuit training', '🔄', 'strength', 7, ['sets', 'rounds']),
  // Mind & body
  s('yoga', 'Yoga', '🧘', 'mind', 2.8),
  s('pilates', 'Pilates', '🤍', 'mind', 3),
  s('stretching', 'Stretching & mobility', '🙆', 'mind', 2.3),
  s('barre', 'Barre', '🩰', 'mind', 3.5),
  s('tai_chi', 'Tai chi', '☯️', 'mind', 3),
  // Outdoor
  s('hike', 'Hiking', '🥾', 'outdoor', 6, ROUTE, 'pace'),
  s('climb', 'Rock climbing', '🧗', 'outdoor', 8, ['elevation']),
  s('bouldering', 'Bouldering', '🪨', 'outdoor', 7.5),
  s('golf', 'Golf', '⛳', 'outdoor', 4.8, ['distance', 'score'], 'pace'),
  s('skate', 'Skateboarding', '🛹', 'outdoor', 5, DIST, 'speed'),
  s('inline', 'Inline skating', '🛼', 'outdoor', 7.5, DIST, 'speed'),
  s('horse', 'Horse riding', '🐎', 'outdoor', 5.5, DIST, 'speed'),
  // Team
  s('soccer', 'Soccer', '⚽', 'team', 7, ['distance', 'score']),
  s('basketball', 'Basketball', '🏀', 'team', 6.5, ['score']),
  s('volleyball', 'Volleyball', '🏐', 'team', 4, ['score']),
  s('football', 'American football', '🏈', 'team', 8, ['score']),
  s('baseball', 'Baseball / softball', '⚾', 'team', 5, ['score']),
  s('hockey', 'Ice hockey', '🏒', 'team', 8, ['score']),
  s('rugby', 'Rugby', '🏉', 'team', 8.3, ['distance', 'score']),
  s('cricket', 'Cricket', '🏏', 'team', 4.8, ['score']),
  s('lacrosse', 'Lacrosse', '🥍', 'team', 8, ['score']),
  s('ultimate', 'Ultimate frisbee', '🥏', 'team', 8, ['distance', 'score']),
  // Racket
  s('tennis', 'Tennis', '🎾', 'racket', 7.3, ['score']),
  s('pickleball', 'Pickleball', '🏓', 'racket', 4.1, ['score']),
  s('padel', 'Padel', '🎾', 'racket', 6, ['score']),
  s('badminton', 'Badminton', '🏸', 'racket', 5.5, ['score']),
  s('squash', 'Squash', '🟢', 'racket', 7.3, ['score']),
  s('table_tennis', 'Table tennis', '🏓', 'racket', 4, ['score']),
  // Water
  s('swim', 'Pool swim', '🏊', 'water', 7, ['swim'], 'swim'),
  s('open_water', 'Open-water swim', '🌊', 'water', 8, ['distance'], 'swim'),
  s('surf', 'Surfing', '🏄', 'water', 3),
  s('sup', 'Paddleboarding', '🏄', 'water', 6, DIST, 'speed'),
  s('kayak', 'Kayaking', '🛶', 'water', 5, DIST, 'speed'),
  s('water_polo', 'Water polo', '🤽', 'water', 10, ['score']),
  // Winter
  s('ski', 'Downhill skiing', '⛷️', 'winter', 5.3, ['distance', 'elevation'], 'speed'),
  s('xc_ski', 'Cross-country skiing', '🎿', 'winter', 9, ROUTE, 'pace'),
  s('snowboard', 'Snowboarding', '🏂', 'winter', 5.3, ['distance', 'elevation'], 'speed'),
  s('ice_skate', 'Ice skating', '⛸️', 'winter', 7),
  s('snowshoe', 'Snowshoeing', '❄️', 'winter', 5.3, ROUTE, 'pace'),
  // Combat
  s('boxing', 'Boxing', '🥊', 'combat', 7.8, ['rounds']),
  s('kickboxing', 'Kickboxing', '🦵', 'combat', 7.5, ['rounds']),
  s('martial_arts', 'Martial arts', '🥋', 'combat', 10, ['rounds']),
  s('bjj', 'Brazilian jiu-jitsu', '🥋', 'combat', 7, ['rounds']),
  s('wrestling', 'Wrestling', '🤼', 'combat', 6, ['rounds']),
  s('fencing', 'Fencing', '🤺', 'combat', 6),
  // Everyday & other
  s('yardwork', 'Yard work & gardening', '🌱', 'other', 4),
  s('play', 'Active play with kids', '🧒', 'other', 4),
  s('wheelchair', 'Wheelchair push', '♿', 'other', 4.5, DIST, 'speed'),
  s('rehab', 'Physical therapy', '🩹', 'other', 3),
  s('other', 'Other activity', '✨', 'other', 5, ['distance']),
]

// Sports people create themselves. Same shape as built-ins, plus optional `metrics`:
// extra numbers to record for that sport, e.g. [{ key: 'waves', label: 'Waves caught', unit: '' }].
let CUSTOM = []
const BY_ID = new Map(SPORTS.map((sp) => [sp.id, sp]))

/** Called by the data provider whenever the saved custom sports change. */
export function setCustomSports(list) {
  CUSTOM = (Array.isArray(list) ? list : []).filter((sp) => sp && sp.id && sp.name).map((sp) => ({ fields: [], pace: null, met: 5, cat: 'other', emoji: '⭐', metrics: [], ...sp, custom: true }))
  BY_ID.clear()
  SPORTS.forEach((sp) => BY_ID.set(sp.id, sp))
  CUSTOM.forEach((sp) => BY_ID.set(sp.id, sp))
}
export const customSports = () => CUSTOM
export const allSports = () => [...SPORTS, ...CUSTOM]
export const sportFor = (id) => BY_ID.get(id) || BY_ID.get('other')

/** Intensity choices for custom sports, mapped to typical MET values for calorie estimates. */
export const INTENSITIES = [
  { id: 'light', label: 'Light', desc: 'Like walking or stretching', met: 3.5 },
  { id: 'moderate', label: 'Moderate', desc: 'Like brisk cycling or doubles tennis', met: 6 },
  { id: 'vigorous', label: 'Vigorous', desc: 'Like running or a hard match', met: 9 },
]

/** Optional built-in fields a custom sport can turn on. */
export const CUSTOM_FIELDS = [
  { id: 'distance', label: 'Distance' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'power', label: 'Power' },
  { id: 'cadence', label: 'Cadence' },
  { id: 'sets', label: 'Sets & reps' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'score', label: 'Score / result' },
]

export const POPULAR = ['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'hike', 'hiit']

export const hasField = (sport, f) => sportFor(sport).fields.includes(f)

export const EXERCISES = [
  'Back squat', 'Front squat', 'Goblet squat', 'Deadlift', 'Romanian deadlift', 'Bench press', 'Incline bench press',
  'Dumbbell press', 'Overhead press', 'Push-up', 'Pull-up', 'Chin-up', 'Lat pulldown', 'Barbell row', 'Dumbbell row',
  'Seated cable row', 'Lunge', 'Bulgarian split squat', 'Leg press', 'Hip thrust', 'Glute bridge', 'Leg curl',
  'Leg extension', 'Calf raise', 'Bicep curl', 'Hammer curl', 'Tricep dip', 'Tricep pushdown', 'Lateral raise',
  'Face pull', 'Plank', 'Side plank', 'Crunch', 'Hanging leg raise', 'Russian twist', 'Kettlebell swing',
  'Burpee', 'Box jump', 'Farmer carry', 'Clean', 'Snatch', 'Thruster', 'Wall ball',
]

/** "How did it feel?" — friendly effort scale mapped to RPE (1-10). */
export const FEELS = [
  { value: 2, emoji: '😌', label: 'Very easy' },
  { value: 4, emoji: '🙂', label: 'Easy' },
  { value: 6, emoji: '😤', label: 'Moderate' },
  { value: 8, emoji: '🥵', label: 'Hard' },
  { value: 10, emoji: '🤯', label: 'All out' },
]
export const feelFor = (rpe) => (rpe ? FEELS.reduce((a, b) => (Math.abs(b.value - rpe) < Math.abs(a.value - rpe) ? b : a)) : null)
