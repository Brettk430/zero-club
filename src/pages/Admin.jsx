import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchAdminOverview, fetchAdminMembers, fetchAdminActivity } from '../lib/members.js'
import { money } from '../lib/zero.js'
import Avatar from '../components/Avatar.jsx'

const ago = (iso) => {
  if (!iso) return 'never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`
}

const Metric = ({ label, value, sub }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>}
  </div>
)

const KIND = {
  payment: { dot: 'bg-emerald-500', label: 'paid' },
  joined:  { dot: 'bg-lime',        label: 'joined' },
  club:    { dot: 'bg-slate-400',   label: 'club' },
  message: { dot: 'bg-slate-500',   label: 'chat' },
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth()
  const [overview, setOverview] = useState(null)
  const [members, setMembers] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('members')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    Promise.all([fetchAdminOverview(), fetchAdminMembers(), fetchAdminActivity()])
      .then(([o, m, a]) => { setOverview(o); setMembers(m); setActivity(a); setLoading(false) })
  }, [user])

  if (authLoading || loading) {
    return <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6"><div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" /></section>
  }

  // The database returned nothing, which is what it does for everyone who is
  // not an admin. No point dressing that up.
  if (!overview) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Not available</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This page is for administrators.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-emerald-600 underline underline-offset-4 dark:text-emerald-400">Back to Zero</Link>
      </section>
    )
  }

  const withPlan = Number(overview.members_with_plan) || 0
  const total = Number(overview.members) || 0

  return (
    <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Admin</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything happening in Zero Club.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Members" value={total} sub={`${withPlan} with a number set`} />
        <Metric label="Active 7d" value={overview.active_7d} sub="logged a payment" />
        <Metric label="Eliminated" value={money(overview.eliminated_total)} sub={`${money(overview.eliminated_30d)} in 30d`} />
        <Metric label="Payments" value={overview.payments} />
        <Metric label="Clubs" value={overview.clubs} sub={`${overview.public_clubs} public`} />
        <Metric label="Posts" value={overview.posts} />
        <Metric label="Messages" value={overview.messages} />
        <Metric label="Friendships" value={overview.friendships} />
      </div>

      <div className="mt-6 flex rounded-full border border-slate-200 bg-white p-0.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900">
        {[['members', `Members (${members.length})`], ['activity', 'Activity']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full py-2.5 transition ${tab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'members' ? (
        <div className="mt-3 space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
              <Avatar url={m.avatar_url} name={m.handle} size={36} />
              <div className="min-w-0 flex-1">
                <Link to={`/u/${encodeURIComponent(m.handle)}`} className="block truncate text-sm font-bold text-slate-900 hover:underline underline-offset-4 dark:text-white">
                  {m.display_name || m.handle}
                </Link>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {Number(m.starting_debt) > 0
                    ? <>{money(m.current_debt)} left · {money(m.eliminated)} gone · {Number(m.progress_pct).toFixed(1)}%</>
                    : <span className="text-amber-600 dark:text-amber-400">no number set</span>}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {m.payments} payment{Number(m.payments) === 1 ? '' : 's'} · last {ago(m.last_payment)} · {m.clubs} club{Number(m.clubs) === 1 ? '' : 's'} · {m.friends} friend{Number(m.friends) === 1 ? '' : 's'}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{ago(m.joined)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nothing yet.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND[a.kind]?.dot ?? 'bg-slate-400'}`} />
                  <p className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">{a.handle}</span> {a.detail}
                  </p>
                  <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{ago(a.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}

export default Admin
