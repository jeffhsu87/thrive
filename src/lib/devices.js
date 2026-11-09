// What each device can provide. Demo connections generate sample data matching these capabilities.
export const CAP_LABELS = {
  workouts: 'Workouts',
  hr: 'Heart rate',
  power: 'Power',
  cadence: 'Cadence',
  elevation: 'Elevation',
  steps: 'Steps',
  sleep: 'Sleep',
  stages: 'Sleep stages',
  recovery: 'Recovery',
  strain: 'Strain',
  hrv: 'HRV',
  rhr: 'Resting HR',
  spo2: 'Blood oxygen',
  temp: 'Skin temp',
  resp: 'Respiratory rate',
  weight: 'Weight',
}

export const DEVICES = [
  { id: 'whoop', name: 'WHOOP', kind: 'Band', mark: 'W', caps: ['recovery', 'strain', 'hrv', 'rhr', 'sleep', 'stages', 'workouts', 'hr', 'spo2', 'temp', 'resp'], blurb: 'Recovery, strain, HRV and sleep coaching.', importHint: 'In the WHOOP app: More → App settings → Data export. You will receive CSV files (physiological_cycles.csv, sleeps.csv, workouts.csv) to import here.' },
  { id: 'apple', name: 'Apple Watch', kind: 'Watch · Apple Health', mark: '', caps: ['workouts', 'hr', 'steps', 'sleep', 'stages', 'rhr', 'hrv', 'elevation'], blurb: 'Workouts, steps, heart rate and sleep stages via Apple Health.', importHint: 'On iPhone: Health app → your profile picture → Export All Health Data. Unzip the file and import export.xml here.' },
  { id: 'garmin', name: 'Garmin', kind: 'Watch · bike computer', mark: 'G', caps: ['workouts', 'hr', 'power', 'cadence', 'elevation', 'steps', 'sleep', 'stages', 'rhr', 'hrv'], blurb: 'Detailed workouts with power, cadence and elevation.', importHint: 'Garmin Connect (web) → an activity → ⚙ → Export to GPX or TCX. For many at once: Activities list → Export CSV.' },
  { id: 'oura', name: 'Oura Ring', kind: 'Ring', mark: 'O', caps: ['recovery', 'sleep', 'stages', 'hrv', 'rhr', 'steps', 'temp', 'resp'], recoveryName: 'Readiness', blurb: 'Readiness, sleep stages and temperature trends.', importHint: 'Oura web dashboard (cloud.ouraring.com) → Account → Export data → CSV.' },
  { id: 'fitbit', name: 'Fitbit', kind: 'Tracker · watch', mark: 'F', caps: ['workouts', 'hr', 'steps', 'sleep', 'stages', 'rhr', 'weight'], blurb: 'Steps, workouts, sleep and resting heart rate.', importHint: 'Fitbit app or Google Takeout → Fitbit → export CSV files for activities and sleep.' },
  { id: 'polar', name: 'Polar', kind: 'Watch · HR strap', mark: 'P', caps: ['workouts', 'hr', 'cadence', 'elevation', 'sleep', 'stages', 'rhr', 'hrv', 'recovery'], recoveryName: 'Nightly Recharge', blurb: 'Training load, Nightly Recharge and sleep.', importHint: 'Polar Flow (web) → a session → Export session → GPX or TCX.' },
  { id: 'coros', name: 'COROS', kind: 'Watch', mark: 'C', caps: ['workouts', 'hr', 'power', 'cadence', 'elevation', 'sleep', 'rhr', 'hrv'], blurb: 'Endurance training with long battery life.', importHint: 'COROS app → an activity → Share → Export GPX or TCX.' },
  { id: 'suunto', name: 'Suunto', kind: 'Watch', mark: 'S', caps: ['workouts', 'hr', 'cadence', 'elevation', 'sleep', 'rhr'], blurb: 'Outdoor and adventure workouts.', importHint: 'Suunto app → an activity → ⋯ → Export GPX.' },
  { id: 'samsung', name: 'Samsung Galaxy Watch', kind: 'Watch · Samsung Health', mark: 'S', caps: ['workouts', 'hr', 'steps', 'sleep', 'stages', 'rhr', 'spo2'], blurb: 'Samsung Health activity and sleep.', importHint: 'Samsung Health → Settings → Download personal data. Import the CSV files here.' },
  { id: 'google', name: 'Pixel Watch / Health Connect', kind: 'Watch · Android', mark: 'G', caps: ['workouts', 'hr', 'steps', 'sleep', 'stages', 'rhr'], blurb: 'Activity and sleep from Android Health Connect.', importHint: 'Google Takeout → Fit or Fitbit → export CSV.' },
  { id: 'wahoo', name: 'Wahoo', kind: 'Bike computer · trainer', mark: 'W', caps: ['workouts', 'hr', 'power', 'cadence', 'elevation'], blurb: 'Cycling power, cadence and indoor training.', importHint: 'Wahoo app → a workout → Share → TCX file.' },
  { id: 'peloton', name: 'Peloton', kind: 'Bike · tread', mark: 'P', caps: ['workouts', 'hr', 'power', 'cadence'], blurb: 'Classes with output, cadence and heart rate.', importHint: 'Peloton website → Profile → Workouts → Download workouts (CSV).' },
  { id: 'strava', name: 'Strava', kind: 'App', mark: 'S', caps: ['workouts', 'hr', 'elevation', 'power', 'cadence'], blurb: 'Activities synced from any device you use with Strava.', importHint: 'Strava → Settings → My account → Download or delete your account → Request archive. Import the GPX/TCX files or activities.csv.' },
  { id: 'withings', name: 'Withings', kind: 'Smart scale · sleep mat', mark: 'W', caps: ['weight', 'sleep', 'rhr', 'steps'], blurb: 'Weight, body composition and sleep.', importHint: 'Withings web → Settings → Download your data (CSV).' },
]

export const deviceFor = (id) => DEVICES.find((d) => d.id === id)
