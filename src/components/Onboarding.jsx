import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

const ProgressBar = ({ step }) => (
  <div className="flex gap-1.5">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
          i <= step ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      />
    ))}
  </div>
)

const RemoveIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
  </svg>
)

const StepDebts = ({ onNext }) => {
  const { debts, addDebt, updateDebt, removeDebt } = useDebt()
  const [draft, setDraft] = useState({ name: '', balance: '', rate: '', minPayment: '' })
  const [touched, setTouched] = useState(false)

  const canAdd = draft.name.trim() && draft.balance && draft.rate && draft.minPayment

  const handleAdd = () => {
    if (!canAdd) { setTouched(true); return }
    const id = addDebt()
    updateDebt(id, {
      name: draft.name.trim(),
      balance: Number(draft.balance),
      rate: Number(draft.rate),
      minPayment: Number(draft.minPayment),
    })
    setDraft({ name: '', balance: '', rate: '', minPayment: '' })
    setTouched(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Step 1 of 3</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">What do you owe?</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Add your debts and we'll rank them for fastest payoff.</p>

      {debts.length > 0 && (
        <div className="mt-5 space-y-2">
          {debts.map((debt) => (
            <div key={debt.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{debt.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  ${Number(debt.balance).toLocaleString()} · {debt.rate}% APR · ${debt.minPayment}/mo
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeDebt(debt.id)}
                className="ml-3 shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950/30"
                aria-label="Remove debt"
              >
                <RemoveIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Debt name
            <input
              type="text"
              className={`mt-1 ${inputCls}`}
              placeholder="e.g. Chase Visa"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Balance ($)
            <input
              type="number"
              className={`mt-1 ${inputCls}`}
              placeholder="5000"
              value={draft.balance}
              onChange={(e) => setDraft((d) => ({ ...d, balance: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Interest rate %
            <input
              type="number"
              className={`mt-1 ${inputCls}`}
              placeholder="24.99"
              value={draft.rate}
              onChange={(e) => setDraft((d) => ({ ...d, rate: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </label>
          <label className="col-span-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Monthly minimum ($)
            <input
              type="number"
              className={`mt-1 ${inputCls}`}
              placeholder="150"
              value={draft.minPayment}
              onChange={(e) => setDraft((d) => ({ ...d, minPayment: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </label>
        </div>
        {touched && !canAdd && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Fill in all fields to add this debt.</p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          className="mt-3 w-full rounded-2xl bg-blue-50 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          + Add debt
        </button>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={debts.length === 0}
        className="mt-5 w-full rounded-full bg-yellow-400 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue →
      </button>
    </div>
  )
}

const StepBudget = ({ onNext, onBack }) => {
  const { monthlyIncome, setMonthlyIncome, maxMonthlyPayment, setMaxMonthlyPayment, debts } = useDebt()

  const totalMin = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0)
  const maxPmt = Number(maxMonthlyPayment) || 0
  const extra = maxPmt > totalMin ? maxPmt - totalMin : 0
  const belowMin = maxPmt > 0 && maxPmt < totalMin

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Step 2 of 3</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">What's your monthly budget?</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Extra money beyond your minimums gets aimed at your highest-rate debt first.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
          Monthly take-home income
          <input
            type="number"
            className={`mt-1.5 ${inputCls}`}
            placeholder="e.g. 5000"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
          Max toward debt per month
          <input
            type="number"
            className={`mt-1.5 ${inputCls}`}
            placeholder={`at least $${totalMin.toLocaleString()} (your minimums)`}
            value={maxMonthlyPayment}
            onChange={(e) => setMaxMonthlyPayment(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Minimum payments</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">${totalMin.toLocaleString()}/mo</span>
        </div>
        {extra > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">Avalanche extra</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">+${extra.toLocaleString()}/mo</span>
          </div>
        )}
        {belowMin && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Below your minimums — we'll use minimums to build your plan.
          </p>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-full border border-slate-200 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-[2] rounded-full bg-yellow-400 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
        >
          See my plan →
        </button>
      </div>
    </div>
  )
}

const StepPlan = ({ onComplete }) => {
  const { plan, debts } = useDebt()
  const navigate = useNavigate()

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0)

  const handleStart = () => {
    onComplete()
    navigate('/plan')
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Step 3 of 3</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Here's your plan.</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Same debt, same income — this is what the avalanche method gets you.
      </p>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Debt-free by</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{plan.payoffDate || '—'}</p>
          {plan.monthsUntilPayoff > 0 && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.monthsUntilPayoff} months away</p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Interest saved vs paying minimums</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            ${plan.interestSaved.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total debt</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">${totalDebt.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Monthly payment</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">${plan.monthlyPayment.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="mt-6 w-full rounded-full bg-yellow-400 py-4 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
      >
        Start my journey →
      </button>
    </div>
  )
}

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600">
            <span className="text-xs font-bold text-white">Z</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Zero Club</span>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="text-sm text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Skip
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 sm:px-8">
        <ProgressBar step={step} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-md">
          {step === 0 && <StepDebts onNext={() => setStep(1)} />}
          {step === 1 && <StepBudget onNext={() => setStep(2)} onBack={() => setStep(0)} />}
          {step === 2 && <StepPlan onComplete={onComplete} />}
        </div>
      </div>
    </div>
  )
}

export default Onboarding
