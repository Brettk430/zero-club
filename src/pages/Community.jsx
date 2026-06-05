import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

const cohorts = [
  { id: 'dff-2026', label: 'Debt-Free by 2026', description: 'Final sprint — the finish line is close. For people who\'ll hit zero in the next 12 months.' },
  { id: 'dff-2027', label: 'Debt-Free by 2027', description: 'Three years, one mission. Consistent monthly progress, no matter what.' },
  { id: 'dff-2028', label: 'Debt-Free by 2028', description: 'Building momentum. The long middle of a debt payoff journey.' },
  { id: 'dff-2029', label: 'Debt-Free by 2029', description: 'Playing the long game. Patience and discipline over years.' },
  { id: 'dff-2030', label: 'Debt-Free by 2030', description: 'Five-year journey. The hardest part is starting — you\'ve done that.' },
  { id: 'student-loans', label: 'Student Loan Crushers', description: 'Specifically for people grinding through education debt.' },
  { id: 'credit-cards', label: 'Credit Card Elimination', description: 'High-interest debt first. Cutting the cards for good.' },
  { id: 'under-30', label: 'Under 30 & Debt-Free', description: 'Getting financially free before 30. Young and focused.' },
  { id: 'couples', label: 'Couples Paying Off Debt', description: 'Two incomes, one mission. Navigating debt payoff together.' },
]

const JOINED_KEY = 'zc_joined_cohorts'

const getJoined = () => {
  try { return JSON.parse(localStorage.getItem(JOINED_KEY) || '[]') } catch { return [] }
}

const getOrCreateUsername = () => {
  const stored = localStorage.getItem('zc_username')
  if (stored) return stored
  const adj = ['Quiet', 'Bold', 'Steady', 'Calm', 'Focused', 'Brave', 'Sharp', 'Driven']
  const ani = ['Falcon', 'Wolf', 'Fox', 'Sparrow', 'Otter', 'Hawk', 'Bear', 'Eagle']
  const name = `${adj[Math.floor(Math.random() * adj.length)]}${ani[Math.floor(Math.random() * ani.length)]}${Math.floor(Math.random() * 99)}`
  localStorage.setItem('zc_username', name)
  return name
}

// ─── Group browse card ────────────────────────────────────────────────────────

const GroupCard = ({ cohort, joined, onJoin, onLeave }) => (
  <div className={`flex flex-col rounded-3xl border p-5 transition sm:p-6 ${joined ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-slate-900 dark:text-slate-100">{cohort.label}</p>
        <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{cohort.description}</p>
      </div>
      {joined && (
        <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          Joined
        </span>
      )}
    </div>
    <div className="mt-5">
      {joined ? (
        <button
          type="button"
          onClick={onLeave}
          className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:text-red-500 dark:border-slate-700 dark:text-slate-400"
        >
          Leave group
        </button>
      ) : (
        <button
          type="button"
          onClick={onJoin}
          className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Join group
        </button>
      )}
    </div>
  </div>
)

// ─── Group chat ───────────────────────────────────────────────────────────────

const GroupChat = ({ cohort, user }) => {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [username] = useState(getOrCreateUsername)
  const bottomRef = useRef(null)

  const supabaseReady = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY && supabase),
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
    if (!supabaseReady) return
    supabase
      .from('community_messages')
      .select('*')
      .eq('room', cohort.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data.map((m) => ({
          id: m.id, author: m.username, text: m.message,
          timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id,
        })))
      })
  }, [cohort.id, supabaseReady, user?.id])

  useEffect(() => {
    if (!supabaseReady) return
    const channel = supabase
      .channel(`room-${cohort.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_messages',
        filter: `room=eq.${cohort.id}`,
      }, (payload) => {
        const m = payload.new
        setMessages((prev) => prev.some((p) => p.id === m.id) ? prev : [
          ...prev,
          { id: m.id, author: m.username, text: m.message, timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id },
        ])
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [cohort.id, supabaseReady, user?.id])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    if (!user) { setSendError('Sign in to send messages'); return }
    const text = draft.trim()
    setDraft('')
    setSendError('')
    setSending(true)
    const { error } = await supabase.from('community_messages').insert([{
      user_id: user.id, username, message: text, room: cohort.id,
    }])
    if (error) setSendError(error.message)
    setSending(false)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{cohort.label}</p>
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
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">
              No messages yet.<br />Be the first to share a win or ask for help.
            </p>
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
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="rounded-full bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Community = () => {
  const { user } = useAuth()
  const [joined, setJoined] = useState(getJoined)
  const [activeId, setActiveId] = useState(() => getJoined()[0] || null)
  const [view, setView] = useState(() => getJoined().length > 0 ? 'chat' : 'browse')

  const joinedCohorts = cohorts.filter((c) => joined.includes(c.id))
  const activeCohort = cohorts.find((c) => c.id === activeId)

  const join = (id) => {
    const updated = joined.includes(id) ? joined : [...joined, id]
    setJoined(updated)
    localStorage.setItem(JOINED_KEY, JSON.stringify(updated))
    setActiveId(id)
    setView('chat')
  }

  const leave = (id) => {
    const updated = joined.filter((j) => j !== id)
    setJoined(updated)
    localStorage.setItem(JOINED_KEY, JSON.stringify(updated))
    if (activeId === id) {
      setActiveId(updated[0] || null)
      if (!updated.length) setView('browse')
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Community</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {view === 'chat' ? `${joinedCohorts.length} group${joinedCohorts.length !== 1 ? 's' : ''} joined` : 'Find your people'}
          </p>
        </div>
        <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setView('browse')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${view === 'browse' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            Browse
          </button>
          {joinedCohorts.length > 0 && (
            <button
              type="button"
              onClick={() => setView('chat')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${view === 'chat' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              My groups {joinedCohorts.length > 0 && <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{joinedCohorts.length}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Browse view */}
      {view === 'browse' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cohorts.map((cohort) => (
            <GroupCard
              key={cohort.id}
              cohort={cohort}
              joined={joined.includes(cohort.id)}
              onJoin={() => join(cohort.id)}
              onLeave={() => leave(cohort.id)}
            />
          ))}
        </div>
      )}

      {/* Chat view */}
      {view === 'chat' && joinedCohorts.length > 0 && (
        <div className="flex h-[calc(100vh-14rem)] flex-col gap-4 sm:flex-row">
          {/* Sidebar — joined groups */}
          <div className="flex shrink-0 gap-2 sm:w-52 sm:flex-col sm:gap-2 overflow-x-auto sm:overflow-x-visible">
            {joinedCohorts.map((cohort) => (
              <button
                key={cohort.id}
                type="button"
                onClick={() => setActiveId(cohort.id)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition sm:w-full ${
                  activeId === cohort.id
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
                }`}
              >
                <p className={`text-sm font-semibold truncate ${activeId === cohort.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                  {cohort.label}
                </p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setView('browse')}
              className="shrink-0 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-left transition hover:border-blue-300 dark:border-slate-700 sm:w-full"
            >
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">+ Join another</p>
            </button>
          </div>

          {/* Chat panel */}
          {activeCohort && (
            <GroupChat cohort={activeCohort} user={user} />
          )}
        </div>
      )}

    </section>
  )
}

export default Community
