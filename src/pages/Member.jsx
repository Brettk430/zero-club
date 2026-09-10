import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchMemberProfile, fetchMemberClubs, requestFriend, acceptFriend, removeFriend } from '../lib/members.js'
import { categoryLabel } from '../lib/clubs.js'
import { money } from '../lib/zero.js'
import Avatar from '../components/Avatar.jsx'
import Logo from '../components/Logo.jsx'

const MILESTONE_TOTAL = 11

const sinceLabel = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const months = Math.max(0, Math.round((Date.now() - d.getTime()) / (30.44 * 86400000)))
  if (months < 1) return 'Joined this month'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} in`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} in`
}

const Stat = ({ label, value, accent }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-black ${accent || 'text-white'}`}>{value}</p>
  </div>
)

const Member = () => {
  const { handle } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [clubs, setClubs] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { profile: p, ready: r } = await fetchMemberProfile(handle)
    setProfile(p); setReady(r)
    if (p) setClubs(await fetchMemberClubs(handle))
    setLoading(false)
  }, [handle])

  useEffect(() => { load() }, [load])

  const act = async (fn) => {
    setBusy(true)
    await fn()
    setBusy(false)
    load()
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <Logo variant="plain" size={56} className="mx-auto opacity-70" />
        <h1 className="mt-5 text-xl font-black text-slate-900 dark:text-white">Sign in to view members</h1>
      </section>
    )
  }

  if (loading) {
    return <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6"><div className="h-64 animate-pulse rounded-[28px] bg-slate-100 dark:bg-slate-900" /></section>
  }

  if (!ready) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Member profiles need a database update that has not been applied yet.
        </p>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">No member called “{handle}”</h1>
        <Link to="/feed" className="mt-4 inline-block text-sm font-bold text-emerald-600 underline underline-offset-4 dark:text-emerald-400">Back to the feed</Link>
      </section>
    )
  }

  const friendAction = {
    none:        { label: 'Add friend',      run: () => requestFriend(user.id, profile.userId) },
    pending_out: { label: 'Request sent',    run: () => removeFriend(user.id, profile.userId), quiet: true },
    pending_in:  { label: 'Accept request',  run: () => acceptFriend(user.id, profile.userId) },
    friends:     { label: 'Friends ✓',       run: () => removeFriend(user.id, profile.userId), quiet: true },
  }[profile.friendStatus]

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar url={profile.avatarUrl} name={profile.handle} size={64} />
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-black tracking-tight">{profile.displayName || profile.handle}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {sinceLabel(profile.memberSince)}
              {profile.mutualFriends > 0 && ` · ${profile.mutualFriends} mutual`}
            </p>
          </div>
        </div>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-deep-600">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000"
               style={{ width: `${Math.max(profile.progressPct > 0 ? 2 : 0, profile.progressPct)}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-400">
          <span className="font-black text-emerald-400">{profile.progressPct.toFixed(1)}%</span> to zero
          {profile.eliminated !== null
            ? <> · {money(profile.eliminated)} eliminated</>
            : <> · amounts private</>}
        </p>

        <div className="mt-6 grid grid-cols-4 gap-3 border-t border-white/10 pt-5">
          <Stat label="Badges" value={`${profile.badges}/${MILESTONE_TOTAL}`} accent="text-emerald-400" />
          <Stat label="Streak" value={profile.streakMonths > 0 ? `🔥 ${profile.streakMonths}` : '—'} />
          <Stat label="Clubs" value={profile.clubCount} />
          <Stat label="Friends" value={profile.friendCount} />
        </div>

        {!profile.isSelf && friendAction && (
          <button
            onClick={() => act(friendAction.run)}
            disabled={busy}
            className={`mt-6 w-full rounded-full py-3.5 text-sm font-bold transition disabled:opacity-50 ${
              friendAction.quiet
                ? 'border border-white/15 text-slate-300 hover:bg-white/5'
                : 'bg-lime text-deep hover:bg-[#D9FF7A]'
            }`}
          >
            {busy ? '…' : friendAction.label}
          </button>
        )}
        {profile.isSelf && (
          <Link to="/profile" className="mt-6 block w-full rounded-full border border-white/15 py-3.5 text-center text-sm font-bold text-slate-300 transition hover:bg-white/5">
            Edit your profile
          </Link>
        )}
      </div>

      {/* Public clubs only — listing someone's private clubs would publish a
          private group's roster to anyone who looked them up. */}
      {clubs.length > 0 && (
        <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Clubs</p>
          <div className="mt-3 space-y-2">
            {clubs.map((c) => (
              <Link key={c.id} to={`/clubs/${c.id}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {categoryLabel(c.category) ?? 'Public'} · {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                  </p>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default Member
