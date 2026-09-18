import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchAdminOverview, fetchAdminMembers, fetchAdminActivity, fetchAdminReports, resolveReport } from '../lib/members.js'
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

const REASON = {
  harassment: 'Harassment', hate: 'Hate speech', sexual: 'Sexual content',
  'self-harm': 'Self-harm or threats', spam: 'Spam or scam', other: 'Other',
}

// A post's snapshot is its type and payload as JSON; read it as a sentence.
const readable = (r) => {
  if (r.target_type !== 'post' || !r.snapshot) return r.snapshot
  const [type, ...rest] = r.snapshot.split(': ')
  try {
    const p = JSON.parse(rest.join(': '))
    return type === 'milestone' ? `Milestone post: ${p.label}` : `Payment post: ${p.amount ? money(p.amount) : 'amount hidden'}`
  } catch { return r.snapshot }
}

const hoursSince = (iso) => (Date.now() - new Date(iso).getTime()) / 3600000

// Apple expects reports acted on within 24 hours; the age is shown against that.
const ReportCard = ({ r, onResolve, busy }) => {
  const open = r.status === 'open'
  const hours = hoursSince(r.created_at)
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 dark:bg-slate-900 ${open ? 'ring-slate-100 dark:ring-slate-800' : 'opacity-60 ring-slate-100 dark:ring-slate-800'}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600 dark:bg-red-950/40 dark:text-red-400">{REASON[r.reason] ?? r.reason}</span>
        <span className="text-slate-400">{r.target_type}</span>
        {r.reports_on_target > 1 && <span className="text-amber-600 dark:text-amber-400">{r.reports_on_target} reports</span>}
        <span className={`ml-auto normal-case tracking-normal ${open && hours > 20 ? 'text-red-500' : 'text-slate-400'}`}>{ago(r.created_at)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
        {readable(r) || '(nothing captured)'}
      </p>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        By <span className="font-bold">{r.author_handle || 'deleted account'}</span> · reported by {r.reporter_handle || 'deleted account'}
        {!r.still_there && ' · already gone'}
      </p>
      {r.note && <p className="mt-1 text-[11px] italic text-slate-500 dark:text-slate-400">“{r.note}”</p>}
      {open ? (
        <div className="mt-3 flex gap-2">
          <button onClick={() => onResolve(r.id, 'remove')} disabled={busy}
            className="flex-1 rounded-full bg-red-600 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-40">
            {r.target_type === 'profile' ? 'Reset profile' : 'Remove'}
          </button>
          <button onClick={() => onResolve(r.id, 'dismiss')} disabled={busy}
            className="flex-1 rounded-full border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Dismiss
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-bold text-slate-400">{r.status === 'removed' ? 'Removed' : 'Dismissed'} {ago(r.resolved_at)}</p>
      )}
    </div>
  )
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth()
  const [overview, setOverview] = useState(null)
  const [members, setMembers] = useState([])
  const [activity, setActivity] = useState([])
  const [reports, setReports] = useState([])
  const [resolving, setResolving] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('members')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    Promise.all([fetchAdminOverview(), fetchAdminMembers(), fetchAdminActivity(), fetchAdminReports()])
      .then(([o, m, a, r]) => {
        setOverview(o); setMembers(m); setActivity(a); setReports(r)
        // Open reports are the one thing here with a deadline, so they come first.
        if (r.some((x) => x.status === 'open')) setTab('reports')
        setLoading(false)
      })
  }, [user])

  const onResolve = async (id, action) => {
    setResolving(id)
    await resolveReport(id, action)
    setReports(await fetchAdminReports())
    setResolving(null)
  }
  const openReports = reports.filter((r) => r.status === 'open').length

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
        {[['reports', openReports ? `Reports (${openReports})` : 'Reports'], ['members', `Members (${members.length})`], ['activity', 'Activity']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full py-2.5 transition ${tab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'reports' ? (
        <div className="mt-3 space-y-2">
          {reports.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
              No reports. When someone reports a post, comment, message, profile or club it lands here — act on it within 24 hours.
            </p>
          ) : (
            reports.map((r) => <ReportCard key={r.id} r={r} onResolve={onResolve} busy={resolving === r.id} />)
          )}
        </div>
      ) : tab === 'members' ? (
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
