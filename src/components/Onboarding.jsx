import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { GROUPS, saveGroupLocally } from '../lib/groups.js'
import AuthModal from './AuthModal.jsx'

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

const ProgressBar = ({ step }) => (
  <div className="flex gap-1.5">
    {[0, 1].map((i) => (
      <div
        key={i}
        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
          i <= step ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      />
    ))}
  </div>
)

const GOALS = [
  'Breathe easier every month',
  'Buy a home someday',
  'Debt-free before 30',
  'Stop living paycheck to paycheck',
  'Build wealth after zero',
]

// Step 1: Name, goal, and add first debt
const StepStart = ({ onNext }) => {
  const { debts, addDebt, updateDebt } = useDebt()
  const [name, setName] = useState(() => localStorage.getItem('zc_fullname') || '')
  const [goal, setGoal] = useState(() => localStorage.getItem('zc_goal') || '')
  const [draft, setDraft] = useState({ name: '', balance: '', rate: '', minPayment: '' })
  const [touched, setTouched] = useState(false)

  const canAdd = draft.name.trim() && draft.balance && draft.rate && draft.minPayment
  const hasDebt = debts.length > 0

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

  const handleNext = () => {
    if (name.trim()) localStorage.setItem('zc_fullname', name.trim())
    if (goal) localStorage.setItem('zc_goal', goal)
    if (hasDebt) onNext()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Step 1 of 2</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Let's get started.</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Quick setup — you can add more debts anytime.</p>

      <label className="mt-6 block text-xs font-medium text-slate-500 dark:text-slate-400">
        What should we call you?
        <input
          type="text"
          className={`mt-1 ${inputCls}`}
          placeholder="Your first name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">Why zero? Pick the one that hits.</p>
      <div className="mt-2 space-y-2">
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGoal(g)}
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
              goal === g
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Your first debt</p>
      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Name (e.g. Chase Visa)
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
            Rate (%)
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
            Minimum payment ($/month)
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

      {hasDebt && (
        <button
          type="button"
          onClick={handleNext}
          className="mt-6 w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Continue →
        </button>
      )}
    </div>
  )
}

// Step 2: Budget (with skip option)
const StepBudget = ({ onNext }) => {
  const { monthlyIncome, setMonthlyIncome, maxMonthlyPayment, setMaxMonthlyPayment, debts } = useDebt()
  const totalMin = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Step 2 of 2</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Your monthly budget</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Extra money gets aimed at your highest-rate debt first.
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
          <span className="text-slate-500 dark:text-slate-400">Your minimums</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">${totalMin.toLocaleString()}/mo</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-full border border-slate-200 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-[2] rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Start paying →
        </button>
      </div>
    </div>
  )
}

const Onboarding = ({ onComplete }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleComplete = () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    onComplete()
    navigate('/')
  }

  if (showAuthModal) {
    return <AuthModal onClose={() => setShowAuthModal(false)} />
  }

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
          {step === 0 && <StepStart onNext={() => setStep(1)} />}
          {step === 1 && <StepBudget onNext={handleComplete} />}
        </div>
      </div>
    </div>
  )
}

export default Onboarding
