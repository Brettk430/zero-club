import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

const cohorts = [
  { id: 'dff-2026',      label: 'Debt-Free by 2026',      description: 'Final sprint to zero' },
  { id: 'dff-2027',      label: 'Debt-Free by 2027',      description: 'Three years, one goal' },
  { id: 'dff-2028',      label: 'Debt-Free by 2028',      description: 'Building momentum' },
  { id: 'dff-2029',      label: 'Debt-Free by 2029',      description: 'Playing the long game' },
  { id: 'dff-2030',      label: 'Debt-Free by 2030',      description: 'Five-year mission' },
  { id: 'student-loans', label: 'Student Loan Crushers',   description: 'Eliminating education debt' },
  { id: 'credit-cards',  label: 'Credit Card Elimination', description: 'High-interest debt first' },
  { id: 'under-30',      label: 'Under 30 Debt-Free',     description: 'Young and focused' },
  { id: 'couples',       label: 'Couples Paying Off Debt', description: 'Two incomes, one mission' },
]

const JOINED_KEY = 'zc_joined_cohorts'
const getJoined = () => { try { return JSON.parse(localStorage.getItem(JOINED_KEY) || '[]') } catch { return [] } }

const getOrCreateUsername = () => {
  const stored = localStorage.getItem('zc_username')
  if (stored) return stored
  const adj = ['Quiet', 'Bold', 'Steady', 'Calm', 'Focused', 'Brave', 'Sharp', 'Driven']
  const ani = ['Falcon', 'Wolf', 'Fox', 'Sparrow', 'Otter', 'Hawk', 'Bear', 'Eagle']
  const name = `${adj[Math.floor(Math.random() * adj.length)]}${ani[Math.floor(Math.random() * ani.length)]}${Math.floor(Math.random() * 99)}`
  localStorage.setItem('zc_username', name)
  return name
}

const GroupChat = ({ cohort, user, onBack }) => {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [username] = useState(getOrCreateUsername)
  const bottomRef = useRef(null)

  const supabaseReady = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY && supabase), []
  )

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!supabaseReady) return
    supabase.from('community_messages').select('*').eq('room', cohort.id)
      .order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => data && setMessages(data.map((m) => ({
        id: m.id, author: m.username, text: m.message,
        timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id,
      }))))
  }, [cohort.id, supabaseReady, user?.id])

  useEffect(() => {
    if (!supabaseReady) return
    const ch = supabase.channel(`room-${cohort.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `room=eq.${cohort.id}` }, (p) => {
        const m = p.new
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [
          ...prev, { id: m.id, author: m.username, text: m.message, timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id }
        ])
      })
      .subscribe((s) => setConnected(s === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [cohort.id, supabaseReady, user?.id])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    if (!user) { setSendError('Sign in to send messages'); return }
    const text = draft.trim()
    setDraft('')
    setSendError('')
    setSending(true)
    const { error } = await supabase.from('community_messages').insert([{ user_id: user.id, username, message: text, room: cohort.id }])
    if (error) setSendError(error.message)
    setSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <button type="button" onClick={onBack} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate dark:text-slate-100">{cohort.label}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">as <span className="font-medium text-slate-600 dark:text-slate-300">{username}</span></p>
        </div>
        {connected && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">No messages yet.<br />Be the first to share a win.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.isOwn ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
              {!m.isOwn && <p className="mb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">{m.author}</p>}
              <p className={`text-sm leading-relaxed ${m.isOwn ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{m.text}</p>
              <p className={`mt-1 text-right text-[10px] ${m.isOwn ? 'text-blue-200' : 'text-slate-300 dark:text-slate-600'}`}>
                {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric' }).format(m.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        {sendError && <p className="mb-2 text-xs text-red-500">{sendError}</p>}
        <form className="flex gap-2" onSubmit={handleSend}>
          <input
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e) }}
            placeholder="Share a win, ask for support…"
            disabled={sending}
          />
          <button type="submit" disabled={!draft.trim() || sending}
            className="rounded-full bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-40">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

const Community = () => {
  const { user } = useAuth()
  const [joined, setJoined] = useState(getJoined)
  const [openId, setOpenId] = useState(null)

  const activeCohort = cohorts.find((c) => c.id === openId)

  const toggle = (id) => {
    const isJoined = joined.includes(id)
    const updated = isJoined ? joined.filter((j) => j !== id) : [...joined, id]
    setJoined(updated)
    localStorage.setItem(JOINED_KEY, JSON.stringify(updated))
    if (!isJoined) setOpenId(id)
  }

  if (activeCohort) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
        <GroupChat key={activeCohort.id} cohort={activeCohort} user={user} onBack={() => setOpenId(null)} />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Community</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Join a group, then tap to open its chat.</p>

      <div className="mt-6 space-y-2">
        {cohorts.map((cohort) => {
          const isJoined = joined.includes(cohort.id)
          return (
            <div
              key={cohort.id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${isJoined ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
            >
              {/* Text — click to open chat if joined */}
              <button
                type="button"
                onClick={() => isJoined && setOpenId(cohort.id)}
                disabled={!isJoined}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <p className={`font-semibold ${isJoined ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                  {cohort.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{cohort.description}</p>
              </button>

              {/* Join/leave + open */}
              <div className="flex shrink-0 items-center gap-2">
                {isJoined && (
                  <button
                    type="button"
                    onClick={() => setOpenId(cohort.id)}
                    className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Open
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggle(cohort.id)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    isJoined
                      ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  aria-label={isJoined ? 'Leave' : 'Join'}
                >
                  {isJoined ? (
                    <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                      <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                      <path d="M6.75 1.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Community
