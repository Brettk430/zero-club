import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import ProGate from '../components/ProGate.jsx'

const cohorts = [
  { id: 'dff-2026', label: 'Debt-Free by 2026', description: 'Final sprint — the finish line is close' },
  { id: 'dff-2027', label: 'Debt-Free by 2027', description: 'Three years, one goal' },
  { id: 'dff-2028', label: 'Debt-Free by 2028', description: 'Building momentum, staying consistent' },
  { id: 'dff-2029', label: 'Debt-Free by 2029', description: 'Playing the long game with focus' },
  { id: 'dff-2030', label: 'Debt-Free by 2030', description: 'Five-year journey, lifetime result' },
  { id: 'student-loans', label: 'Student Loan Crushers', description: 'Eliminating education debt together' },
  { id: 'credit-cards', label: 'Credit Card Elimination', description: 'Cutting the cards for good' },
  { id: 'under-30', label: 'Under 30 Debt-Free', description: 'Young, focused, and getting free' },
  { id: 'couples', label: 'Couples Paying Off Debt', description: 'Two incomes, one mission' },
]

const randomUsername = () => {
  const adjectives = ['Quiet', 'Bold', 'Steady', 'Calm', 'Focused', 'Brave', 'Sharp', 'Driven']
  const animals = ['Falcon', 'Wolf', 'Fox', 'Sparrow', 'Otter', 'Hawk', 'Bear', 'Eagle']
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${Math.floor(Math.random() * 99)}`
}

const CommunityChat = () => {
  const { user } = useAuth()
  const [selectedCohort, setSelectedCohort] = useState(cohorts[1])
  const [username] = useState(randomUsername)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef(null)

  const roomLabel = selectedCohort.id

  const supabaseConfigured = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
    if (!supabaseConfigured || !supabase) return
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
  }, [roomLabel, supabaseConfigured, user?.id])

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    const channel = supabase
      .channel(`community-${roomLabel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `room=eq.${roomLabel}` }, (payload) => {
        const m = payload.new
        setMessages((prev) => {
          if (prev.some((p) => p.id === m.id)) return prev
          return [...prev, { id: m.id, author: m.username, text: m.message, timestamp: new Date(m.created_at), isOwn: m.user_id === user?.id }]
        })
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [roomLabel, supabaseConfigured, user?.id])

  const handleSend = async (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    const text = draft.trim()
    setDraft('')
    if (supabaseConfigured && supabase && user) {
      await supabase.from('community_messages').insert([{
        user_id: user.id, username, message: text, room: roomLabel,
      }])
    } else {
      setMessages((prev) => [...prev, { id: Date.now(), author: username, text, timestamp: new Date(), isOwn: true }])
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">Cohorts</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base dark:text-slate-400">
            Join a group matched to your goal. People with the same target make better accountability partners.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 ${connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      {/* Cohort selector */}
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((cohort) => (
          <button
            key={cohort.id}
            type="button"
            onClick={() => setSelectedCohort(cohort)}
            className={`rounded-2xl border p-4 text-left transition ${
              selectedCohort.id === cohort.id
                ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600'
            }`}
          >
            <p className={`text-sm font-semibold ${selectedCohort.id === cohort.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
              {cohort.label}
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{cohort.description}</p>
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedCohort.label}</p>
          <span className="text-xs text-slate-400 dark:text-slate-500">as {username}</span>
        </div>
        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No messages yet — be the first to share a win or ask for support.
            </p>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`rounded-2xl p-3 sm:p-4 ${message.isOwn ? 'bg-blue-600 text-white dark:bg-blue-700' : 'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
              <div className={`flex items-center justify-between text-xs ${message.isOwn ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                <span className="font-semibold">{message.author}</span>
                <span>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric' }).format(message.timestamp)}</span>
              </div>
              <p className={`mt-2 text-sm ${message.isOwn ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{message.text}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form className="mt-4 flex gap-3" onSubmit={handleSend}>
          <input
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share a win, ask for support, stay accountable…"
          />
          <button type="submit" className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

const Community = () => (
  <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
    <ProGate feature="the Cohort Community">
      <CommunityChat />
    </ProGate>
  </section>
)

export default Community
