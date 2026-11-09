import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import AssistantChat, { useAssistantStatus } from '../components/Assistant.jsx'
import { ChatIcon } from '../components/Icons.jsx'

function SetupNote() {
  const status = useAssistantStatus()
  if (!status || status.available) return null
  return (
    <details className="notice coach-setup">
      <summary><strong>Turn on the AI coach</strong> (optional). The offline coach already answers common questions from your data.</summary>
      <ol className="small">
        <li>Get an API key from <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">console.anthropic.com</a>.</li>
        <li>In the journal-todo folder, copy <code>.env.example</code> to <code>.env.local</code> and paste the key after <code>ANTHROPIC_API_KEY=</code>.</li>
        <li>Close and re-open Thrive (double-click <code>Start Thrive.command</code>).</li>
      </ol>
      <p className="small muted">The key stays on your computer. Each question sends your recent fitness data summary to Anthropic to generate the answer.</p>
    </details>
  )
}

export default function Coach() {
  return (
    <section className="page narrow coach-page">
      <PageHeader eyebrow="Overview" title="Coach">
        Your personal coach knows your workouts, recovery, sleep, food and goals. Ask anything, by text or voice.
      </PageHeader>
      <SetupNote />
      <div className="card coach-card">
        <AssistantChat mode="chat" autoFocus />
      </div>
    </section>
  )
}

/** Floating "Ask coach" button available on every page except the coach and live-workout screens. */
export function CoachLauncher() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  if (pathname === '/coach' || pathname === '/activity/live') return null
  return (
    <>
      <button className="coach-fab" onClick={() => setOpen(true)} aria-label="Ask your coach">
        <ChatIcon width={20} height={20} /> <span>Ask coach</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Coach" drawer>
        <AssistantChat mode="chat" compact autoFocus />
      </Modal>
    </>
  )
}
