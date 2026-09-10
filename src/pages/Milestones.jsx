import { useZero } from '../context/ZeroContext.jsx'
import { MILESTONES, earnedMilestones, distanceToNext, money } from '../lib/zero.js'
import Logo from '../components/Logo.jsx'

// The collection. Everything is shown, earned or not, so the ladder reads as a
// route rather than a scoreboard — the ones still dark are the point.

const Milestones = () => {
  const { startingDebt, currentDebt, eliminated, progressPct, streakMonths, hasZero } = useZero()

  const earned = earnedMilestones(startingDebt, currentDebt)
  const earnedIds = new Set(earned.map((m) => m.id))
  const next = distanceToNext(startingDebt, currentDebt)

  if (!hasZero) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <Logo variant="plain" size={64} className="mx-auto opacity-70" />
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Milestones</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Name your number and the first badge is already close.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Milestones</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every payment gets you closer.</p>

      {/* What's next, given the loudest billing on the page */}
      <div className="mt-5 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
        {next ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Next up</p>
            <p className="mt-3 text-5xl">{next.milestone.emoji}</p>
            <p className="mt-3 text-2xl font-black tracking-tight">{next.milestone.label}</p>
            <p className="mt-1.5 text-sm text-slate-400">
              <span className="font-bold text-emerald-400">{money(next.amount)}</span> to go
            </p>
          </>
        ) : (
          <>
            <Logo variant="plain" size={72} className="mx-auto" />
            <p className="mt-4 text-center text-2xl font-black tracking-tight">Every badge earned.</p>
            <p className="mt-1.5 text-center text-sm text-slate-400">You eliminated {money(startingDebt)}.</p>
          </>
        )}

        <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Earned</p>
            <p className="mt-1 text-lg font-black">{earned.length}<span className="text-slate-500">/{MILESTONES.length}</span></p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Eliminated</p>
            <p className="mt-1 text-lg font-black text-emerald-400">{money(eliminated)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Streak</p>
            <p className="mt-1 text-lg font-black">{streakMonths > 0 ? `🔥 ${streakMonths}mo` : '—'}</p>
          </div>
        </div>
      </div>

      {/* The ladder */}
      <ol className="mt-3 space-y-2">
        {MILESTONES.map((m) => {
          const has = earnedIds.has(m.id)
          const isNext = next?.milestone.id === m.id
          return (
            <li
              key={m.id}
              className={`flex items-center gap-4 rounded-2xl px-5 py-4 shadow-sm ring-1 transition ${
                has
                  ? 'bg-white ring-slate-100 dark:bg-slate-900 dark:ring-slate-800'
                  : isNext
                    ? 'bg-white ring-emerald-500/40 dark:bg-slate-900'
                    : 'bg-white/60 ring-slate-100 dark:bg-slate-900/50 dark:ring-slate-800'
              }`}
            >
              <span className={`text-2xl ${has ? '' : 'opacity-25 grayscale'}`}>{m.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${has ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {m.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {has ? 'Earned' : isNext ? `${money(next.amount)} to go` : m.kind === 'amount' ? `at ${money(m.at)} eliminated` : `at ${m.at}% to zero`}
                </p>
              </div>
              {has && (
                <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-emerald-400 dark:text-slate-950">
                  Done
                </span>
              )}
            </li>
          )
        })}
      </ol>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        {progressPct.toFixed(1)}% of the way to zero.
      </p>
    </section>
  )
}

export default Milestones
