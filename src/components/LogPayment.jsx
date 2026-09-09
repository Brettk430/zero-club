import { useMemo, useState } from 'react'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { postPayment } from '../lib/feed.js'
import AuthModal from './AuthModal.jsx'

// The Strava "record activity" moment. Logging a payment should feel like a
// win, not a chore: pre-filled amounts, one tap, instant celebration.

const money = (n) => `$${Number(n || 0).toLocaleString()}`

const LogPayment = ({ onClose }) => {
  const { debts, plan, logPayment } = useDebt()
  const { user } = useAuth()
  const active = useMemo(() => debts.filter((d) => Number(d.balance) > 0), [debts])
  const target = plan.monthlyAllocation?.find((a) => a.isTarget)
  const [debtId, setDebtId] = useState(target?.id ?? active[0]?.id)
  const [amount, setAmount] = useState(() => String(target?.total || active[0]?.minPayment || ''))
  const [done, setDone] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const selected = active.find((d) => d.id === debtId)
  const planned = plan.monthlyAllocation?.find((a) => a.id === debtId)

  // The amounts someone actually reaches for, in the order they'd think of them
  const quickAmounts = useMemo(() => {
    if (!selected) return []
    const options = [
      planned?.total && { label: 'Planned', value: Math.round(planned.total) },
      selected.minPayment && { label: 'Minimum', value: Math.round(selected.minPayment) },
      selected.balance > 0 && { label: 'Pay it off', value: Math.round(selected.balance) },
    ].filter(Boolean)
    // Two chips showing the same number is just noise
    const seen = new Set()
    return options.filter((o) => !seen.has(o.value) && seen.add(o.value))
  }, [selected, planned])

  const selectDebt = (id) => {
    setDebtId(id)
    const p = plan.monthlyAllocation?.find((a) => a.id === id)
    const d = active.find((x) => x.id === id)
    setAmount(String(Math.round(p?.total || d?.minPayment || 0) || ''))
  }

  const handleLog = (e) => {
    e.preventDefault()
    if (!user) {
      setShowAuthModal(true)
      return
    }
    const payment = logPayment(debtId, amount)
    if (payment) {
      setDone(payment)
      postPayment(user, payment) // fire-and-forget: the feed celebrates with you
    }
  }

  if (showAuthModal) {
    return <AuthModal onClose={() => setShowAuthModal(false)} />
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center dark:bg-slate-950/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Capped to the viewport so a long debt list scrolls inside the sheet
          instead of running off the bottom of the screen. */}
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-h-[85vh] sm:rounded-3xl dark:bg-slate-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {done ? (
          <div className="px-6 py-8 text-center sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/40">
              🎉
            </div>
            <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {money(done.amount)} down.
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
            <div className="flex items-center justify-between px-6 pt-6 sm:px-8">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Log a payment</p>
              <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            {active.length === 0 ? (
              <div className="px-6 pb-8 pt-4 text-center sm:px-8">
                <p className="text-2xl">🏁</p>
                <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">Nothing left to pay.</p>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Every debt on your plan is cleared. Add another if there's more to tackle.
                </p>
                <button onClick={onClose} className="mt-6 w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleLog} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-5 sm:px-8">
                  {/* One debt needs no chooser — just say what's being paid */}
                  {active.length === 1 ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Paying</p>
                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{selected?.name || 'Your debt'}</span>
                        <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{money(selected?.balance)} left</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Which debt?</p>
                      <div className="space-y-2">
                        {active.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => selectDebt(d.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                              debtId === d.id
                                ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                            }`}
                          >
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{d.name || 'Unnamed'}</span>
                            <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{money(d.balance)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Amount</p>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    {quickAmounts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {quickAmounts.map((q) => (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => setAmount(String(q.value))}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                              Number(amount) === q.value
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                          >
                            {q.label} · {money(q.value)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pinned so the action is reachable however long the list is */}
                <div className="border-t border-slate-100 px-6 py-4 sm:px-8 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={!selected || !Number(amount)}
                    className="w-full rounded-full bg-slate-900 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Log {Number(amount) > 0 ? money(Math.round(Number(amount))) : 'payment'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LogPayment
