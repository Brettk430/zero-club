import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import {
  myClubs, createClub, joinClub, discoverClubs, joinPublicClub,
  CLUB_CATEGORIES, categoryLabel,
} from '../lib/clubs.js'
import { money } from '../lib/zero.js'
import { track } from '../lib/analytics.js'
import Logo from '../components/Logo.jsx'

// An index, not a dashboard: pick a club and go to it. Everything about a
// particular club — standings, chat, invites — lives on that club's own page.

const ClubCard = ({ club }) => (
  <Link
    to={`/clubs/${club.id}`}
    className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
  >
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{club.name}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {club.is_public ? (categoryLabel(club.category) ?? 'Public') : 'Private'}
        {club.role === 'owner' && ' · You started it'}
      </p>
    </div>
    <span className="shrink-0 text-lg text-slate-400">→</span>
  </Link>
)

const Discover = ({ onJoined, joinedIds, prominent = false }) => {
  const [clubs, setClubs] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async (term, cat) => {
    setLoading(true)
    const r = await discoverClubs(term, cat)
    setClubs(r.clubs); setReady(r.ready); setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search, category), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search, category, load])

  const join = async (club) => {
    setBusyId(club.id)
    const { error } = await joinPublicClub(club.id)
    setBusyId(null)
    if (!error) { track('club_joined_public'); onJoined() }
  }

  if (!ready) return null

  return (
    <div className={prominent ? 'mt-5' : 'mt-8'}>
      {/* With no clubs of your own, finding one is the whole point of the page,
          so it leads rather than sitting underneath an empty list. */}
      {prominent ? (
        <>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Find your club</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join a public one below, or start your own at the bottom.
          </p>
        </>
      ) : (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Find a club</p>
      )}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search public clubs…"
        className={`w-full rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
          prominent ? 'mt-4 px-5 py-4 text-base' : 'mt-2 px-4 py-3 text-sm'
        }`}
      />
      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {[{ id: null, label: 'All' }, ...CLUB_CATEGORIES].map((c) => (
          <button
            key={c.id ?? 'all'}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              category === c.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        ) : clubs.length === 0 ? (
          <p className="rounded-2xl bg-white px-5 py-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
            {search || category ? 'No public clubs match that yet.' : 'No public clubs yet — start the first one.'}
          </p>
        ) : (
          clubs.map((c) => {
            const joined = joinedIds.has(c.id)
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {c.category && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{categoryLabel(c.category)}</span>}
                    {c.category && ' · '}
                    {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                    {c.eliminated !== null && <> · {money(c.eliminated)} eliminated</>}
                  </p>
                </div>
                {joined ? (
                  <Link to={`/clubs/${c.id}`} className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400">Open</Link>
                ) : (
                  <button
                    onClick={() => join(c)}
                    disabled={busyId === c.id}
                    className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900"
                  >
                    {busyId === c.id ? '…' : 'Join'}
                  </button>
                )}
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
  const [mode, setMode] = useState(null)
  const [draft, setDraft] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [newCategory, setNewCategory] = useState('open')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const result = await myClubs(user.id)
    setClubs(result.clubs); setReady(result.ready); setLoading(false)
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
      ? await createClub(user.id, draft, isPublic, newCategory)
      : await joinClub(draft.trim().toUpperCase())
    setBusy(false)
    if (result.error) { setError(result.error); return }
    track(mode === 'create' ? 'club_created' : 'club_joined')
    setDraft(''); setMode(null); setIsPublic(false); setNewCategory('open')
    refresh()
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <Logo variant="plain" size={64} className="mx-auto opacity-70" />
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Clubs are for members</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to start a club, join a public one, or use an invite code.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Clubs</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get to zero with your people. You post as {handle}.</p>

      <div className={clubs.length || loading ? "mt-5 space-y-2" : ""}>
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        ) : clubs.length ? (
          clubs.map((c) => <ClubCard key={c.id} club={c} />)
        ) : !ready ? (
          <p className="rounded-2xl bg-amber-50 px-5 py-4 text-center text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Clubs need a database update that has not been applied yet.
          </p>
        ) : null}
      </div>

      <Discover
        onJoined={refresh}
        joinedIds={new Set(clubs.map((c) => c.id))}
        prominent={!loading && clubs.length === 0}
      />

      {/* Creating and joining are occasional acts, so they sit at the end
          rather than dominating the page you land on. */}
      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
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
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[[false, 'Private', 'Invite code only'], [true, 'Public', 'Anyone can find it']].map(([value, label, hint]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setIsPublic(value)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        isPublic === value ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</span>
                    </button>
                  ))}
                </div>
                {isPublic && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">What's it about?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CLUB_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewCategory(c.id)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                            newCategory === c.id
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
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
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <button onClick={() => setMode('create')} className="font-bold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Start a club
            </button>
            <button onClick={() => setMode('join')} className="font-bold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Join with a code
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default Clubs
