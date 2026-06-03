import { useState } from 'react'
import { Link } from 'react-router-dom'

const exampleDebts = [
  { name: 'Credit card', balance: 6000, rate: 24.99, min: 150, extra: 235, bg: 'bg-blue-500', ringColor: 'ring-blue-200 dark:ring-blue-800', badge: 'bg-blue-500' },
  { name: 'Car loan', balance: 10000, rate: 7.5, min: 220, extra: 0, bg: 'bg-sky-400', ringColor: 'ring-sky-200 dark:ring-sky-800', badge: 'bg-sky-400' },
  { name: 'Student loan', balance: 17000, rate: 4.5, min: 195, extra: 0, bg: 'bg-violet-400', ringColor: 'ring-violet-200 dark:ring-violet-800', badge: 'bg-violet-400' },
]

const CascadeArrow = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

const AvalancheInfographic = () => {
  const [hovered, setHovered] = useState(null)

  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

        {/* Header strip */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-800/50 sm:px-10 sm:py-6">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            See the math
          </span>
          <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-3xl">
            Same $800/month. Four fewer years of payments.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Put every extra dollar on the highest-rate debt first. When it's gone, that freed payment <span className="font-semibold text-slate-700 dark:text-slate-200">cascades</span> to the next one.
          </p>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">

          {/* Debt cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {exampleDebts.map((debt, i) => (
              <div
                key={debt.name}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className={`relative cursor-default rounded-2xl border p-5 transition-all duration-200 ${
                  i === 0
                    ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-md dark:border-yellow-700/60 dark:from-yellow-950/30 dark:to-amber-950/20'
                    : hovered === i
                      ? 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
                      : 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                {i === 0 && (
                  <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-slate-900 shadow-sm">
                    ⚡ Attack first
                  </span>
                )}

                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{debt.name}</p>
                  <span className={`shrink-0 rounded-full ${debt.badge} px-2.5 py-0.5 text-xs font-bold text-white`}>
                    {debt.rate}%
                  </span>
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ${debt.balance.toLocaleString()}
                </p>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Minimum</span>
                    <span className="font-semibold tabular-nums">${debt.min}/mo</span>
                  </div>
                  {debt.extra > 0 ? (
                    <div className="flex items-center justify-between font-semibold text-blue-600 dark:text-blue-400">
                      <span>Extra (avalanche)</span>
                      <span className="tabular-nums">+${debt.extra}/mo</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                      <span>Extra</span>
                      <span>—</span>
                    </div>
                  )}
                </div>

                {i === 0 && (
                  <div className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-center text-sm font-bold text-white dark:bg-blue-700">
                    ${debt.min + debt.extra}/mo total
                  </div>
                )}

                {/* Balance bar */}
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full ${debt.bg} opacity-70`}
                    style={{ width: `${(debt.balance / 17000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Cascade label */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <CascadeArrow />
              When paid off, that payment cascades to the next debt
              <CascadeArrow />
            </div>
            <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
          </div>

          {/* Before / after comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Minimum payments only</p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">8.2 years</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">$14,200 paid in interest</p>
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>Now</span><span>8.2 yrs</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full w-full rounded-full bg-slate-400 dark:bg-slate-500" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Zero Club avalanche</p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">4.0 years</p>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">$6,100 in interest — save $8,100</p>
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>Now</span><span>4 yrs</span><span className="text-slate-300 dark:text-slate-600">8.2 yrs</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ width: '49%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Savings callout */}
          <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl bg-blue-600 px-5 py-5 text-white sm:flex-row sm:px-8 sm:py-6 dark:bg-blue-700">
            <div>
              <p className="text-sm font-medium opacity-80">Same debt. Same monthly budget. You keep:</p>
              <p className="mt-1 text-2xl font-bold sm:text-4xl">$8,100 and 4 years of your life</p>
            </div>
            <Link
              to="/calculator"
              className="shrink-0 rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
            >
              Run my numbers →
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

const heroDebts = [
  { name: 'Chase Visa', pct: 12, remaining: '$720', color: 'bg-blue-500' },
  { name: 'Car loan', pct: 51, remaining: '$5,100', color: 'bg-sky-400' },
  { name: 'Student', pct: 79, remaining: '$13,400', color: 'bg-violet-400' },
]

const HeroGraphic = () => (
  <div className="relative w-full">
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-inner dark:border-slate-700 dark:bg-slate-800/60">

      {/* Circular progress ring */}
      <div className="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60" cy="60" r="46"
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="9"
          />
          <circle
            cx="60" cy="60" r="46"
            fill="none"
            className="stroke-blue-600 dark:stroke-blue-500"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="193 289"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">67%</p>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">paid off</p>
        </div>
      </div>

      {/* Stat chips */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm dark:bg-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">Debt-free in</p>
          <p className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">14 months</p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center dark:bg-amber-950/30">
          <p className="text-xs text-amber-600 dark:text-amber-400">Interest saved</p>
          <p className="mt-0.5 font-bold text-amber-600 dark:text-amber-400">$4,200</p>
        </div>
      </div>

      {/* Debt progress bars */}
      <div className="mt-5 space-y-3">
        {heroDebts.map((item) => (
          <div key={item.name} className="flex items-center gap-2.5 text-xs">
            <span className="w-[72px] shrink-0 text-slate-500 dark:text-slate-400">{item.name}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-slate-200 h-1.5 dark:bg-slate-700">
              <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.pct}%` }} />
            </div>
            <span className="w-11 shrink-0 text-right tabular-nums text-slate-400 dark:text-slate-500">{item.remaining}</span>
          </div>
        ))}
      </div>

      {/* Bottom label */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Avalanche order · highest rate first
      </div>
    </div>

    {/* Floating accent badge */}
    <div className="absolute -right-3 -top-3 rounded-2xl bg-yellow-400 px-3.5 py-2 shadow-lg">
      <p className="text-xs font-bold text-slate-900">⚡ On track</p>
    </div>
    {/* Decorative bottom-left dot */}
    <div className="absolute -bottom-2 -left-2 h-5 w-5 rounded-full border-4 border-white bg-emerald-400 shadow dark:border-slate-900" />
  </div>
)

const features = [
  {
    title: 'Avalanche Calculator',
    description: 'Enter your debts and income. We build a ranked payoff plan that minimizes total interest paid.',
    href: '/calculator',
    cta: 'Open calculator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Miles, your coach',
    description: 'Ask what-if questions — "What if I throw an extra $200 at my highest card?" — and Miles answers with your real numbers, not generic advice.',
    href: '/coach',
    cta: 'Talk to Miles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    title: 'Peer Community',
    description: 'Join an anonymous room matched to your debt-to-income range. Share wins, ask for accountability, stay the course.',
    href: '/community',
    cta: 'Join a room',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
]

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Everything you need to build a plan and start paying down debt.',
    features: ['Avalanche payoff calculator', 'Visual plan & milestones', 'Payoff date projection', 'Interest saved estimate'],
    cta: 'Get started free',
    href: '/calculator',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'AI coaching and community accountability when you need a boost.',
    features: ['Everything in Free', 'Unlimited sessions with Miles', 'Anonymous peer community', 'What-if scenario analysis', 'Priority support'],
    cta: 'Start 10-day free trial',
    href: '/coach',
    highlight: true,
  },
]

const Home = () => (
  <div className="text-slate-900 dark:text-slate-100">
    {/* Hero */}
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-10 lg:p-14">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[1fr_310px]">
          <div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 sm:px-4 sm:text-sm">
              Zero Club
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-slate-100 sm:mt-8 sm:text-5xl lg:text-7xl">
              Get to zero.<br />
              <span className="text-blue-600 dark:text-blue-400">Stay there.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400 sm:mt-8 sm:text-lg sm:leading-8">
              Zero Club turns your debt into a ranked payoff plan, connects you with anonymous peers, and gives you Miles — an AI coach who knows your exact numbers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">
              <Link
                to="/calculator"
                className="rounded-full bg-yellow-400 px-7 py-4 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
              >
                Build your plan
              </Link>
              <Link
                to="/plan"
                className="rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroGraphic />
          </div>
        </div>
      </div>
    </section>

    {/* Infographic */}
    <AvalancheInfographic />

    {/* Features */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              {feature.icon}
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">{feature.title}</h2>
            <p className="mt-3 flex-1 leading-7 text-slate-500 dark:text-slate-400">{feature.description}</p>
            <Link
              to={feature.href}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {feature.cta}
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </section>

    {/* About */}
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-16">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[1fr_1px_1fr]">

          {/* Left: founder story */}
          <div className="p-6 sm:p-12">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              Why Zero Club exists
            </span>

            <blockquote className="mt-6 border-l-4 border-yellow-400 pl-5">
              <p className="text-lg font-medium italic leading-8 text-slate-700 dark:text-slate-300">
                "I graduated excited about my future — and immediately terrified of my student loan balance. Nobody hands you a playbook."
              </p>
            </blockquote>

            <div className="mt-7 space-y-4 text-base leading-8 text-slate-500 dark:text-slate-400">
              <p>
                I'm a young professional who walked across that stage with a degree in one hand and five figures of debt in the other. The numbers felt abstract and overwhelming at the same time — like a problem I was supposed to have already solved.
              </p>
              <p>
                What made it harder was doing it alone. Nobody talks about this stuff. Debt is quiet, it's personal, and it compounds while you're busy pretending everything's fine.
              </p>
              <p>
                Zero Club is what I wished existed: a place that makes the math digestible, gives you a real plan, and surrounds you with people fighting the same fight. Not a bank. Not a lecture. A community with a calculator.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                ZC
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">The Zero Club Team</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Built by grads, for grads</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden bg-slate-100 lg:block dark:bg-slate-800" />

          {/* Right: pillars */}
          <div className="flex flex-col justify-center gap-0 divide-y divide-slate-100 dark:divide-slate-800 lg:divide-y">
            <div className="flex items-start gap-4 p-5 sm:gap-5 sm:p-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-blue-600 dark:text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Digestible by design</p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">No jargon, no judgment. Your debt becomes a ranked list with a payoff date — something you can actually act on today.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 sm:gap-5 sm:p-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-amber-600 dark:text-amber-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">You don't fight alone</p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">Anonymous peer rooms matched by debt range. Share wins, ask questions, stay accountable with people who genuinely get it.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 sm:gap-5 sm:p-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-emerald-600 dark:text-emerald-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">One day at a time</p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">Debt freedom isn't a sprint. It's showing up every month, watching the number shrink, and knowing exactly how many months are left.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/* Pricing */}
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-24">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Pricing</p>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Start free. Upgrade when you want the coach and community.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:items-start sm:gap-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-3xl p-5 sm:p-8 ${
                tier.highlight
                  ? 'border border-blue-200 bg-blue-50 shadow-sm dark:border-blue-900 dark:bg-blue-950/30'
                  : 'border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              {tier.highlight && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Most popular
                </span>
              )}
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tier.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{tier.price}</span>
                {tier.period && <span className="text-slate-500 dark:text-slate-400">{tier.period}</span>}
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{tier.description}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to={tier.href}
                className={`mt-10 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition ${
                  tier.highlight
                    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
)

export default Home
