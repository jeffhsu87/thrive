import { Fragment, useEffect, useRef, useState } from 'react'
import { useHealth } from '../store/Health.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { COACH_SUGGESTIONS, CoachUnavailable, buildContext, getAssistantStatus, offlineAnswer, speakable, streamCoach } from '../lib/assistant.js'
import { MicIcon, SendIcon, SpeakerIcon, StopIcon } from './Icons.jsx'

// ---------- Tiny, safe markdown renderer (bold, italics, headings, bullet and numbered lists) ----------
function inline(text, key) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <em key={`${key}-${i}`}>{p.slice(1, -1)}</em> : <Fragment key={`${key}-${i}`}>{p}</Fragment>
  )
}
export function Markdown({ text }) {
  const blocks = []
  let list = null
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/)
    if (bullet) {
      if (!list) {
        list = { ordered: /^\s*\d+\./.test(line), items: [] }
        blocks.push(list)
      }
      list.items.push(bullet[1])
      return
    }
    list = null
    if (!line.trim()) return
    const h = line.match(/^#{1,4}\s+(.*)/)
    blocks.push(h ? { h: h[1] } : { p: line })
  })
  return (
    <div className="md">
      {blocks.map((b, i) =>
        b.items ? (
          b.ordered ? (
            <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ol>
          ) : (
            <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ul>
          )
        ) : b.h ? (
          <h4 key={i}>{inline(b.h, i)}</h4>
        ) : (
          <p key={i}>{inline(b.p, i)}</p>
        )
      )}
    </div>
  )
}

// ---------- Hooks ----------
export function useAssistantStatus() {
  const [status, setStatus] = useState(null)
  useEffect(() => {
    let alive = true
    getAssistantStatus().then((s) => alive && setStatus(s))
    return () => {
      alive = false
    }
  }, [])
  return status
}

