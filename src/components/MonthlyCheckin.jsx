import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())

const VariancePill = ({ planned, actual }) => {
  if (!actual || actual === '') return null
  const diff = Number(planned) - Number(actual)
  if (Math.abs(diff) < 1) return <span className="text-xs text-slate-400">On track</span>
  if (diff > 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      ↓ ${diff.toLocaleString()} ahead
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
      ↑ ${Math.abs(diff).toLocaleString()} behind
    </span>
  )
}

const YesNoButton = ({ selected, onSelect, yes }) => (
  <button
    type="button"
    onClick={() => onSelect(yes ? true : false)}
    className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition ${
      selected
        ? yes
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }`}
  >
    {yes ? 'Yes' : 'No'}
  </button>
)

const CheckinHistory = ({ history }) => {
  if (!history?.length) return null
  return (
    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Past check-ins</p>
      <div className="space-y-2">
        {history.map((entry) => {
          const total = entry.debt_balances?.reduce((s, d) => s + d.actualBalance, 0) ?? 0
          const planned = entry.debt_balances?.reduce((s, d) => s + d.startingBalance, 0) ?? 0
          const diff = planned - total
          return (
            <div key={entry.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-slate-600 dark:text-slate-400">{entry.logged_month}</span>
              <div className="text-right">
                <span className={`font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {diff >= 0 ? '+' : '-'}${Math.abs(diff).toLocaleString()} vs plan
                </span>
                {entry.win && (
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 max-w-[200px] text-right truncate" title={entry.win}>
                    Win: {entry.win}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MonthlyCheckin = ({ debts }) => {
  const { user } = useAuth()
  const [actuals, setActuals] = useState({})
  const [madePlanPayment, setMadePlanPayment] = useState(null)
  const [onTrack, setOnTrack] = useState(null)
  const [win, setWin] = useState('')
  const [challenge, setChallenge] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [history, setHistory] = useState([])
  const [alreadyLoggedThisMonth, setAlreadyLoggedThisMonth] = useState(false)
  const [step, setStep] = useState(0)

  const supabaseReady = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY && supabase
  )

  useEffect(() => {
    const initial = {}
    debts.forEach((d) => { initial[d.id] = d.balance })
    setActuals(initial)
  }, [debts])

  useEffect(() => {
    if (!user || !supabaseReady) return
    supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (!data) return
        setHistory(data)
        if (data[0]?.logged_month === currentMonth) setAlreadyLoggedThisMonth(true)
      })
  }, [user, supabaseReady, submitted])

  const setActual = (id, val) => setActuals((prev) => ({ ...prev, [id]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const debtBalances = debts.map((d) => ({
      id: d.id,
      name: d.name || 'Unnamed',
      startingBalance: Number(d.balance),
      actualBalance: Number(actuals[d.id] ?? d.balance),
      rate: d.rate,
    }))

    if (supabaseReady && user) {
      await supabase.from('progress_logs').insert([{
        user_id: user.id,
        logged_month: currentMonth,
        debt_balances: debtBalances,
        notes: challenge.trim() || null,
        win: win.trim() || null,
        made_payment: madePlanPayment,
        on_track: onTrack,
      }])
    }

    localStorage.setItem('zc_checked_in', '1')
    setSubmitted(true)
    setLoading(false)
  }

  const totalActual = debts.reduce((sum, d) => sum + Number(actuals[d.id] ?? d.balance), 0)
  const totalPlanned = debts.reduce((sum, d) => sum + Number(d.balance), 0)
  const totalDiff = totalPlanned - totalActual

  if (alreadyLoggedThisMonth && !submitted) {
    const latest = history[0]
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
              {currentMonth} — checked in
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Miles has your latest progress</p>
          </div>
          <button
            onClick={() => setAlreadyLoggedThisMonth(false)}
            className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
          >
            Update
          </button>
        </div>
        {latest?.win && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm italic text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Win: "{latest.win}"
          </p>
        )}
        {latest?.notes && (
          <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Challenge: "{latest.notes}"
          </p>
        )}
        <CheckinHistory history={history.slice(1)} />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm sm:p-8 dark:border-emerald-800 dark:bg-emerald-950/20">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{currentMonth} logged</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {totalDiff > 0
            ? `You're $${totalDiff.toLocaleString()} ahead of plan.`
            : totalDiff < 0
              ? `You're $${Math.abs(totalDiff).toLocaleString()} behind. Miles knows — ask for help.`
              : 'Right on track.'}
        </p>
        {win && (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">Win: "{win}"</p>
        )}
        <CheckinHistory history={history} />
      </div>
    )
  }

  const steps = [
    // Step 0: Accountability questions
    <div key="q">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">Monthly Check-In</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{currentMonth}</p>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Did you make your planned payment?</p>
          <div className="mt-2 flex gap-2">
            <YesNoButton yes selected={madePlanPayment === true} onSelect={() => setMadePlanPayment(true)} />
            <YesNoButton yes={false} selected={madePlanPayment === false} onSelect={() => setMadePlanPayment(false)} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Did you stay on track overall?</p>
          <div className="mt-2 flex gap-2">
            <YesNoButton yes selected={onTrack === true} onSelect={() => setOnTrack(true)} />
            <YesNoButton yes={false} selected={onTrack === false} onSelect={() => setOnTrack(false)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            What was your biggest win?
            <textarea
              rows={2}
              value={win}
              onChange={(e) => setWin(e.target.value)}
              placeholder="e.g. Paid an extra $300, cancelled two subscriptions"
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            What challenged you?
            <textarea
              rows={2}
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="e.g. Unexpected car repair, harder to stick to budget"
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setStep(1)}
        disabled={madePlanPayment === null || onTrack === null}
        className="mt-5 w-full rounded-full bg-yellow-400 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-40"
      >
        Next — update balances →
      </button>
    </div>,

    // Step 1: Balance updates
    <div key="balances">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setStep(0)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </button>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">Update your balances</p>
      </div>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Enter your actual balances today</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {debts.map((debt) => (
          <div key={debt.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-200">{debt.name || 'Unnamed'}</p>
              <p className="text-xs text-slate-400">Plan: ${Number(debt.balance).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <VariancePill planned={debt.balance} actual={actuals[debt.id]} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  value={actuals[debt.id] ?? ''}
                  onChange={(e) => setActual(debt.id, e.target.value)}
                  placeholder={String(debt.balance)}
                  className="w-32 rounded-xl border border-slate-200 bg-white py-2 pl-6 pr-3 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-yellow-400 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? 'Saving…' : `Save ${currentMonth} check-in`}
        </button>
      </form>

      <CheckinHistory history={history} />
    </div>,
  ]

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      {steps[step]}
    </div>
  )
}

export default MonthlyCheckin
