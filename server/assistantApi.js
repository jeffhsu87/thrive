// Thrive Coach API: a small endpoint mounted inside the Vite dev/preview server.
// The browser never sees the API key; it posts the conversation plus a data snapshot here,
// and this streams Claude's reply back as server-sent events.
//
//   GET  /api/assistant/status  -> { available, model }
//   POST /api/assistant         -> text/event-stream of {t} chunks, then {done} | {refusal} | {error}
//
// Credentials: ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) from the environment or .env.local.
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-5-5'
// Live answers must arrive fast; reports deserve more thought.
const EFFORT = { live: 'low', chat: 'medium', report: 'high' }
const MAX_TURNS = 20
const MAX_TEXT = 4000
const MAX_CONTEXT = 24000

const SYSTEM = `You are Thrive Coach, the coach inside Thrive, a personal fitness and wellness app. You help people of every fitness level, from first-time walkers to competitive athletes, understand their training, recovery, sleep and nutrition, and decide what to do next.

With every question the app sends you the athlete's current data in a system message. Ground your answers in that data: use their actual numbers when they matter, compare them with the athlete's own baseline rather than population norms, and say plainly when the data does not cover what they are asking. Do not invent workouts, readings or history that are not in the data.

Style: warm, encouraging and direct, in plain language. If you use a term like HRV, strain or zone 2, explain it in a few words. Lead with the answer. Keep chat replies short (a few sentences or a short list) unless the athlete asks for more detail.

The system message names a mode:
- live: the athlete is in the middle of a workout and may be hearing your reply through text-to-speech. Answer in one to three short, spoken-style sentences with no markdown, lists or emoji, and give one concrete cue they can act on right now (pace, effort, heart rate zone, breathing, form or fueling).
- chat: a normal conversation. Light markdown (short lists, bold) is fine.
- report: write a concise performance review of the period described in the data: what went well, what to watch, and two or three specific focuses for the next period. Use short markdown headings and bullets, and refer to the real numbers.

Safety: you are not a doctor. If the athlete mentions chest pain, fainting, severe breathlessness, signs of heat illness or an injury, tell them to stop and get medical help, and keep the rest brief. Do not diagnose conditions or advise on medication. Be supportive and non-judgmental about body weight and food, and never recommend extreme restriction.`

const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)

function readJson(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    let body = ''
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }))
        req.destroy()
      } else body += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

const sendJson = (res, status, obj) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

/** Validate what the browser sent and turn it into Messages API input. */
function buildRequest(body) {
  const mode = ['live', 'chat', 'report'].includes(body.mode) ? body.mode : 'chat'
  const turns = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TEXT) }))
  while (turns.length && turns[0].role !== 'user') turns.shift()
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null
  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT) : ''
  // App-supplied data goes in a mid-conversation system message after the latest question:
  // it is operator data, not something the athlete typed, and it keeps the system prompt stable.
  const messages = [...turns, { role: 'system', content: `Mode: ${mode}\n\n<athlete_data>\n${context || 'No data available.'}\n</athlete_data>` }]
  return { mode, messages }
}

function errorInfo(err) {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return { status: 401, code: 'auth', message: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.' }
  if (err instanceof Anthropic.RateLimitError) return { status: 429, code: 'rate_limit', message: 'The coach is busy right now. Try again in a moment.' }
  if (err instanceof Anthropic.BadRequestError) return { status: 400, code: 'bad_request', message: err.message }
  if (err instanceof Anthropic.APIConnectionError) return { status: 503, code: 'offline', message: 'Could not reach the Anthropic API. Check your internet connection.' }
  if (err instanceof Anthropic.APIError) return { status: 502, code: 'api', message: `The AI service returned an error (${err.status ?? 'unknown'}).` }
  return { status: err.status || 500, code: 'server', message: err.message || 'Unexpected error' }
}

export function createAssistantMiddleware() {
  let client = null
  const getClient = () => (client ??= new Anthropic())

  return async function assistantMiddleware(req, res, next) {
    const url = (req.url || '').split('?')[0]
    if (!url.startsWith('/api/assistant')) return next()

    if (req.method === 'GET' && url === '/api/assistant/status') return sendJson(res, 200, { available: hasCredentials(), model: MODEL })
    if (req.method !== 'POST' || url !== '/api/assistant') return sendJson(res, 404, { error: 'not_found' })
    if (!hasCredentials()) return sendJson(res, 503, { error: 'not_configured', message: 'Add ANTHROPIC_API_KEY to .env.local and restart Thrive.' })

    let body
    try {
      body = await readJson(req)
    } catch (e) {
      return sendJson(res, e.status || 400, { error: 'bad_request', message: e.message })
    }
    const built = buildRequest(body)
    if (!built) return sendJson(res, 400, { error: 'bad_request', message: 'The last message must be a question from you.' })

    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: built.messages,
      output_config: { effort: EFFORT[built.mode] },
      // If a safety classifier declines, let the API retry on Anthropic's recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })

    let started = false
    const write = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
    const start = () => {
      if (started) return
      started = true
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' })
    }
    // Stop generating (and billing) if the athlete taps Stop or closes the page.
    res.on('close', () => {
      if (!res.writableEnded) stream.abort()
    })

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          start()
          write({ t: event.delta.text })
        }
      }
      const final = await stream.finalMessage()
      start()
      if (final.stop_reason === 'refusal') write({ refusal: true })
      else write({ done: true, stop: final.stop_reason, model: final.model })
      res.end()
    } catch (err) {
      if (res.writableEnded || res.destroyed) return
      if (err instanceof Anthropic.APIUserAbortError) return res.end()
      const info = errorInfo(err)
      if (started) {
        write({ error: info.code, message: info.message })
        res.end()
      } else sendJson(res, info.status, { error: info.code, message: info.message })
    }
  }
}

/** Vite plugin that mounts the endpoint on both `vite` (dev) and `vite preview`. */
export function assistantPlugin() {
  const middleware = createAssistantMiddleware()
  return {
    name: 'thrive-assistant-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