const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text) {
  if (!canSpeak() || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(speakable(text))
  u.rate = 1.02
  window.speechSynthesis.speak(u)
}

/**
 * Chat with Thrive Coach.
 * mode: 'chat' (persisted conversation) or 'live' (in-workout, short spoken answers).
 * getLive: function returning the current live-workout state, read at the moment a question is sent.
 */
export default function AssistantChat({ mode = 'chat', getLive, compact = false, autoFocus = false }) {
  const health = useHealth()
  const status = useAssistantStatus()
  const [saved, setSaved] = useLocalStorage('coach-chat', [])
  const [liveMsgs, setLiveMsgs] = useState([])
  const messages = mode === 'chat' ? saved : liveMsgs
  const setMessages = mode === 'chat' ? setSaved : setLiveMsgs
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [voice, setVoice] = useLocalStorage(`coach-voice-${mode}`, mode === 'live')
  const abortRef = useRef(null)
  const recRef = useRef(null)
  const endRef = useRef(null)
  const aiOn = status?.available

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [messages])
  useEffect(
    () => () => {
      abortRef.current?.abort()
      recRef.current?.abort?.()
    },
    []
  )

  async function send(text) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    const history = [...messages, { role: 'user', content: q }]
    setMessages([...history, { role: 'assistant', content: '', pending: true }])
    setBusy(true)
    const live = getLive?.()
    const data = { index: health.index, profile: health.profile, goalsProgress: health.goalsProgress, live }
    const finish = (content, source) => {
      setMessages((cur) => {
        const copy = [...cur]
        copy[copy.length - 1] = { role: 'assistant', content, source }
        return copy.slice(-40)
      })
      if (voice) speak(content)
    }
    try {
      if (!aiOn) throw new CoachUnavailable()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const { text: answer } = await streamCoach({
        mode,
        signal: ctrl.signal,
        messages: history.filter((m) => m.content).slice(-16).map((m) => ({ role: m.role, content: m.content })),
        context: buildContext({ ...data, stats: health.stats }),
        onText: (partial) =>
          setMessages((cur) => {
            const copy = [...cur]
            copy[copy.length - 1] = { role: 'assistant', content: partial, pending: true, source: 'ai' }
            return copy
          }),
      })
      finish(answer || '…', 'ai')
    } catch (e) {
      if (e.name === 'AbortError') {
        setMessages((cur) => {
          const copy = [...cur]
          const last = copy[copy.length - 1]
          if (last?.pending) copy[copy.length - 1] = { ...last, pending: false, content: last.content || 'Stopped.' }
          return copy
        })
      } else if (e instanceof CoachUnavailable) finish(offlineAnswer(q, data), 'offline')
      else finish(`Sorry, something went wrong: ${e.message}. Here is what I can tell from your data: ${offlineAnswer(q, data)}`, 'offline')
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function toggleMic() {
    if (!SpeechRecognition) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    window.speechSynthesis?.cancel()
    const rec = new SpeechRecognition()
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (e) => {
      const txt = [...e.results].map((r) => r[0].transcript).join(' ')
      setInput(txt)
      if (e.results[e.results.length - 1].isFinal) finalText = txt
    }
    rec.onend = () => {
      setListening(false)
      if (finalText) send(finalText)
    }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const suggestions = COACH_SUGGESTIONS[mode]
  return (
    <div className={'coach' + (compact ? ' compact' : '') + (mode === 'live' ? ' live-coach' : '')}>
      <div className="coach-status">
        <span className={'coach-dot' + (aiOn ? ' on' : '')} aria-hidden />
        <span className="small muted">{status == null ? 'Connecting…' : aiOn ? 'AI coach ready' : 'Offline coach. Answers come from your data.'}</span>
        <span className="row gap-sm" style={{ marginLeft: 'auto' }}>
          {canSpeak() && (
            <button type="button" className={'icon-btn' + (voice ? ' active' : '')} aria-pressed={voice} onClick={() => { setVoice(!voice); window.speechSynthesis?.cancel() }} title={voice ? 'Spoken replies on' : 'Spoken replies off'} aria-label="Read replies aloud">
              <SpeakerIcon width={16} height={16} />
            </button>
          )}
          {mode === 'chat' && messages.length > 0 && (
            <button type="button" className="link-btn" onClick={() => setMessages([])}>
              New chat
            </button>
          )}
        </span>
      </div>

      <div className="coach-log" role="log" aria-live="polite" aria-label="Conversation with your coach">
        {messages.length === 0 && (
          <div className="coach-empty">
            <p>{mode === 'live' ? 'Ask anything mid-workout. Tap the mic and speak, or use a quick question.' : 'Ask about your training, recovery, sleep, nutrition or goals. Your coach sees your latest data.'}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'assistant' ? (
              m.pending && !m.content ? (
                <span className="typing" aria-label="Coach is thinking"><i /><i /><i /></span>
              ) : (
                <>
                  <Markdown text={m.content} />
                  {m.source === 'offline' && !m.pending && <span className="bubble-tag">Offline coach</span>}
                </>
              )
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="coach-suggest" role="group" aria-label="Quick questions">
        {suggestions.map((s) => (
          <button key={s} type="button" className="chip small text" disabled={busy} onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>

      <form className="coach-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        {SpeechRecognition && (
          <button type="button" className={'mic' + (listening ? ' on' : '')} onClick={toggleMic} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Ask by voice'} title="Ask by voice">
            <MicIcon />
          </button>
        )}
        <input className="plain-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? 'Listening…' : mode === 'live' ? 'Ask your coach…' : 'Ask your coach anything…'} aria-label="Your question" autoFocus={autoFocus} />
        {busy ? (
          <button type="button" className="btn ghost" onClick={() => abortRef.current?.abort()} aria-label="Stop answer"><StopIcon width={16} height={16} /></button>
        ) : (
          <button type="submit" className="btn primary" disabled={!input.trim()} aria-label="Send"><SendIcon width={16} height={16} /></button>
        )}
      </form>
    </div>
  )
}
