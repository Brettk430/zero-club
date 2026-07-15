import { useMemo, useState } from 'react'
import { useDebt } from '../context/DebtContext.jsx'
import { track } from '../lib/analytics.js'
import { keptStreak } from '../lib/streaks.js'

const STORAGE_KEY = 'zc_commitments'

const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())

const loadCommitments = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

const saveCommitments = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const examples = [
  'Pay $___/month toward debt',
  'Make an extra $___/month payment',
  'No restaurant spending over $___/month',
  'Cancel ___ subscription this month',
  'Sell unused items to make an extra payment',
]

const CheckInModal = ({ commitment, onSave, onClose }) => {
  const [kept, setKept] = useState(null)
  const [note, setNote] = useState('')

  const handleSave = () => {
    if (kept === null) return
    onSave({ kept, note: note.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{currentMonth}</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Check in on your commitment</h2>
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          "{commitment.text}"
        </p>

        <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-300">Did you keep this commitment?</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setKept(true)}
            className={`rounded-2xl border py-3 text-sm font-semibold transition ${kept === true ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
          >
            Yes, I kept it
          </button>
          <button
            type="button"
            onClick={() => setKept(false)}
            className={`rounded-2xl border py-3 text-sm font-semibold transition ${kept === false ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
          >
            Not this month
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-600 dark:text-slate-400">
          Note (optional)
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened? What will you do differently?"
            className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </label>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={kept === null}
            className="flex-[2] rounded-full bg-yellow-400 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-40"
          >
            Save check-in
          </button>
        </div>
      </div>
    </div>
  )
}

const CommitmentCard = ({ commitment, onCheckIn, onDelete }) => {
  const thisMonthEntry = commitment.checkIns?.find((c) => c.month === currentMonth)
  const streak = useMemo(() => keptStreak(commitment.checkIns), [commitment.checkIns])

  const keptCount = commitment.checkIns?.filter((c) => c.kept).length || 0
  const total = commitment.checkIns?.length || 0

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{commitment.text}</p>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-400 dark:text-slate-600"
          aria-label="Delete"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-950/30">
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{streak}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400">month streak</span>
          </div>
        )}
        {total > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{keptCount}/{total} kept</span>
        )}
      </div>

      {/* Check-in history dots */}
      {commitment.checkIns?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {commitment.checkIns.slice(-12).map((c, i) => (
            <div
              key={i}
              title={`${c.month}: ${c.kept ? 'Kept' : 'Missed'}${c.note ? ` — ${c.note}` : ''}`}
              className={`h-3 w-3 rounded-full ${c.kept ? 'bg-emerald-400' : 'bg-rose-400'}`}
            />
          ))}
        </div>
      )}

      <div className="mt-5">
        {thisMonthEntry ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${thisMonthEntry.kept ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'}`}>
            <span className="font-semibold">{currentMonth}:</span> {thisMonthEntry.kept ? 'Kept' : 'Missed'}
            {thisMonthEntry.note && <span className="block mt-1 text-xs opacity-80">"{thisMonthEntry.note}"</span>}
          </div>
        ) : (
          <button
            type="button"
            onClick={onCheckIn}
            className="w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Check in for {currentMonth}
          </button>
        )}
      </div>
    </div>
  )
}

const Commitments = () => {
  const { plan } = useDebt()
  const [commitments, setCommitments] = useState(loadCommitments)
  const [draft, setDraft] = useState('')
  const [checkingIn, setCheckingIn] = useState(null)
  const [showExamples, setShowExamples] = useState(false)

  const addCommitment = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    if (commitments.length === 0) track('first_commitment_made')
    const updated = [...commitments, { id: crypto.randomUUID(), text: draft.trim(), createdAt: new Date().toISOString(), checkIns: [] }]
    setCommitments(updated)
    saveCommitments(updated)
    setDraft('')
  }

  const saveCheckIn = (id, entry) => {
    const updated = commitments.map((c) => {
      if (c.id !== id) return c
      const existing = c.checkIns.filter((ci) => ci.month !== currentMonth)
      return { ...c, checkIns: [...existing, { month: currentMonth, ...entry }] }
    })
    setCommitments(updated)
    saveCommitments(updated)
    localStorage.setItem('zc_checked_in', '1')
    setCheckingIn(null)
  }

  const deleteCommitment = (id) => {
    const updated = commitments.filter((c) => c.id !== id)
    setCommitments(updated)
    saveCommitments(updated)
  }

  const totalStreak = useMemo(() => {
    if (!commitments.length) return 0
    return Math.min(...commitments.map((c) => keptStreak(c.checkIns)))
  }, [commitments])

  const checkinTarget = checkingIn ? commitments.find((c) => c.id === checkingIn) : null

  return (
    <>
      {checkinTarget && (
        <CheckInModal
          commitment={checkinTarget}
          onSave={(entry) => saveCheckIn(checkingIn, entry)}
          onClose={() => setCheckingIn(null)}
        />
      )}

      <section className="mx-auto max-w-4xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">

        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Commitments</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">What will you do this month?</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                A commitment is a specific pledge — not a goal, a promise. Write it down, check in monthly, build the streak.
              </p>
            </div>
            {totalStreak > 0 && (
              <div className="w-fit rounded-2xl bg-amber-50 px-5 py-3 text-center dark:bg-amber-950/30">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalStreak}</p>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">month streak</p>
              </div>
            )}
          </div>

          {/* Add form */}
          <form onSubmit={addCommitment} className="mt-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. Pay $1,500/month toward my credit card"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </form>

          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="mt-3 text-xs text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {showExamples ? 'Hide examples' : 'Show examples'}
          </button>

          {showExamples && (
            <ul className="mt-3 space-y-2">
              {examples.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => setDraft(ex)}
                    className="text-left text-sm text-blue-600 transition hover:underline dark:text-blue-400"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suggested from plan */}
        {plan.monthlyPayment > 0 && commitments.length === 0 && (
          <div className="mt-4 rounded-3xl border border-dashed border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Suggested from your plan</p>
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-500">Your avalanche plan targets ${plan.monthlyPayment.toLocaleString()}/month.</p>
            <button
              type="button"
              onClick={() => setDraft(`Pay $${plan.monthlyPayment.toLocaleString()}/month toward debt`)}
              className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Use this as my commitment
            </button>
          </div>
        )}

        {/* Commitments list */}
        {commitments.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-amber-600 dark:text-amber-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Make your first commitment</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                A commitment is a specific promise — not a vague goal. The more specific it is, the easier it is to keep.
              </p>
              <div className="mt-4 space-y-2 text-left rounded-2xl bg-white p-4 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Examples</p>
                {['Pay $1,500/month toward my Visa', 'No restaurant spending over $150', 'Make one extra payment this month', 'Cancel two subscriptions this week'].map((ex) => (
                  <button key={ex} type="button" onClick={() => setDraft(ex)} className="block w-full rounded-xl bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {commitments.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                onCheckIn={() => setCheckingIn(c.id)}
                onDelete={() => deleteCommitment(c.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default Commitments
