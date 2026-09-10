import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchFriends, fetchPendingRequests, acceptFriend, removeFriend } from '../lib/members.js'
import Avatar from './Avatar.jsx'

// Requests sit above the list rather than in a separate place: an unanswered
// request is the only thing here that needs a decision, and until this existed
// one could only be found by happening to open the sender's profile.
const Friends = () => {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const [f, p] = await Promise.all([fetchFriends(), fetchPendingRequests()])
    setFriends(f.friends); setReady(f.ready); setPending(p); setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const act = async (id, fn) => {
    setBusyId(id)
    await fn()
    setBusyId(null)
    load()
  }

  if (!user || loading) return null
  if (!ready) {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Friends</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Friends need a database update that has not been applied yet.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Friends</p>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{friends.length}</p>
      </div>

      {pending.length > 0 && (
        <div className="mt-4 space-y-2">
          {pending.map((p) => (
            <div key={p.userId} className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
              <Avatar url={p.avatarUrl} name={p.handle} size={32} />
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                {p.handle}
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">wants to be friends</span>
              </p>
              <button
                onClick={() => act(p.userId, () => acceptFriend(user.id, p.userId))}
                disabled={busyId === p.userId}
                className="shrink-0 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
              >
                Accept
              </button>
              <button
                onClick={() => act(p.userId, () => removeFriend(user.id, p.userId))}
                disabled={busyId === p.userId}
                aria-label={`Decline ${p.handle}`}
                className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:text-red-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {friends.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Nobody yet. Tap a name in your club standings or the feed to see their profile and add them.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {friends.map((f) => (
            <Link
              key={f.userId}
              to={`/u/${encodeURIComponent(f.handle)}`}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Avatar url={f.avatarUrl} name={f.handle} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{f.handle}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {f.progressPct.toFixed(1)}% to zero · {f.badges} {f.badges === 1 ? 'badge' : 'badges'}
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Friends
