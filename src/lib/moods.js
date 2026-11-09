export const MOODS = [
  { value: 1, label: 'Awful', emoji: '😞', color: '#d9694f' },
  { value: 2, label: 'Low', emoji: '😕', color: '#e39b5b' },
  { value: 3, label: 'Okay', emoji: '😐', color: '#d4b25a' },
  { value: 4, label: 'Good', emoji: '🙂', color: '#7fa86e' },
  { value: 5, label: 'Great', emoji: '😄', color: '#3f9483' },
]

export const moodFor = (value) => MOODS.find((m) => m.value === value) || null

export const ENERGY_LABELS = ['Drained', 'Low', 'Steady', 'Energized', 'Buzzing']

export const PROMPTS = [
  "What's on your mind today?",
  'What made you smile today?',
  'What drained your energy, and what restored it?',
  'What is one thing you learned today?',
  'What would make tomorrow great?',
  'Describe a moment you want to remember.',
  'What are you avoiding, and why?',
  'Who did you feel connected to today?',
  'What are you proud of this week?',
]
