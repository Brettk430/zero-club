import { useZero } from '../context/ZeroContext.jsx'
import ZeroDashboard from '../components/ZeroDashboard.jsx'
import Logo from '../components/Logo.jsx'

// Signed-in members with a number to chase get the dashboard. Everyone else
// gets the pitch — which is one sentence long.

const steps = [
  { n: '1', title: 'Name your number', body: 'Everything you owe, as one figure. Takes about ten seconds.' },
  { n: '2', title: 'Log every payment', body: 'Watch it drop. Each one is a post, a badge, and something worth sending to a friend.' },
  { n: '3', title: 'Bring your people', body: 'Start a club. Compare progress, not balances — and get there together.' },
]

const Home = () => {
  const { hasZero, openOnboarding } = useZero()
  if (hasZero) return <ZeroDashboard />

  return (
    <section>
      <div className="bg-slate-950 px-5 py-20 text-center text-white sm:py-28">
        <Logo variant="plain" size={200} className="mx-auto sm:!h-[260px] sm:!w-[260px]" />
        <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">Get to $0. Together.</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-400 sm:text-lg">
          The social club for becoming debt-free. Track your journey to zero, and take your people with you.
        </p>
        <button
          type="button"
          onClick={openOnboarding}
          className="mt-10 rounded-full px-10 py-4 text-sm font-bold uppercase tracking-wide bg-lime text-deep transition hover:bg-[#D9FF7A]"
        >
          Find your zero
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
        <ol className="space-y-9">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
                {s.n}
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{s.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-14 border-t border-slate-200 pt-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Free while we build. Your balances stay private — clubs compare percentages, never dollars, unless you say so.
        </p>
      </div>
    </section>
  )
}

export default Home
