import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { myClubs, clubStandings, clubTotals, leaveClub, categoryLabel } from '../lib/clubs.js'
import { money } from '../lib/zero.js'
import Avatar from '../components/Avatar.jsx'
import ClubChat from '../components/ClubChat.jsx'
import { useUnread } from '../context/UnreadContext.jsx'

const Bar = ({ pct, highlight }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist dark:bg-deep-600">
    <div
      className={`h-full rounded-full transition-[width] duration-700 ${highlight ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-slate-300'}`}
      style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }}
    />
  </div>
)

const Standings = ({ clubId, meId }) => {
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [board, setBoard] = useState('progress')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    clubStandings(clubId).then((r) => {
      if (cancelled) return
      setRows(r.rows); setReady(r.ready); setLoading(false)
    })
    return () => { cancelled = true }
  }, [clubId])

  // Both boards rank on something the member did. Ranking on balance would put
  // whoever carries the most debt last for carrying the most debt.
  const ranked = useMemo(() => {
    const copy = [...rows]
    if (board === 'month') copy.sort((a, b) => (b.monthPaid ?? -1) - (a.monthPaid ?? -1))
    else copy.sort((a, b) => b.progressPct - a.progressPct)
    return copy
  }, [rows, board])

  if (!ready) {
    return (
      <p className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Standings need a database update that has not been applied yet.
      </p>
    )
  }
  if (loading) return <div className="h-48 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />

  const totals = clubTotals(rows)

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
        {[['progress', 'Most progress'], ['month', 'This month']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBoard(id)}
            className={`flex-1 rounded-full py-2 transition ${
              board === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-4">
        {ranked.map((r, i) => {
          const me = r.userId === meId
          return (
            <li key={r.userId}>
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</span>
                <Link to={`/u/${encodeURIComponent(r.handle)}`} className="shrink-0">
                  <Avatar url={r.avatarUrl} name={r.handle} size={32} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      to={`/u/${encodeURIComponent(r.handle)}`}
                      className={`truncate text-sm font-bold hover:underline underline-offset-4 ${me ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}
                    >
                      {r.displayName || r.handle}{me && ' (you)'}
                    </Link>
                    <p className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-white">
                      {board === 'month'
                        ? (r.monthPaid === null ? '—' : money(r.monthPaid))
                        : `${r.progressPct.toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="mt-1.5"><Bar pct={r.progressPct} highlight={me} /></div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {r.eliminated === null
                      ? `Amounts private · ${r.progressPct.toFixed(1)}% to zero`
                      : board === 'month'
                        ? `${r.progressPct.toFixed(1)}% to zero overall`
                        : `${money(r.eliminated)} eliminated`}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Together</p>
        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{money(totals.eliminated)}</p>
      </div>
    </div>
  )
}

const ClubDetail = () => {
  const { clubId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('standings')
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const { byClub, markRead } = useUnread()

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const { clubs } = await myClubs(user.id)
    setClub(clubs.find((c) => c.id === clubId) ?? null)
    setLoading(false)
  }, [user, clubId])

  useEffect(() => { load() }, [load])

  // Reading the room is what clears it — not merely landing on the club page,
  // where the standings tab may be all you came for.
  useEffect(() => {
    if (tab === 'chat' && clubId) markRead(clubId)
  }, [tab, clubId, markRead])

  const invite = async () => {
    const text = `Join my Zero Club: ${club.name}\n\nCode: ${club.invite_code}\n${window.location.origin}/clubs?code=${club.invite_code}`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    } catch { /* dismissed */ }
  }

  if (loading) {
    return <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6"><div className="h-56 animate-pulse rounded-[28px] bg-slate-100 dark:bg-slate-900" /></section>
  }

  if (!club) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">You're not in this club</h1>
        <Link to="/clubs" className="mt-4 inline-block text-sm font-bold text-emerald-600 underline underline-offset-4 dark:text-emerald-400">
          Back to clubs
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <Link to="/clubs" className="text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        ← Clubs
      </Link>

      <div className="mt-3 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">The club</p>
            <h1 className="mt-1.5 break-words text-2xl font-black tracking-tight">{club.name}</h1>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            club.is_public ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-300'
          }`}>
            {club.is_public ? (categoryLabel(club.category) ?? 'Public') : 'Private'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex rounded-full border border-slate-200 bg-white p-0.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900">
        {[['standings', 'Standings'], ['chat', 'Chat']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex-1 rounded-full py-2.5 transition ${
              tab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
            {id === 'chat' && (byClub[club.id] || 0) > 0 && tab !== 'chat' && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-black text-deep">
                {byClub[club.id] > 9 ? '9+' : byClub[club.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === 'standings'
          ? <Standings clubId={club.id} meId={user.id} />
          : <ClubChat clubId={club.id} meId={user.id} />}
      </div>

      {/* Invite and leave sit at the end, out of the way of the club itself */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Bring someone in</p>
        <button
          onClick={invite}
          className="mt-3 w-full rounded-full bg-lime py-3.5 text-sm font-bold text-deep transition hover:bg-[#D9FF7A]"
        >
          {copied ? 'Invite copied' : 'Invite friends'}
        </button>
        <p className="mt-2.5 text-center text-xs text-slate-500 dark:text-slate-400">
          Code <span className="font-mono font-bold tracking-widest text-slate-700 dark:text-slate-300">{club.invite_code}</span>
        </p>
      </div>

      {leaving ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-center dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Leave {club.name}?</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setLeaving(false)} className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Cancel
            </button>
            <button
              onClick={async () => { await leaveClub(club.id, user.id); navigate('/clubs') }}
              className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white"
            >
              Leave
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setLeaving(true)} className="mt-4 w-full py-3 text-xs font-semibold text-slate-400 transition hover:text-red-500">
          Leave {club.name}
        </button>
      )}
    </section>
  )
}

export default ClubDetail
