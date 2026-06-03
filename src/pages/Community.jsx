import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import ProGate from '../components/ProGate.jsx'

const dtiRanges = ['0-20%', '21-40%', '41-60%', '61-80%', '81%+']
const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other']

const randomUsername = () => {
  const adjectives = ['Quiet', 'Bold', 'Steady', 'Calm', 'Focused', 'Brave']
  const animals = ['Falcon', 'Wolf', 'Fox', 'Sparrow', 'Otter', 'Hawk']
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${Math.floor(Math.random() * 99)}`
}

const selectCls = 'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'

const CommunityChat = () => {
  const { user } = useAuth()
  const [country, setCountry] = useState(countries[0])
  const [dtiRange, setDtiRange] = useState(dtiRanges[1])
  const [username] = useState(randomUsername)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef(null)

  const roomLabel = `${dtiRange} | ${country}`

  const supabaseConfigured = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
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
      await supabase.from('community_messages').insert([{ user_id: user.id, username, message: text, room: roomLabel, country, dti_range: dtiRange }])
    } else {
      setMessages((prev) => [...prev, { id: Date.now(), author: username, text, timestamp: new Date(), isOwn: true }])
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">Community</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:mt-3 sm:text-base dark:text-slate-400">
            Join an anonymous peer room and stay accountable with others working toward debt freedom.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 ${connected ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              Your username
              <p className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">{username}</p>
            </label>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              Country
              <select className={selectCls} value={country} onChange={(e) => setCountry(e.target.value)}>
                {countries.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-600 dark:text-slate-400">
            Debt-to-income range
            <select className={selectCls} value={dtiRange} onChange={(e) => setDtiRange(e.target.value)}>
              {dtiRanges.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 sm:p-6 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">Room</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{roomLabel}</p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Matched by DTI range and country to keep conversations relevant.</p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:mt-8 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No messages yet — be the first to share a win!</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl p-4 ${message.isOwn ? 'bg-blue-600 text-white dark:bg-blue-700' : 'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
            >
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
            placeholder="Share a win, ask for support…"
          />
          <button
            type="submit"
            className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

const Community = () => (
  <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
    <ProGate feature="the Peer Community">
      <CommunityChat />
    </ProGate>
  </section>
)

export default Community
