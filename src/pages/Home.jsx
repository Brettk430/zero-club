import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'

const demoMembers = [
  { name: 'SteadyFalcon22', paid: 31200, pct: 78, months: 14, color: 'bg-blue-500' },
  { name: 'CalmHawk07',     paid: 54600, pct: 91, months: 22, color: 'bg-emerald-500' },
  { name: 'BoldOtter44',    paid: 18300, pct: 61, months: 9,  color: 'bg-violet-500' },
]

const steps = [
  {
    n: '1',
    title: 'Make a commitment',
    body: 'Write down exactly what you\'ll do each month — a payment amount, a spending limit, an extra contribution.',
    color: 'bg-blue-600 text-white',
  },
  {
    n: '2',
    title: 'Check in monthly',
    body: 'Answer four quick questions at the end of every month. Did you keep your commitment? What helped? What didn\'t?',
    color: 'bg-violet-600 text-white',
  },
  {
    n: '3',
    title: 'Build your streak',
    body: 'Consecutive months of follow-through compound. The streak becomes the motivation to keep going.',
    color: 'bg-amber-500 text-white',
  },
  {
    n: '4',
    title: 'Reach zero',
    body: 'Debt freedom isn\'t a sprint. It\'s showing up every month. Zero is just the math — we\'re here for the habit.',
    color: 'bg-emerald-600 text-white',
  },
]

const features = [
  {
    title: 'Monthly Commitments',
    body: 'Set a specific pledge each month — a payment target, a spending limit, an extra push. The app holds you to it.',
    href: '/commitments',
    cta: 'Set a commitment',
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
  },
  {
    title: 'AI Accountability Coach',
    body: 'Miles isn\'t a calculator. Miles is a behavior coach — reminding you of your goals, calling out spending leaks, and getting you back on track after a tough month.',
    href: '/coach',
    cta: 'Talk to Miles',
    accent: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/50',
  },
  {
    title: 'Accountability Community',
    body: 'Find a small group paying off the same kind of debt. 5–10 people who get it — not a public feed, a real circle.',
    href: '/community',
    cta: 'Find your circle',
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
]

const Home = () => {
  const { debts, plan } = useDebt()

  const totalPaidOff = useMemo(() =>
    debts.reduce((sum, d) => {
      const start = Number(d.startingBalance) || Number(d.balance) || 0
      const current = Number(d.balance) || 0
      return sum + Math.max(0, start - current)
    }, 0),
    [debts]
  )

  return (
    <div className="text-slate-900 dark:text-slate-100">

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-12 dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              Accountability platform
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
              Debt freedom is a habit.<br />
              <span className="text-blue-600 dark:text-blue-400">We build it with you.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400 sm:text-lg sm:leading-8">
              You already know how to get out of debt. The hard part is staying consistent for 3–10 years. Zero is the accountability platform that keeps you on track — month after month, until you're done.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10">
              <Link to="/commitments" className="rounded-full bg-yellow-400 px-7 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-yellow-300">
                Make your commitment
              </Link>
              <Link to="/calculator" className="rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                Build your plan
              </Link>
            </div>
          </div>

          {/* Personal dashboard — shown once they have debts */}
          {totalPaidOff > 0 ? (
            <div className="mx-auto mt-10 w-full max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-center text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Your progress</p>
              <p className="mt-1 text-center text-4xl font-bold text-emerald-700 dark:text-emerald-400">${totalPaidOff.toLocaleString()} eliminated</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/70 px-4 py-3 text-center dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                  <p className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">${debts.reduce((s, d) => s + Number(d.balance || 0), 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white/70 px-4 py-3 text-center dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Debt-free by</p>
                  <p className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{plan.payoffDate || '—'}</p>
                </div>
              </div>
              <Link to="/plan" className="mt-4 flex w-full items-center justify-center rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Go to your Journey →
              </Link>
            </div>
          ) : (
            /* Simulation for new visitors */
            <div className="mx-auto mt-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="border-b border-slate-100 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Zero members this month</p>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {demoMembers.map((m) => (
                  <div key={m.name} className="flex items-center gap-3 px-5 py-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${m.color}`}>
                      {m.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{m.name}</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+${m.paid.toLocaleString()}</p>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{m.months}mo</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  Your progress will appear here once you start tracking.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Core insight */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="p-6 sm:p-8">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">You already know<br />what to do.</p>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">The information isn't the problem. There are a thousand apps that will tell you to pay off high-interest debt first.</p>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">The problem is<br />staying consistent.</p>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Life gets in the way. Motivation fades. Without accountability, most people drift off their plan within 90 days.</p>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">Zero keeps<br />you consistent.</p>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Commitments. Monthly check-ins. Streaks. A coach who knows your plan. A community that holds you accountable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">How it works</p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">The accountability loop</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${step.color}`}>
                  {step.n}
                </div>
                <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${f.bg}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`h-5 w-5 ${f.accent}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="mt-5 font-semibold text-slate-900 dark:text-slate-100">{f.title}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{f.body}</p>
              <Link to={f.href} className={`mt-6 text-sm font-semibold ${f.accent} transition hover:opacity-80`}>
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Pricing</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Free to start. Premium to accelerate.</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">The free tier builds the habit. Premium helps you move faster.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-6">
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-8 dark:border-slate-700 dark:bg-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Free</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">$0</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                {['Avalanche debt calculator', 'Journey scoreboard', 'Monthly commitments', 'Basic streaks', 'Milestone achievements'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-500"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/calculator" className="mt-8 rounded-full border border-slate-300 bg-white py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                Get started free
              </Link>
            </div>
            <div className="flex flex-col rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-8 dark:border-blue-900 dark:bg-blue-950/30">
              <span className="w-fit rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Premium</span>
              <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">Zero Premium</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">$9</span>
                <span className="text-slate-500 dark:text-slate-400">/month</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                {['Everything in Free', 'Miles AI behavior coach', 'Weekly action plans', 'Advanced payoff scenarios', 'Accountability circles', 'Personalized insights'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-500"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/coach" className="mt-8 rounded-full bg-yellow-400 py-3 text-center text-sm font-bold text-slate-900 transition hover:bg-yellow-300">
                Claim Founder Access — Free
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home
