import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import {
  myClubs, createClub, joinClub, leaveClub, clubStandings, clubTotals,
  discoverClubs, joinPublicClub,
} from '../lib/clubs.js'
import { money } from '../lib/zero.js'
import { track } from '../lib/analytics.js'
import Avatar from '../components/Avatar.jsx'
import ClubChat from '../components/ClubChat.jsx'

// The social half. Rankings are by percentage, never by how much someone owes —
// a $2k member and a $200k member stand on the same ladder.

const Bar = ({ pct, highlight }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
    <div
      className={`h-full rounded-full transition-[width] duration-700 ${highlight ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-slate-300'}`}
      style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }}
    />
  </div>
)

const Standings = ({ club, meId }) => {
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [board, setBoard] = useState('progress')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    clubStandings(club.id).then((r) => {
      if (cancelled) return
      setRows(r.rows); setReady(r.ready); setLoading(false)
    })
    return () => { cancelled = true }
  }, [club.id])

  const totals = clubTotals(rows)

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
                <Avatar url={r.avatarUrl} name={r.handle} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`truncate text-sm font-bold ${me ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {r.displayName || r.handle}{me && ' (you)'}
                    </p>
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

const Discover = ({ onJoined, joinedIds }) => {
  const [clubs, setClubs] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async (term) => {
    setLoading(true)
    const r = await discoverClubs(term)
    setClubs(r.clubs); setReady(r.ready); setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search, load])

  const join = async (club) => {
    setBusyId(club.id)
    const { error } = await joinPublicClub(club.id)
    setBusyId(null)
    if (!error) { track('club_joined_public'); onJoined() }
  }

  if (!ready) return null

  return (
    <div className="mt-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Find a club</p>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search public clubs…"
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        ) : clubs.length === 0 ? (
          <p className="rounded-2xl bg-white px-5 py-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
            {search ? 'No public clubs match that.' : 'No public clubs yet — start the first one.'}
          </p>
        ) : (
          clubs.map((c) => {
            const joined = joinedIds.has(c.id)
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                    {c.eliminated !== null && <> · {money(c.eliminated)} eliminated</>}
                  </p>
                </div>
                <button
                  onClick={() => join(c)}
                  disabled={joined || busyId === c.id}
                  className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900"
                >
                  {joined ? 'Joined' : busyId === c.id ? '…' : 'Join'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const Clubs = () => {
  const { user } = useAuth()
  const { handle } = useZero()
  const [clubs, setClubs] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [tab, setTab] = useState('standings')
  const [mode, setMode] = useState(null)
  const [draft, setDraft] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const result = await myClubs(user.id)
    setClubs(result.clubs)
    setReady(result.ready)
    setLoading(false)
    setActive((cur) => result.clubs.find((c) => c.id === cur?.id) ?? result.clubs[0] ?? null)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code && user) { setMode('join'); setDraft(code.toUpperCase()) }
  }, [user])

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true); setError('')
    const result = mode === 'create'
      ? await createClub(user.id, draft, isPublic)
      : await joinClub(draft.trim().toUpperCase())
    setBusy(false)
    if (result.error) { setError(result.error); return }
    track(mode === 'create' ? 'club_created' : 'club_joined')
    setDraft(''); setMode(null); setIsPublic(false)
    refresh()
  }

  const invite = async () => {
    const text = `Join my Zero Club: ${active.name}\n\nCode: ${active.invite_code}\n${window.location.origin}/clubs?code=${active.invite_code}`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    } catch { /* dismissed */ }
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-6xl font-black text-slate-200 dark:text-slate-800">0</p>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Clubs are for members</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to start a club, join a public one, or use an invite code.</p>
      </section>
    )
  }

  const joinedIds = new Set(clubs.map((c) => c.id))

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Clubs</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get to zero with your people. You post as {handle}.</p>

      {clubs.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActive(c); setTab('standings') }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                active?.id === c.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-5 h-56 animate-pulse rounded-[28px] bg-slate-100 dark:bg-slate-900" />
      ) : active ? (
        <div className="mt-5">
          <div className="rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">The club</p>
                <h2 className="mt-1.5 truncate text-2xl font-black tracking-tight">{active.name}</h2>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                active.is_public ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-300'
              }`}>
                {active.is_public ? 'Public' : 'Private'}
              </span>
            </div>
            <button onClick={invite} className="mt-6 w-full rounded-full bg-white py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200">
              {copied ? 'Invite copied' : 'Invite friends'}
            </button>
            <p className="mt-2.5 text-center text-xs text-slate-500">
              Code <span className="font-mono font-bold tracking-widest text-slate-300">{active.invite_code}</span>
            </p>
          </div>

          <div className="mt-3 flex rounded-full border border-slate-200 bg-white p-0.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900">
            {[['standings', 'Standings'], ['chat', 'Chat']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 rounded-full py-2.5 transition ${
                  tab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {tab === 'standings'
              ? <Standings club={active} meId={user.id} />
              : <ClubChat clubId={active.id} meId={user.id} />}
          </div>

          <button
            onClick={async () => { await leaveClub(active.id, user.id); refresh() }}
            className="mt-4 w-full py-3 text-xs font-semibold text-slate-400 transition hover:text-red-500"
          >
            Leave {active.name}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-[28px] bg-slate-950 p-8 text-center text-white">
          <p className="text-6xl font-black tracking-tighter">0</p>
          <h2 className="mt-3 text-xl font-black">Nobody gets there alone</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Start a club with friends, or join a public one below.
          </p>
          {!ready && (
            <p className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              Clubs need a database update that has not been applied yet.
            </p>
          )}
        </div>
      )}

      {/* Create / join */}
      <div className="mt-4">
        {mode ? (
          <form onSubmit={submit} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {mode === 'create' ? 'Name your club' : 'Enter the invite code'}
            </p>
            <input
              autoFocus
              value={draft}
              maxLength={mode === 'create' ? 50 : 12}
              onChange={(e) => setDraft(mode === 'join' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={mode === 'create' ? 'Boys Debt Free by 30' : 'ABC1234'}
              className={`mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${mode === 'join' ? 'text-center font-mono text-lg font-bold tracking-[0.3em]' : ''}`}
            />

            {mode === 'create' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  [false, 'Private', 'Invite code only'],
                  [true, 'Public', 'Anyone can find and join'],
                ].map(([value, label, hint]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setIsPublic(value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      isPublic === value
                        ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</span>
                  </button>
                ))}
              </div>
            )}

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { setMode(null); setError(''); setDraft('') }} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={busy || !draft.trim()} className="flex-[2] rounded-full bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">
                {busy ? 'Working…' : mode === 'create' ? 'Create club' : 'Join club'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMode('create')} className="rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">
              Start a club
            </button>
            <button onClick={() => setMode('join')} className="rounded-2xl bg-white py-4 text-sm font-bold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-300 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
              Join with a code
            </button>
          </div>
        )}
      </div>

      <Discover onJoined={refresh} joinedIds={joinedIds} />
    </section>
  )
}

export default Clubs
