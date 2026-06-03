import { Link } from 'react-router-dom'

const leaderboard = [
  { name: 'SteadyFalcon22', cohort: 'Debt-Free by 2027', pct: 78, paid: 31200, color: 'bg-blue-500',    status: 'Final Stretch' },
  { name: 'BoldOtter44',    cohort: 'Student Loan Crushers', pct: 61, paid: 18300, color: 'bg-violet-500', status: 'Halfway There' },
  { name: 'CalmHawk07',     cohort: 'Debt-Free by 2026', pct: 91, paid: 54600, color: 'bg-emerald-500', status: 'Almost Zero' },
  { name: 'FocusedWolf31',  cohort: 'Under 30 Debt-Free', pct: 34, paid: 8500,  color: 'bg-amber-500',  status: 'Building Momentum' },
  { name: 'QuietEagle88',   cohort: 'Credit Card Elimination', pct: 55, paid: 11000, color: 'bg-rose-500', status: 'Halfway There' },
]

const memberStatuses = [
  { label: 'Road to Zero',    range: '0–25% paid off',   color: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { label: 'In Progress',     range: '25–50% paid off',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { label: 'Final Stretch',   range: '50–90% paid off',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' },
  { label: 'Zero Club Member',range: '100% paid off',    color: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-300' },
]

const cohorts = [
  { id: 'dff-2026', label: 'Debt-Free by 2026', description: 'Final sprint to zero', color: 'bg-blue-500' },
  { id: 'dff-2027', label: 'Debt-Free by 2027', description: 'Three-year mission',   color: 'bg-violet-500' },
  { id: 'dff-2028', label: 'Debt-Free by 2028', description: 'Building momentum',    color: 'bg-sky-500' },
  { id: 'student-loans', label: 'Student Loan Crushers', description: 'Eliminating education debt', color: 'bg-amber-500' },
  { id: 'credit-cards',  label: 'Credit Card Elimination', description: 'Cutting the cards for good', color: 'bg-rose-500' },
  { id: 'under-30',      label: 'Under 30 Debt-Free', description: 'Young and getting free', color: 'bg-emerald-500' },
]

const milestoneExamples = [
  { label: 'First $1,000', sub: 'The journey begins' },
  { label: '25% There',    sub: 'A quarter of the way' },
  { label: 'Halfway to Zero', sub: 'The view from the hill' },
  { label: 'Zero Club Member', sub: 'You made it' },
]

const steps = [
  {
    n: '1',
    title: 'Enter your debt',
    body: 'Add your balances, rates, and minimums. We build your avalanche payoff plan instantly.',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  },
  {
    n: '2',
    title: 'Join your cohort',
    body: 'Find people fighting the same fight — matched by goal year, debt type, or life stage.',
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  },
  {
    n: '3',
    title: 'Check in monthly',
    body: 'Log your actual balances. Watch the number shrink. Stay accountable to your cohort.',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  },
  {
    n: '4',
    title: 'Reach zero',
    body: 'Hit milestones, earn achievements, and celebrate with the community that got you there.',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
]

const Home = () => (
  <div className="text-slate-900 dark:text-slate-100">

    {/* Hero */}
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-12 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            A movement, not an app
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
            The community that gets you to{' '}
            <span className="text-blue-600 dark:text-blue-400">zero.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400 sm:text-lg sm:leading-8">
            Zero Club is where people serious about becoming debt-free come together. Track your progress, join a cohort, stay accountable — and celebrate every win on the way to zero.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4">
            <Link
              to="/calculator"
              className="rounded-full bg-yellow-400 px-7 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-yellow-300"
            >
              Start your journey
            </Link>
            <Link
              to="/community"
              className="rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Join a cohort
            </Link>
          </div>
        </div>

        {/* Identity strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 pt-8 dark:border-slate-800">
          {['Journey to Zero', 'Zero Day', 'Final Payment', 'Zero Club Member', 'Road to Zero'].map((label) => (
            <span key={label} className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>

    {/* Mission */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-blue-600 dark:text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Progress is the product</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Every screen shows where you started, where you are, and how far you've come. The number shrinking is the point.</p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-violet-600 dark:text-violet-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Community over forums</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Not a discussion board. Real cohorts of people with the same goal year, same debt type, same life stage — people who get it.</p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-amber-600 dark:text-amber-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Accountability over content</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate.400">Most people know what to do. Staying consistent for 3–10 years is the hard part. That's what we're built for.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Big community CTA */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <Link
        to="/community"
        className="flex items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-blue-600 to-violet-600 p-6 shadow-lg transition hover:opacity-95 sm:p-10"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Community</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Find your people →</h2>
          <p className="mt-2 text-sm text-blue-100 sm:text-base">Find people fighting the same fight. Pick your goal year or debt type and get in the room.</p>
        </div>
        <div className="hidden shrink-0 sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
      </Link>
    </section>

    {/* Member leaderboard */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Live rankings</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Members making moves</h2>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <div className="mt-6 space-y-3">
          {leaderboard.map((member, i) => (
            <div key={member.name} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {i + 1}
              </span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white dark:bg-slate-600" style={{ background: member.color.replace('bg-', '') }}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${member.color}`}>
                  {member.name[0]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{member.name}</p>
                  <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">{member.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className={`h-full rounded-full ${member.color} transition-all`} style={{ width: `${member.pct}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{member.cohort}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">${member.paid.toLocaleString()} paid off</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Member status */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Member status</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Your rank on the road to zero</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Every member has a status based on how far they've come. The goal is simple — reach Zero Club Member.</p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {memberStatuses.map((s, i) => (
            <div key={s.label} className={`relative rounded-2xl border p-5 ${i === memberStatuses.length - 1 ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700/60 dark:bg-yellow-950/20' : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40'}`}>
              {i === memberStatuses.length - 1 && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-slate-900">Goal</span>
              )}
              <div className="flex items-center gap-2">
                {[...Array(4)].map((_, dot) => (
                  <span key={dot} className={`h-2 w-2 rounded-full ${dot <= i ? (i === 3 ? 'bg-yellow-400' : 'bg-blue-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
              <p className={`mt-3 text-sm font-bold ${i === memberStatuses.length - 1 ? 'text-yellow-700 dark:text-yellow-400' : 'text-slate-800 dark:text-slate-200'}`}>{s.label}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{s.range}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">How it works</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Four steps to zero</h2>
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

    {/* Cohorts */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Cohorts</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Find your people</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Join a group matched to your goal. People with the same target make better accountability partners.</p>
          </div>
          <Link to="/community" className="shrink-0 rounded-full bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-300">
            Find your people →
          </Link>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.id}
              to="/community"
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cohort.color} text-white`}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{cohort.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{cohort.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* Milestones */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Achievement system</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Every win counts</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Debt freedom takes years. We break it into milestones so you feel the progress every step of the way.</p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {milestoneExamples.map((m, i) => (
            <div
              key={m.label}
              className={`rounded-2xl p-4 text-center ${i === milestoneExamples.length - 1 ? 'border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30' : 'border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'}`}
            >
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${i === milestoneExamples.length - 1 ? 'bg-yellow-400' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <svg viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${i === milestoneExamples.length - 1 ? 'text-slate-900' : 'text-slate-400 dark:text-slate-500'}`}>
                  <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377 49.78 49.78 0 00-6.093.377.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
                </svg>
              </div>
              <p className={`mt-3 text-sm font-semibold ${i === milestoneExamples.length - 1 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{m.label}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Pricing */}
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-24">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Start free. Stay as long as you need.</h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">The journey to zero takes years. We're not going anywhere.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-6">
          <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-8 dark:border-slate-700 dark:bg-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Free</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">$0</span>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Everything to build your plan and track progress.</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              {['Avalanche payoff calculator', 'Your journey scoreboard', 'Milestone achievements', 'Payoff date projection'].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-500"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/calculator" className="mt-8 rounded-full border border-slate-300 bg-white py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
              Get started free
            </Link>
          </div>
          <div className="flex flex-col rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-8 dark:border-blue-900 dark:bg-blue-950/30">
            <span className="w-fit rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Most popular</span>
            <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">Pro</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">$9</span>
              <span className="text-slate-500 dark:text-slate-400">/month</span>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">AI coaching and community cohorts to keep you accountable.</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              {['Everything in Free', 'Unlimited sessions with Miles', 'Cohort community access', 'What-if scenario analysis', 'Priority support'].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-500"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/coach" className="mt-8 rounded-full bg-yellow-400 py-3 text-center text-sm font-bold text-slate-900 transition hover:bg-yellow-300">
              Start 10-day free trial
            </Link>
          </div>
        </div>
      </div>
    </section>

  </div>
)

export default Home
