import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useZero } from '../context/ZeroContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'
import Logo from './Logo.jsx'
import { money } from '../lib/zero.js'

// Two questions and you're in. Anything else asked here is a reason to leave.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const StepAmount = ({ value, onChange, onNext }) => {
  const digits = value.replace(/[^0-9]/g, '')
  const display = digits ? Number(digits).toLocaleString() : ''

  return (
    <div className="w-full">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Step 1 of 2</p>
      <h1 className="mt-3 text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
        What's your zero?
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-400">
        One number: everything you owe today. Cards, loans, the car, all of it.
      </p>

      <div className="mt-10">
        <div className="flex items-center justify-center gap-1">
          <span className="text-4xl font-black text-slate-500 sm:text-5xl">$</span>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={display}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            aria-label="Total debt"
            className="w-full max-w-[7ch] bg-transparent text-center text-5xl font-black tracking-tight text-white outline-none placeholder:text-slate-700 sm:text-7xl"
            style={{ width: `${Math.max(1, display.length || 1)}ch` }}
          />
        </div>
        <div className="mx-auto mt-4 h-px w-40 bg-slate-700" />
      </div>

      <button
        type="button"
        disabled={!Number(digits)}
        onClick={onNext}
        className="mt-12 w-full rounded-full py-4 text-sm font-bold disabled:opacity-30 bg-lime text-deep transition hover:bg-[#D9FF7A]"
      >
        Continue
      </button>
    </div>
  )
}

const StepDate = ({ total, value, onChange, onNext, onBack }) => {
  const now = new Date()
  const years = useMemo(
    () => Array.from({ length: 12 }, (_, i) => now.getFullYear() + i),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [month, setMonth] = useState(() => (value ? Number(value.slice(5, 7)) - 1 : 11))
  const [year, setYear] = useState(() => (value ? Number(value.slice(0, 4)) : now.getFullYear() + 2))

  useEffect(() => {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const monthsAway = (year - now.getFullYear()) * 12 + (month - now.getMonth())
  const pace = monthsAway > 0 ? total / monthsAway : null

  return (
    <div className="w-full">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Step 2 of 2</p>
      <h1 className="mt-3 text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
        When do you hit zero?
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-400">
        Pick a date worth chasing. You can move it whenever you want.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Goal month"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-base font-semibold text-white outline-none focus:border-emerald-500"
        >
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Goal year"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-base font-semibold text-white outline-none focus:border-emerald-500"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {pace && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">That's about</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">{money(pace)}<span className="text-base font-bold text-slate-500"> / month</span></p>
          <p className="mt-1 text-xs text-slate-500">{monthsAway} months from now</p>
        </div>
      )}

      <button
        type="button"
        disabled={monthsAway <= 0}
        onClick={onNext}
        className="mt-8 w-full rounded-full py-4 text-sm font-bold disabled:opacity-30 bg-lime text-deep transition hover:bg-[#D9FF7A]"
      >
        Continue
      </button>
      <button type="button" onClick={onBack} className="mt-3 w-full py-2 text-sm font-medium text-slate-500 transition hover:text-slate-300">
        Back
      </button>
    </div>
  )
}

const StepWelcome = ({ total, onFinish }) => (
  <div className="w-full text-center">
    <Logo variant="plain" size={168} className="mx-auto" />
    <h1 className="mt-2 text-2xl font-black uppercase tracking-[0.2em] text-white">Welcome to Zero Club</h1>
    <p className="mt-6 text-lg leading-8 text-slate-400">
      You're <span className="font-bold text-emerald-400">{money(total)}</span> away from zero.
      <br />Let's get you there.
    </p>
    <button
      type="button"
      onClick={onFinish}
      className="mt-10 w-full rounded-full py-4 text-sm font-bold bg-lime text-deep transition hover:bg-[#D9FF7A]"
    >
      Start my journey
    </button>
  </div>
)

const ZeroOnboarding = ({ onComplete }) => {
  const { setZero } = useZero()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState('')
  const [goal, setGoal] = useState('')
  const [awaitingAuth, setAwaitingAuth] = useState(false)

  const total = Number(amount.replace(/[^0-9]/g, '')) || 0

  // Persisted the moment it's given, before any sign-in. Google's OAuth is a
  // full-page redirect: anything still living in React state when it fires is
  // gone by the time the member lands back here, which meant answering both
  // questions, signing in, and being asked for the number all over again.
  const commitAnswers = async () => {
    await setZero({ total, goal })
    setStep(2)
  }

  const finish = () => {
    onComplete()
    navigate('/')
  }

  // Kept in a ref rather than read off the modal's open state. The auth modal
  // closes itself the moment sign-up succeeds, which cleared "waiting for
  // auth" before the new session had arrived — so a check needing both at
  // once never fired, and the member was left sitting in onboarding.
  const finishWhenSignedIn = useRef(false)

  // Signing in is the last step, not a wall in the middle of it.
  const handleFinish = () => {
    if (!user) {
      finishWhenSignedIn.current = true
      setAwaitingAuth(true)
      return
    }
    finish()
  }

  useEffect(() => {
    if (user && finishWhenSignedIn.current) {
      finishWhenSignedIn.current = false
      setAwaitingAuth(false)
      finish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (awaitingAuth) return <AuthModal onClose={() => setAwaitingAuth(false)} />

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950">
      <div className="flex min-h-full flex-col px-6 py-10 sm:px-8">
        <div className="flex items-center gap-2">
          <Logo variant="plain" size={26} />
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-white">Zero Club</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            {step === 0 && <StepAmount value={amount} onChange={setAmount} onNext={() => setStep(1)} />}
            {step === 1 && <StepDate total={total} value={goal} onChange={setGoal} onNext={commitAnswers} onBack={() => setStep(0)} />}
            {step === 2 && <StepWelcome total={total} onFinish={handleFinish} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ZeroOnboarding
