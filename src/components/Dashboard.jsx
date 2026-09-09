import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { paymentStreakWeeks, todaysMotivation } from '../lib/payments.js'
import { getNewlyUnlocked } from '../lib/milestones.js'
import { postMilestone } from '../lib/feed.js'
import LogPayment from './LogPayment.jsx'
import Celebration from './Celebration.jsx'
import SafetyNet from './SafetyNet.jsx'
import WelcomeTour from './WelcomeTour.jsx'
import { hasSeenTour } from '../lib/localData.js'

// Member home screen — every element answers one question:
// "Am I closer to debt-free than yesterday?"
// Design language: black/white/gray, green reserved for progress only.

const MILESTONE_LADDER = [500, 1000, 2500, 5000, 10000, 25000, 50000, 75000, 100000, 150000, 250000]

const Ring = ({ pct }) => {
  const r = 56
  const circ = 2 * Math.PI * r
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className="stroke-emerald-600 dark:stroke-emerald-500 transition-all duration-1000"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ - (Math.min(pct, 100) / 100) * circ}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{Math.round(pct)}%</p>
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">paid off</p>
      </div>
    </div>
  )
}

const Stat = ({ label, value, sub, green }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5 dark:bg-slate-900 dark:ring-slate-800">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
    <p className={`mt-1.5 text-xl font-bold tracking-tight sm:text-2xl ${green ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
      {value}
    </p>
    {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
  </div>
)

const Dashboard = () => {
  const { debts, plan, payments } = useDebt()
  const { user } = useAuth()
  const [logging, setLogging] = useState(false)
  const [showSafetyNet, setShowSafetyNet] = useState(false)
  // Tour disabled by default — reduced cognitive load on first login
  const [touring, setTouring] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // The nav's centre button routes here with ?log=1 to open the payment sheet
  useEffect(() => {
    if (searchParams.get('log') !== '1') return
    setSearchParams({}, { replace: true })
    setLogging(true)
  }, [searchParams, setSearchParams])
  const [celebration, setCelebration] = useState(null)

  const totalStarting = useMemo(() =>
    debts.reduce((sum, d) => sum + (Number(d.startingBalance) || Number(d.balance) || 0), 0), [debts])
  const totalCurrent = useMemo(() =>
    debts.reduce((sum, d) => sum + Number(d.balance || 0), 0), [debts])
  const paidOff = Math.max(0, totalStarting - totalCurrent)
  const pct = totalStarting > 0 ? (paidOff / totalStarting) * 100 : 0

  const nextMilestone = MILESTONE_LADDER.find((m) => m > paidOff && m <= totalStarting) || totalStarting
  const streak = paymentStreakWeeks(payments)

  const daysUntilFree = useMemo(() => {
    if (!plan.monthsUntilPayoff) return null
    const target = new Date()
    target.setMonth(target.getMonth() + plan.monthsUntilPayoff)
    return Math.max(0, Math.round((target - new Date()) / 86400000))
  }, [plan.monthsUntilPayoff])

  // Momentum beats totals: what moved since the 1st is the number that says
  // whether this month is going anywhere.
  const paidThisMonth = useMemo(() => {
    const now = new Date()
    return payments.reduce((sum, p) => {
      const d = new Date(p.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        ? sum + (Number(p.amount) || 0)
        : sum
    }, 0)
  }, [payments])

  const recent = payments.slice(-3).reverse()

  // Check after debts commit (not in the log handler — that closure sees the
  // pre-payment state and would miss the milestone the payment just crossed).
  useEffect(() => {
    if (!debts.length) return
    const fresh = getNewlyUnlocked(debts)
    if (fresh.length) {
      setCelebration(fresh[0])
      fresh.forEach((m) => postMilestone(user, m)) // share the win with the feed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts])

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
      {touring && <WelcomeTour onClose={() => setTouring(false)} />}
      {celebration && <Celebration milestone={celebration} onDone={() => setCelebration(null)} />}
      {logging && <LogPayment onClose={() => setLogging(false)} />}

      {/* Hero card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-10 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <Ring pct={pct} />
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">You've paid off</p>
            <p className="mt-2 text-5xl font-bold tracking-tight text-emerald-600 sm:text-6xl dark:text-emerald-400">
              ${paidOff.toLocaleString()}
            </p>
            {nextMilestone > paidOff && (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ${Math.max(0, Math.round(nextMilestone - paidOff)).toLocaleString()} until your next milestone
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setLogging(true)}
          className="mt-8 w-full rounded-full bg-slate-900 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          + Log payment
        </button>
        <Link
          to="/progress"
          className="mt-3 flex w-full items-center justify-center rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          See your progress →
        </Link>

        <p className="mt-5 border-t border-slate-100 pt-4 text-center text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {todaysMotivation()}
        </p>
      </div>

      {/* Stats — the three numbers that answer "am I moving?" Balance lives in
          the debts card below and interest projections on the plan page. */}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Streak" value={streak > 0 ? `🔥 ${streak}w` : '—'} sub={streak > 0 ? 'Going' : 'Log to start'} green={streak > 0} />
        <Stat label="This month" value={`$${paidThisMonth.toLocaleString()}`} sub={paidThisMonth > 0 ? 'Paid off' : 'Nothing yet'} green={paidThisMonth > 0} />
        <Stat label="Debt-free" value={plan.payoffDate || '—'} sub={daysUntilFree != null ? `${daysUntilFree.toLocaleString()} days` : undefined} />
      </div>

      {/* What you actually owe, and the way in to change it */}
      <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Your debts</p>
          <Link to="/calculator" className="text-xs font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 dark:text-white dark:decoration-slate-600">
            Add or edit
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {debts.map((d) => {
            const start = Number(d.startingBalance) || Number(d.balance) || 0
            const paid = Math.max(0, start - Number(d.balance || 0))
            const pctDone = start > 0 ? Math.min(100, (paid / start) * 100) : 0
            const cleared = Number(d.balance) <= 0
            return (
              <li key={d.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`truncate text-sm font-medium ${cleared ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {d.name || 'Unnamed debt'}
                  </p>
                  <p className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
                    ${Number(d.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pctDone}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                    {d.rate}% · {cleared ? 'cleared 🎉' : `$${paid.toLocaleString()} paid`}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total owed</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">${totalCurrent.toLocaleString()}</p>
        </div>
        <Link to="/plan" className="mt-2 flex items-baseline justify-between text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <span>Paying ${plan.monthlyPayment.toLocaleString()}/mo</span>
          <span className="font-semibold underline decoration-slate-300 underline-offset-4 dark:decoration-slate-600">View plan →</span>
        </Link>
      </div>

      {/* Safety net — real, but not everyone's next move. Folded away so the
          dashboard stays about the one loop: pay, watch it drop. */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowSafetyNet((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-slate-100 transition hover:ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Safety net</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{showSafetyNet ? 'Hide' : 'Show'}</span>
        </button>
        {showSafetyNet && (
          <div className="mt-3">
            <SafetyNet />
          </div>
        )}
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Recent payments</p>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.debtName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">−${Number(p.amount).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default Dashboard
