import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useZero } from '../context/ZeroContext.jsx'
import { money, monthLabel, monthlyPaceNeeded, paidInMonth, distanceToNext, earnedMilestones } from '../lib/zero.js'
import LogPaymentSheet from './LogPaymentSheet.jsx'

// One screen, one idea: this number is going to zero.

const Figure = ({ label, value, accent }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-black tracking-tight sm:text-xl ${accent || 'text-white'}`}>{value}</p>
  </div>
)

const ZeroDashboard = () => {
  const {
    currentDebt, startingDebt, goalDate, payments,
    eliminated, progressPct, streakMonths,
  } = useZero()

  const [logging, setLogging] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // The nav's centre button routes here with ?log=1
  useEffect(() => {
    if (searchParams.get('log') !== '1') return
    setSearchParams({}, { replace: true })
    setLogging(true)
  }, [searchParams, setSearchParams])

  const pace = monthlyPaceNeeded(currentDebt, goalDate)
  const thisMonth = paidInMonth(payments)
  const next = distanceToNext(startingDebt, currentDebt)
  const badges = earnedMilestones(startingDebt, currentDebt)
  const done = currentDebt <= 0

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      {logging && <LogPaymentSheet onClose={() => setLogging(false)} />}

      {/* The number */}
      <div className="overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl sm:p-9">
        {done ? (
          <div className="py-6 text-center">
            <p className="text-[7rem] font-black leading-none tracking-tighter sm:text-[9rem]">0</p>
            <p className="mt-2 text-xl font-black uppercase tracking-[0.2em] text-emerald-400">Debt free</p>
            <p className="mt-3 text-sm text-slate-400">You eliminated {money(startingDebt)}. Welcome to the club.</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Current debt</p>
            <p className="mt-1.5 text-5xl font-black leading-none tracking-tighter sm:text-6xl">{money(currentDebt)}</p>

            {/* Toward zero, left to right, with the destination named */}
            <div className="mt-7">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-out"
                  style={{ width: `${Math.max(progressPct > 0 ? 2 : 0, progressPct)}%` }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between text-[11px] font-semibold">
                <span className="text-slate-500">{money(startingDebt)}</span>
                <span className="text-emerald-400">{progressPct.toFixed(1)}% eliminated</span>
                <span className="text-white">$0</span>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
              <Figure label="Eliminated" value={money(eliminated)} accent="text-emerald-400" />
              <Figure label="This month" value={money(thisMonth)} />
              <Figure label="Goal" value={monthLabel(goalDate) ?? '—'} />
            </div>
          </>
        )}

        <button
          onClick={() => setLogging(true)}
          className="mt-7 w-full rounded-full bg-white py-4 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-slate-200"
        >
          + Log payment
        </button>
      </div>

      {/* What's next, and what pace holds the goal */}
      {!done && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Next badge</p>
            {next ? (
              <>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{next.milestone.emoji} {next.milestone.label}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{money(next.amount)} to go</p>
              </>
            ) : <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">All earned</p>}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Pace to goal</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{pace ? `${money(pace)}/mo` : '—'}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {streakMonths > 0 ? `🔥 ${streakMonths} month streak` : 'Log to start a streak'}
            </p>
          </div>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Earned</p>
            <Link to="/profile" className="text-xs font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 dark:text-white dark:decoration-slate-600">
              Profile
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nobody does this alone — the club prompt is part of the core loop */}
      <Link
        to="/clubs"
        className="mt-3 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800"
      >
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Get to zero with your people</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Start a club or join one with a code</p>
        </div>
        <span className="text-lg text-slate-400">→</span>
      </Link>
    </section>
  )
}

export default ZeroDashboard
