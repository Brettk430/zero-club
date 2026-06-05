import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useDebt } from '../context/DebtContext.jsx'
import { computeAchievements } from '../lib/milestones.js'

const memberStatus = (pct) => {
  if (pct >= 100) return { label: 'Zero Club Member', color: 'bg-yellow-400 text-slate-900', dot: 'bg-yellow-400' }
  if (pct >= 50)  return { label: 'Final Stretch',    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300', dot: 'bg-violet-500' }
  if (pct >= 25)  return { label: 'In Progress',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', dot: 'bg-blue-500' }
  return            { label: 'Road to Zero',          color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' }
}

const ChecklistItem = ({ done, label, href, cta }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-blue-600' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
      {done && (
        <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3 text-white">
          <path d="M10.28 2.28L4 8.56 1.72 6.28A1 1 0 00.28 7.72l3 3a1 1 0 001.44 0l7-7a1 1 0 00-1.44-1.44z" />
        </svg>
      )}
    </div>
    <p className={`flex-1 text-sm font-medium ${done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
      {label}
    </p>
    {!done && href && (
      <Link to={href} className="shrink-0 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-yellow-300">
        {cta}
      </Link>
    )}
  </div>
)

const Profile = () => {
  const { user, isPro } = useAuth()
  const { debts, monthlyIncome, maxMonthlyPayment, plan } = useDebt()

  const username = localStorage.getItem('zc_username') || '—'
  const hasCheckin = Boolean(localStorage.getItem('zc_seen_achievements'))

  const totalStarting = useMemo(() =>
    debts.reduce((sum, d) => sum + (Number(d.startingBalance) || Number(d.balance) || 0), 0), [debts])
  const totalCurrent = useMemo(() =>
    debts.reduce((sum, d) => sum + Number(d.balance || 0), 0), [debts])
  const totalPaidOff = Math.max(0, totalStarting - totalCurrent)
  const pctPaidOff = totalStarting > 0 ? (totalPaidOff / totalStarting) * 100 : 0

  const status = memberStatus(pctPaidOff)
  const achievements = useMemo(() => computeAchievements(debts), [debts])
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const checklist = [
    { label: 'Create your account',        done: Boolean(user),                    href: null },
    { label: 'Enter your debts',           done: debts.length > 0,                 href: '/calculator', cta: 'Add debts' },
    { label: 'Set your monthly budget',    done: Boolean(monthlyIncome || maxMonthlyPayment), href: '/calculator', cta: 'Set budget' },
    { label: 'Make your first commitment',  done: Boolean(localStorage.getItem('zc_commitments') && JSON.parse(localStorage.getItem('zc_commitments') || '[]').length > 0), href: '/commitments', cta: 'Make one' },
    { label: 'Log your first check-in',    done: hasCheckin,                       href: '/plan', cta: 'Go to Journey' },
    { label: 'Ask Miles a question',       done: Boolean(localStorage.getItem('zc_asked_miles')), href: '/coach', cta: 'Talk to Miles' },
  ]

  const setupPct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1.4fr]">

        {/* Left — profile card */}
        <div className="flex flex-col gap-4 sm:gap-6">

          {/* Identity */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900 dark:text-slate-100">{user?.email}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Community: <span className="font-medium text-slate-600 dark:text-slate-300">{username}</span></p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.color}`}>
                {status.label}
              </span>
              {isPro && (
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Pro
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Progress to zero</span>
                <span className="font-semibold">{Math.round(pctPaidOff)}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-700 dark:bg-blue-500" style={{ width: `${pctPaidOff}%` }} />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">Started</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">${totalStarting.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">Current</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">${totalCurrent.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid off</p>
                <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">${totalPaidOff.toLocaleString()}</p>
              </div>
            </div>

            {plan.payoffDate && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs text-blue-600 dark:text-blue-400">Debt-free target</p>
                <p className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{plan.payoffDate}</p>
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Achievements</p>
              <span className="text-xs text-slate-400 dark:text-slate-500">{unlockedCount} / {achievements.length}</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  title={a.label}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl border p-2 text-center transition ${
                    a.unlocked
                      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30'
                      : 'border-slate-100 bg-slate-50 opacity-40 dark:border-slate-800 dark:bg-slate-800/30'
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${a.unlocked ? 'bg-yellow-400' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className={`h-3.5 w-3.5 ${a.unlocked ? 'text-slate-900' : 'text-slate-400'}`}>
                      <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377 49.78 49.78 0 00-6.093.377.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className={`mt-1.5 text-[9px] font-semibold leading-tight ${a.unlocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
                    {a.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — setup checklist */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Setup</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Get Zero Club ready</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Complete these steps to get the most out of your journey.</p>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{checklist.filter((c) => c.done).length} of {checklist.length} complete</span>
                <span className="font-semibold">{setupPct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${setupPct === 100 ? 'bg-yellow-400' : 'bg-blue-600'}`}
                  style={{ width: `${setupPct}%` }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {checklist.map((item) => (
                <ChecklistItem key={item.label} {...item} />
              ))}
            </div>

            {setupPct === 100 && (
              <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-center dark:border-yellow-800 dark:bg-yellow-950/30">
                <p className="font-bold text-amber-700 dark:text-amber-400">You're fully set up.</p>
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-500">Now just show up every month and watch the number shrink.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
