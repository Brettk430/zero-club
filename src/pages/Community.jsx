import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

const cohorts = [
  { id: 'dff-2026', label: 'Debt-Free by 2026' },
  { id: 'dff-2027', label: 'Debt-Free by 2027' },
  { id: 'dff-2028', label: 'Debt-Free by 2028' },
  { id: 'dff-2029', label: 'Debt-Free by 2029' },
  { id: 'dff-2030', label: 'Debt-Free by 2030' },
  { id: 'student-loans', label: 'Student Loans' },
  { id: 'credit-cards', label: 'Credit Cards' },
  { id: 'under-30', label: 'Under 30' },
  { id: 'couples', label: 'Couples' },
]

const getOrCreateUsername = () => {
  const stored = localStorage.getItem('zc_username')
  if (stored) return stored
  const adjectives = ['Quiet', 'Bold', 'Steady', 'Calm', 'Focused', 'Brave', 'Sharp', 'Driven']
  const animals = ['Falcon', 'Wolf', 'Fox', 'Sparrow', 'Otter', 'Hawk', 'Bear', 'Eagle']
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${Math.floor(Math.random() * 99)}`
  localStorage.setItem('zc_username', name)
  return name
}

const CommunityChat = () => {
  const { user } = useAuth()
  const [selectedCohort, setSelectedCohort] = useState(cohorts[1])
  const [username] = useState(getOrCreateUsername)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const roomLabel = selectedCohort.id

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
      .eq('room', roomLabel)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(data.map((m) => ({
            id: m.id, author: m.username, text: m.message,
            timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id,
          })))
        }
      })
  }, [roomLabel, supabaseReady, user?.id])

  useEffect(() => {
    if (!supabaseReady) return
    const channel = supabase
      .channel(`room-${roomLabel}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_messages',
        filter: `room=eq.${roomLabel}`,
      }, (payload) => {
        const m = payload.new
        setMessages((prev) => {
          if (prev.some((p) => p.id === m.id)) return prev
          return [...prev, {
            id: m.id, author: m.username, text: m.message,
            timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id,
          }]
        })
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [roomLabel, supabaseReady, user?.id])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!draft.trim() || !user || sending) return
    const text = draft.trim()
    setDraft('')
    setSending(true)
    inputRef.current?.focus()
    await supabase.from('community_messages').insert([{
      user_id: user.id, username, message: text, room: roomLabel,
    }])
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Community</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">You are <span className="font-semibold text-slate-600 dark:text-slate-300">{username}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Cohort tabs — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 scrollbar-hide dark:border-slate-800">
        {cohorts.map((cohort) => (
          <button
            key={cohort.id}
            type="button"
            onClick={() => setSelectedCohort(cohort)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              selectedCohort.id === cohort.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {cohort.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">
              No messages yet in <span className="font-semibold">{selectedCohort.label}</span>.<br />Be the first to share a win or ask for support.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.isOwn
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}>
              {!message.isOwn && (
                <p className="mb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">{message.author}</p>
              )}
              <p className={`text-sm leading-relaxed ${message.isOwn ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {message.text}
              </p>
              <p className={`mt-1 text-right text-[10px] ${message.isOwn ? 'text-blue-200' : 'text-slate-300 dark:text-slate-600'}`}>
                {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric' }).format(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        {user ? (
          <form className="flex gap-2" onSubmit={handleSend}>
            <input
              ref={inputRef}
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
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
        ) : (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500">
            <button onClick={() => document.querySelector('[data-auth-trigger]')?.click()} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Sign in
            </button>{' '}to join the conversation
          </p>
        )}
      </div>
    </div>
  )
}

const Community = () => (
  <section className="mx-auto max-w-4xl px-4 py-4 text-slate-900 sm:px-6 sm:py-8 dark:text-slate-100">
    <CommunityChat />
  </section>
)

export default Community
