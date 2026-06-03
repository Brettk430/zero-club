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

const MonthlyCheckin = ({ debts }) => {
  const { user } = useAuth()
  const [actuals, setActuals] = useState({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [history, setHistory] = useState([])
  const [alreadyLoggedThisMonth, setAlreadyLoggedThisMonth] = useState(false)

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
        notes: notes.trim() || null,
      }])
    }

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
              {currentMonth} — logged ✓
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Miles has your latest progress</p>
          </div>
          <button
            onClick={() => setAlreadyLoggedThisMonth(false)}
            className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Update
          </button>
        </div>
        {latest?.notes && (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            "{latest.notes}"
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
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Progress logged for {currentMonth}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {totalDiff > 0
            ? `You're $${totalDiff.toLocaleString()} ahead of plan — Miles knows.`
            : totalDiff < 0
              ? `You're $${Math.abs(totalDiff).toLocaleString()} behind plan — Miles will help you recover.`
              : 'Right on track. Miles has your update.'}
        </p>
        <CheckinHistory history={history} />
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">Monthly check-in</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Log actual balances so Miles learns what's really happening
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {currentMonth}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {debts.map((debt) => (
          <div
            key={debt.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {debt.name || 'Unnamed'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Plan balance: ${Number(debt.balance).toLocaleString()}
              </p>
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
                  className="w-32 rounded-xl border border-slate-200 bg-white py-2 pl-6 pr-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/50">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Anything to note? <span className="font-normal normal-case">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Had a car repair, paid less toward Visa this month"
            className="mt-2 w-full resize-none rounded-xl border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-yellow-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? 'Saving…' : `Save ${currentMonth} progress`}
        </button>
      </form>

      <CheckinHistory history={history} />
    </div>
  )
}

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
                {entry.notes && (
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 max-w-[200px] text-right truncate" title={entry.notes}>
                    {entry.notes}
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

export default MonthlyCheckin
