import { useState } from 'react'
import { useDebt } from '../context/DebtContext.jsx'
import { STARTER_BUFFER, SUGGESTED_GOALS, goalProgress, bufferGoal, hasBuffer } from '../lib/savings.js'

// Savings goals, framed for a debt app: the starter buffer comes first because
// it's what stops the next flat tire from becoming next year's credit card
// balance. Everything else waits until the debt is gone.

const AddMoney = ({ goal, onClose }) => {
  const { contributeToGoal } = useDebt()
  const [amount, setAmount] = useState('50')

  const submit = (e) => {
    e.preventDefault()
    if (contributeToGoal(goal.id, amount)) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center dark:bg-slate-950/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl dark:bg-slate-900">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Add to {goal.name}</p>
        <form onSubmit={submit} className="mt-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">$</span>
            <input
              type="number" min="1" step="0.01" required autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="mt-3 flex gap-2">
            {[25, 50, 100].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))}
                className="flex-1 rounded-full bg-slate-50 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                ${v}
              </button>
            ))}
          </div>
          <button type="submit" className="mt-4 w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
            Add it
          </button>
          <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm text-slate-400">Cancel</button>
        </form>
      </div>
    </div>
  )
}

const SafetyNet = () => {
  const { goals, addGoal, removeGoal } = useDebt()
  const [adding, setAdding] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState({ name: '', target: '' })

  const buffer = bufferGoal(goals)
  const protectedNow = hasBuffer(goals)
  const others = goals.filter((g) => g.kind !== 'buffer')

  const startBuffer = () => {
    addGoal({ name: 'Starter emergency fund', target: STARTER_BUFFER, kind: 'buffer' })
  }

  const createCustom = (e) => {
    e.preventDefault()
    if (!draft.name.trim() || !Number(draft.target)) return
    addGoal({ name: draft.name.trim(), target: Number(draft.target) })
    setDraft({ name: '', target: '' })
    setShowNew(false)
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      {adding && <AddMoney goal={adding} onClose={() => setAdding(null)} />}

      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Safety net</p>
        {protectedNow && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            Protected
          </span>
        )}
      </div>

      {!buffer ? (
        <>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Most payoff plans don't fail on the math — they fail when a car repair lands and the only option is a credit card.
            A small buffer keeps one bad week from undoing months of work.
          </p>
          <button
            onClick={startBuffer}
            className="mt-4 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Start a ${STARTER_BUFFER.toLocaleString()} buffer
          </button>
        </>
      ) : (
        <>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${Number(buffer.saved).toLocaleString()}
                <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">of ${Number(buffer.target).toLocaleString()}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(goalProgress(buffer))}%</p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${goalProgress(buffer)}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {protectedNow
                ? 'Buffer funded. Now every spare dollar goes at the debt — and a surprise bill no longer sets you back.'
                : `$${Math.max(0, buffer.target - buffer.saved).toLocaleString()} to go. Worth pausing extra debt payments until this is full.`}
            </p>
          </div>
          <button
            onClick={() => setAdding(buffer)}
            className="mt-3 w-full rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            + Add to buffer
          </button>
        </>
      )}

      {/* Other goals — only surfaced once the buffer exists, to keep focus */}
      {buffer && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          {others.map((g) => (
            <div key={g.id} className="mb-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{g.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">${Number(g.saved).toLocaleString()} / ${Number(g.target).toLocaleString()}</p>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${goalProgress(g)}%` }} />
              </div>
              <div className="mt-1.5 flex gap-3">
                <button onClick={() => setAdding(g)} className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">+ Add</button>
                <button onClick={() => removeGoal(g.id)} className="text-xs text-slate-300 hover:text-slate-500 dark:text-slate-600">Remove</button>
              </div>
            </div>
          ))}

          {showNew ? (
            <form onSubmit={createCustom} className="mt-2 space-y-2">
              <input
                type="text" placeholder="Goal name" value={draft.name} maxLength={40}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <input
                type="number" placeholder="Target amount" value={draft.target} min="1"
                onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Add goal</button>
                <button type="button" onClick={() => setShowNew(false)} className="rounded-full px-4 text-sm text-slate-400">Cancel</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTED_GOALS.filter((s) => s.kind !== 'buffer').map((s) => (
                  <button key={s.name} type="button" title={s.why}
                    onClick={() => setDraft({ name: s.name, target: s.target ? String(s.target) : '' })}
                    className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
                    {s.name}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <button onClick={() => setShowNew(true)} className="text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300">
              + Another goal
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SafetyNet
