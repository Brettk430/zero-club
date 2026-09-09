import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import { myClubs, createClub, joinClub, leaveClub, clubStandings, clubTotals } from '../lib/clubs.js'
import { money } from '../lib/zero.js'
import { track } from '../lib/analytics.js'

// The social half of the product. Rankings are by percentage, never by how much
// someone owes — a $2k member and a $200k member stand on the same ladder.

const Bar = ({ pct, highlight }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
    <div
      className={`h-full rounded-full transition-[width] duration-700 ${highlight ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-slate-300'}`}
      style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }}
    />
  </div>
)

const Standings = ({ club, meId, onLeave }) => {
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    clubStandings(club.id).then((r) => {
      if (cancelled) return
      setRows(r.rows); setReady(r.ready); setLoading(false)
    })
    return () => { cancelled = true }
  }, [club.id])

  const totals = clubTotals(rows)

  const invite = async () => {
    const text = `Join my Zero Club: ${club.name}\n\nCode: ${club.invite_code}\n${window.location.origin}/clubs?code=${club.invite_code}`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    } catch { /* dismissed */ }
  }

  return (
    <div>
      <div className="rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">The club</p>
        <h2 className="mt-1.5 text-2xl font-black tracking-tight">{club.name}</h2>

        {loading ? (
          <div className="mt-6 h-16 animate-pulse rounded-2xl bg-white/5" />
        ) : (
          <>
            <p className="mt-6 text-4xl font-black tracking-tighter text-emerald-400">{money(totals.eliminated)}</p>
            <p className="mt-1 text-sm text-slate-400">
              eliminated together by {totals.members} {totals.members === 1 ? 'member' : 'members'}
            </p>
            {totals.monthPaid > 0 && (
              <p className="mt-3 border-t border-white/10 pt-3 text-sm text-slate-400">
                <span className="font-bold text-white">{money(totals.monthPaid)}</span> this month
              </p>
            )}
          </>
        )}

        <button
          onClick={invite}
          className="mt-6 w-full rounded-full bg-white py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
        >
          {copied ? 'Invite copied' : 'Invite friends'}
        </button>
        <p className="mt-2.5 text-center text-xs text-slate-500">
          Code <span className="font-mono font-bold tracking-widest text-slate-300">{club.invite_code}</span>
        </p>
      </div>

      {!ready && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Standings aren't switched on yet — the database migration still needs to run.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Progress to zero</p>
          <ol className="mt-4 space-y-4">
            {rows.map((r, i) => {
              const me = r.userId === meId
              return (
                <li key={r.userId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`truncate text-sm font-bold ${me ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      <span className="mr-2 text-slate-400 dark:text-slate-500">{i + 1}</span>
                      {r.displayName || r.handle}{me && ' (you)'}
                    </p>
                    <p className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-white">
                      {r.progressPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-1.5"><Bar pct={r.progressPct} highlight={me} /></div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {r.eliminated === null
                      ? 'Amounts private'
                      : <>{money(r.eliminated)} eliminated{r.monthPaid > 0 && <> · {money(r.monthPaid)} this month</>}</>}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <button
        onClick={() => onLeave(club)}
        className="mt-4 w-full py-3 text-xs font-semibold text-slate-400 transition hover:text-red-500"
      >
        Leave {club.name}
      </button>
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
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const result = await myClubs(user.id)
    setClubs(result.clubs)
    setReady(result.ready)
    setLoading(false)
    setActive((cur) => result.clubs.find((c) => c.id === cur?.id) ?? result.clubs[0] ?? null)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // An invite link lands here with the code already filled in
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code && user) { setMode('join'); setDraft(code.toUpperCase()) }
  }, [user])

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true); setError('')

    const result = mode === 'create'
      ? await createClub(user.id, draft)
      : await joinClub(draft.trim().toUpperCase())

    setBusy(false)
    if (result.error) { setError(result.error); return }
    track(mode === 'create' ? 'club_created' : 'club_joined')
    setDraft(''); setMode(null)
    refresh()
  }

  const handleLeave = async (club) => {
    await leaveClub(club.id, user.id)
    refresh()
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-6xl font-black text-slate-200 dark:text-slate-800">0</p>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Clubs are for members</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to start a club or join one with a code.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Clubs</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get to zero with your people. You post as {handle}.</p>

      {clubs.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
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

      <div className="mt-5">
        {loading ? (
          <div className="h-56 animate-pulse rounded-[28px] bg-slate-100 dark:bg-slate-900" />
        ) : active ? (
          <Standings club={active} meId={user.id} onLeave={handleLeave} />
        ) : (
          <div className="rounded-[28px] bg-slate-950 p-8 text-center text-white">
            <p className="text-6xl font-black tracking-tighter">0</p>
            <h2 className="mt-3 text-xl font-black">Nobody gets there alone</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start a club with friends, a couple, a class — anyone chasing the same thing.
            </p>
            {!ready && (
              <p className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                Clubs aren't switched on yet — the database migration still needs to run.
              </p>
            )}
          </div>
        )}
      </div>

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
    </section>
  )
}

export default Clubs
