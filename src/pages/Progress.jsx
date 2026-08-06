import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'
import { computeAchievements } from '../lib/milestones.js'
import {
  paymentsByMonth, monthsOnSchedule, paymentsByDay,
  paymentStreakWeeks, visitDayCount, totalPaid,
} from '../lib/payments.js'

// The Progress page answers one question with pictures:
// "Am I closer to debt-free than yesterday?" Green = progress, always.

const Card = ({ title, sub, children }) => (
  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-8 dark:bg-slate-900 dark:ring-slate-800">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</p>
    {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    {children}
  </div>
)

// ─── Balance over time ───────────────────────────────────────────────────────
// Past: reconstructed backwards from logged payments, anchored at today's
// balance. Future: the plan projection, drawn dashed — hope, not history.

const BalanceChart = ({ payments, totalCurrent, plan }) => {
  const { past, future, max } = useMemo(() => {
    const now = new Date()
    const pastPts = []
    for (let i = 6; i >= 1; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const paidAfter = payments
        .filter((p) => new Date(p.date) > monthEnd)
        .reduce((s, p) => s + Number(p.amount), 0)
      pastPts.push(totalCurrent + paidAfter)
    }
    pastPts.push(totalCurrent)

    const futurePts = (plan.balanceByMonth || []).slice(1, 13)
    const all = [...pastPts, ...futurePts]
    return { past: pastPts, future: futurePts, max: Math.max(...all, 1) }
  }, [payments, totalCurrent, plan.balanceByMonth])

  const W = 600
  const H = 200
  const PAD = 10
  const total = past.length + future.length
  const x = (i) => PAD + (i / (total - 1)) * (W - PAD * 2)
  const y = (v) => PAD + (1 - v / max) * (H - PAD * 2)
  const path = (pts, offset) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + offset).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  const pastLine = path(past, 0)
  const futureLine = future.length
    ? `M${x(past.length - 1).toFixed(1)},${y(past[past.length - 1]).toFixed(1)} ` +
      future.map((v, i) => `L${x(past.length + i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    : ''

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Balance over the last six months and projected forward">
        <path d={`${pastLine} L${x(past.length - 1)},${H - PAD} L${PAD},${H - PAD} Z`} className="fill-emerald-50 dark:fill-emerald-950/30" />
        <path d={pastLine} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-emerald-500" />
        {futureLine && <path d={futureLine} fill="none" strokeWidth="2" strokeDasharray="5 5" className="stroke-slate-300 dark:stroke-slate-600" />}
        <circle cx={x(past.length - 1)} cy={y(past[past.length - 1])} r="5" className="fill-emerald-500 stroke-white stroke-2 dark:stroke-slate-900" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>6 months ago</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 rounded bg-emerald-500" /> actual</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed border-slate-300 dark:border-slate-600" /> projected</span>
        </span>
      </div>
    </>
  )
}

// ─── Activity heatmap ────────────────────────────────────────────────────────

const Heatmap = ({ payments }) => {
  const { weeks, maxDay } = useMemo(() => {
    const byDay = paymentsByDay(payments)
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay() - 15 * 7) // 16 week columns, aligned to Sunday
    const cols = []
    const cursor = new Date(start)
    let max = 0
    for (let w = 0; w < 16; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().slice(0, 10)
        const amount = cursor <= today ? (byDay[key] || 0) : null
        if (amount) max = Math.max(max, amount)
        col.push({ key, amount })
        cursor.setDate(cursor.getDate() + 1)
      }
      cols.push(col)
    }
    return { weeks: cols, maxDay: max || 1 }
  }, [payments])

  const fill = (amount) => {
    if (amount === null) return 'fill-transparent'
    if (!amount) return 'fill-slate-100 dark:fill-slate-800'
    const ratio = amount / maxDay
    if (ratio > 0.66) return 'fill-emerald-600'
    if (ratio > 0.33) return 'fill-emerald-400'
    return 'fill-emerald-200 dark:fill-emerald-900'
  }

  return (
    <svg viewBox="0 0 194 86" className="mt-4 w-full max-w-md" role="img" aria-label="Payment activity for the last 16 weeks">
      {weeks.map((col, w) => col.map((day, d) => (
        <rect key={day.key} x={w * 12} y={d * 12} width="10" height="10" rx="2.5" className={fill(day.amount)}>
          <title>{day.amount ? `${day.key}: $${day.amount.toLocaleString()}` : day.key}</title>
        </rect>
      )))}
    </svg>
  )
}

// ─── Monthly bars ────────────────────────────────────────────────────────────

const MonthlyBars = ({ payments, target }) => {
  const months = useMemo(() => paymentsByMonth(payments, 6), [payments])
  const max = Math.max(...months.map((m) => m.total), target || 0, 1)
  const H = 130

  return (
    <div className="mt-5">
      <div className="relative flex h-[130px] items-end gap-3">
        {target > 0 && (
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-slate-200 dark:border-slate-700"
            style={{ bottom: `${(target / max) * H}px` }}
          >
            <span className="absolute -top-2.5 right-0 bg-white pl-1 text-[10px] text-slate-400 dark:bg-slate-900">plan ${target.toLocaleString()}</span>
          </div>
        )}
        {months.map((m) => (
          <div key={m.key} className="flex flex-1 flex-col items-center justify-end" title={`${m.label}: $${m.total.toLocaleString()} (${m.count} payment${m.count === 1 ? '' : 's'})`}>
            <div
              className={`w-full max-w-[44px] rounded-t-lg transition-all ${m.total >= target && m.total > 0 ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-900'}`}
              style={{ height: `${Math.max((m.total / max) * H, m.total > 0 ? 4 : 0)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {months.map((m) => (
          <p key={m.key} className="flex-1 text-center text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
        ))}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const Progress = () => {
  const { debts, plan, payments } = useDebt()

  const totalCurrent = useMemo(() => debts.reduce((s, d) => s + Number(d.balance || 0), 0), [debts])
  const achievements = useMemo(() => computeAchievements(debts), [debts])
  const earned = achievements.filter((a) => a.unlocked)

  const streak = paymentStreakWeeks(payments)
  const daysActive = visitDayCount()
  const onSchedule = monthsOnSchedule(payments, plan.monthlyPayment)

  const thisMonth = useMemo(() => {
    const now = new Date()
    const inMonth = payments.filter((p) => {
      const d = new Date(p.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    return { total: totalPaid(inMonth), count: inMonth.length }
  }, [payments])

  if (!debts.length) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your progress lives here.</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">Add your debts and every payment you log becomes a picture worth watching.</p>
        <Link to="/calculator" className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
          Start your journey
        </Link>
      </section>
    )
  }

  const recapTone = thisMonth.total >= plan.monthlyPayment
    ? `You've hit your plan for the month. That's how zero happens.`
    : thisMonth.total > 0
      ? `$${Math.max(0, plan.monthlyPayment - thisMonth.total).toLocaleString()} more matches your plan — you're on your way.`
      : `Nothing logged yet this month. One payment restarts the picture — let's get back on track.`

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">Your progress</h1>
        <Link to="/" className="text-sm font-medium text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300">← Dashboard</Link>
      </div>

      <div className="mt-6 space-y-4">

        <Card title="Balance over time" sub="The line only has one good direction — and it's the one you're on.">
          <BalanceChart payments={payments} totalCurrent={totalCurrent} plan={plan} />
        </Card>

        {/* Streaks — celebration only, never a stick */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className={`text-2xl font-bold ${streak > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{streak}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">week streak</p>
            {streak === 0 && payments.length > 0 && <p className="mt-1 text-[11px] text-slate-400">let's get back on track</p>}
          </div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{daysActive}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">days active</p>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className={`text-2xl font-bold ${onSchedule > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{onSchedule}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">months on plan</p>
          </div>
        </div>

        <Card title="Payment activity" sub="Every green square is a day you paid your future self.">
          <Heatmap payments={payments} />
        </Card>

        <Card title="Monthly payments" sub="Solid green months met your plan.">
          <MonthlyBars payments={payments} target={plan.monthlyPayment} />
        </Card>

        <Card title={`This month`} sub={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">${thisMonth.total.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-400">{thisMonth.count} payment{thisMonth.count === 1 ? '' : 's'} logged · plan calls for ${plan.monthlyPayment.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{recapTone}</p>
        </Card>

        <Card title="Milestones earned" sub={`${earned.length} of ${achievements.length} unlocked`}>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                title={a.description}
                className={`flex flex-col items-center rounded-2xl p-3 text-center ${
                  a.unlocked ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-50 opacity-40 dark:bg-slate-800/40'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${a.unlocked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>
                  {a.unlocked ? '✓' : '·'}
                </span>
                <p className={`mt-2 text-[10px] font-semibold leading-tight ${a.unlocked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {a.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

export default Progress
