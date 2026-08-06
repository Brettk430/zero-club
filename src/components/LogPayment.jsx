import { useMemo, useState } from 'react'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { postPayment } from '../lib/feed.js'

// The Strava "record activity" moment. Logging a payment should feel like a
// win, not a chore: pre-filled amounts, one tap, instant celebration.

const LogPayment = ({ onClose }) => {
  const { debts, plan, logPayment } = useDebt()
  const { user } = useAuth()
  const active = useMemo(() => debts.filter((d) => Number(d.balance) > 0), [debts])
  const target = plan.monthlyAllocation?.find((a) => a.isTarget)
  const [debtId, setDebtId] = useState(target?.id ?? active[0]?.id)
  const [amount, setAmount] = useState(() => String(target?.total || active[0]?.minPayment || ''))
  const [done, setDone] = useState(null)

  const selected = active.find((d) => d.id === debtId)
  const planned = plan.monthlyAllocation?.find((a) => a.id === debtId)

  const handleLog = (e) => {
    e.preventDefault()
    const payment = logPayment(debtId, amount)
    if (payment) {
      setDone(payment)
      postPayment(user, payment) // fire-and-forget: the feed celebrates with you
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center dark:bg-slate-950/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl sm:p-8 dark:bg-slate-900">
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/40">
              🎉
            </div>
            <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-slate-100">
              ${Number(done.amount).toLocaleString()} down.
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Logged against {done.debtName}. Every payment is a step out.
            </p>
            <button
              onClick={onClose}
              className="mt-7 w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Keep going →
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Log a payment</p>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <form onSubmit={handleLog} className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Which debt?</p>
                <div className="space-y-2">
                  {active.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setDebtId(d.id); const p = plan.monthlyAllocation?.find((a) => a.id === d.id); if (p) setAmount(String(p.total)) }}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        debtId === d.id
                          ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">{d.name || 'Unnamed'}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">${Number(d.balance).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Amount</p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                {planned && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Your plan calls for ${planned.total.toLocaleString()} here this month.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!selected || !Number(amount)}
                className="w-full rounded-full bg-slate-900 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Log payment
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default LogPayment
