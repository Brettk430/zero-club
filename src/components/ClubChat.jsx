import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchChat, sendMessage } from '../lib/clubs.js'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

const stamp = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const ClubChat = ({ clubId, meId }) => {
  const [messages, setMessages] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const firstLoad = useRef(true)

  const load = useCallback(async () => {
    const result = await fetchChat(clubId)
    setMessages(result.messages)
    setReady(result.ready)
    setLoading(false)
  }, [clubId])

  useEffect(() => {
    firstLoad.current = true
    setLoading(true)
    load()
  }, [load])

  // Polled rather than subscribed: realtime needs replication switched on for
  // the table, and a club room is quiet enough that every fifteen seconds reads
  // as live. Paused while the tab is hidden so a backgrounded phone isn't
  // polling all day.
  useEffect(() => {
    const tick = () => { if (!document.hidden) load() }
    const id = setInterval(tick, 15000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [load])

  useEffect(() => {
    if (!messages.length) return
    endRef.current?.scrollIntoView({ behavior: firstLoad.current ? 'auto' : 'smooth', block: 'nearest' })
    firstLoad.current = false
  }, [messages])

  const submit = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    const { error: err } = await sendMessage(clubId, meId, text)
    setSending(false)
    if (err) { setError(err); return }
    setDraft('')
    load()
  }

  if (!ready) {
    return (
      <p className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Chat needs a database update that has not been applied yet.
      </p>
    )
  }

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div className="max-h-[52vh] min-h-[220px] space-y-3 overflow-y-auto p-5">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <Logo variant="plain" size={44} className="mx-auto opacity-70" />
            <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No messages yet</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Say something — this room is just your club.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === meId
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                {!mine && <Avatar url={m.avatar_url} name={m.handle} size={28} />}
                <div className={`max-w-[78%] ${mine ? 'text-right' : ''}`}>
                  {!mine && <p className="mb-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{m.handle}</p>}
                  <div className={`inline-block rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                    mine
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                  }`}>
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{stamp(m.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <input
          value={draft}
          maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message your club…"
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-30 dark:bg-white dark:text-slate-900"
        >
          Send
        </button>
      </form>
      {error && <p className="px-5 pb-3 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default ClubChat
