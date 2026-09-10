import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import { myClubs, categoryLabel } from '../lib/clubs.js'
import { earnedMilestones, MILESTONES, money, monthLabel } from '../lib/zero.js'
import Avatar from '../components/Avatar.jsx'
import Friends from '../components/Friends.jsx'
import Referral from '../components/Referral.jsx'

// A view of the journey, not a control panel. Everything editable moved to
// /profile/edit — it was spread across four cards here, and two of the fields
// it should have offered were not reachable at all.

const Stat = ({ label, value, accent }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-black ${accent || 'text-white'}`}>{value}</p>
  </div>
)

const Profile = () => {
  const { user } = useAuth()
  const {
    startingDebt, currentDebt, goalDate, eliminated, progressPct,
    streakMonths, handle, displayName, avatarUrl, showAmounts,
  } = useZero()
  const [clubs, setClubs] = useState([])

  useEffect(() => {
    if (!user) return
    myClubs(user.id).then((r) => setClubs(r.clubs))
  }, [user])

  const earned = earnedMilestones(startingDebt, currentDebt)

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      <div className="rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar url={avatarUrl} name={handle} size={64} />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black leading-tight tracking-tight">{displayName || handle}</h1>
              {displayName && <p className="mt-0.5 text-xs text-slate-500">{handle}</p>}
            </div>
          </div>
          <Link
            to="/profile/edit"
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/5"
          >
            Edit
          </Link>
        </div>

        <div className="mt-7 flex items-baseline gap-3">
          <span className="text-2xl font-black tracking-tight text-white">{money(currentDebt)}</span>
          <span className="text-slate-600">→</span>
          <span className="text-2xl font-black tracking-tight text-slate-500">$0</span>
        </div>
        {eliminated > 0 && (
          <p className="mt-1.5 text-sm text-slate-400">
            Started at {money(startingDebt)} — <span className="font-bold text-emerald-400">{money(eliminated)} gone</span>
          </p>
        )}

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-deep-600">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000"
               style={{ width: `${Math.max(progressPct > 0 ? 2 : 0, progressPct)}%` }} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-y-5 border-t border-white/10 pt-5 sm:grid-cols-4">
          <Stat label="Complete" value={`${progressPct.toFixed(1)}%`} accent="text-emerald-400" />
          <Stat label="Badges" value={`${earned.length}/${MILESTONES.length}`} />
          <Stat label="Streak" value={streakMonths > 0 ? `🔥 ${streakMonths}mo` : '—'} />
          <Stat label="Goal" value={monthLabel(goalDate) ?? '—'} />
        </div>

        {!showAmounts && (
          <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">
            Your amounts are hidden from clubs — they see your percentage and badges only.
          </p>
        )}
      </div>

      {/* A taste of the collection; the ladder itself has its own page. */}
      <Link
        to="/milestones"
        className="mt-3 flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Badges</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
            {earned.length > 0 ? earned.slice(-4).map((m) => m.emoji).join(' ') : 'None yet'}
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{earned.length} of {MILESTONES.length}</span>
          </p>
        </div>
        <span className="text-lg text-slate-400">→</span>
      </Link>

      {clubs.length > 0 && (
        <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Clubs</p>
          <div className="mt-3 space-y-2">
            {clubs.map((c) => (
              <Link key={c.id} to={`/clubs/${c.id}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.is_public ? (categoryLabel(c.category) ?? 'Public') : 'Private'}
                  </p>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3"><Friends /></div>
      <div className="mt-3"><Referral /></div>
    </section>
  )
}

export default Profile
