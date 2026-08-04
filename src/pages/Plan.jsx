import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import MonthlyCheckin from '../components/MonthlyCheckin.jsx'
import Celebration from '../components/Celebration.jsx'
import { apiBase } from '../lib/apiBase.js'
import { computeAchievements, getNewlyUnlocked } from '../lib/milestones.js'
import { monthValue } from '../lib/streaks.js'
import { calculatePayoffPlan, simulateTransfer } from '../lib/debtUtils.js'
import { supabase } from '../lib/supabaseClient.js'

const debtColors = ['bg-blue-500', 'bg-sky-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-teal-400']

// ─── Progress ring ────────────────────────────────────────────────────────────

const ProgressRing = ({ pct }) => {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative mx-auto h-36 w-36 sm:h-44 sm:w-44">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          className="stroke-blue-600 dark:stroke-blue-500 transition-all duration-700"
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">{Math.round(pct)}%</p>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">paid off</p>
      </div>
    </div>
  )
}

// ─── Achievement badge ────────────────────────────────────────────────────────

const AchievementBadge = ({ achievement }) => (
  <div className={`flex flex-col items-center rounded-2xl border p-3 text-center transition ${
    achievement.unlocked
      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30'
      : 'border-slate-100 bg-slate-50 opacity-50 dark:border-slate-800 dark:bg-slate-800/30'
  }`}>
    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${achievement.unlocked ? 'bg-yellow-400' : 'bg-slate-200 dark:bg-slate-700'}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${achievement.unlocked ? 'text-slate-900' : 'text-slate-400 dark:text-slate-500'}`}>
        <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377 49.78 49.78 0 00-6.093.377.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
      </svg>
    </div>
    <p className={`mt-2 text-xs font-semibold leading-tight ${achievement.unlocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
      {achievement.label}
    </p>
  </div>
)

// ─── Method chooser ──────────────────────────────────────────────────────────
// Avalanche minimizes interest; snowball front-loads wins. The honest tradeoff
// is shown with the user's real numbers so the choice is theirs.

const MethodChooser = ({ method, setMethod, comparison }) => {
  if (!comparison) return null
  const { avalanche, snowball } = comparison
  const extraCost = Math.max(0, snowball.totalInterest - avalanche.totalInterest)
  const winGap = avalanche.firstDebtPaidMonth && snowball.firstDebtPaidMonth
    ? avalanche.firstDebtPaidMonth - snowball.firstDebtPaidMonth
    : 0
  const identical = extraCost === 0 && winGap === 0

  const options = [
    {
      id: 'avalanche',
      name: 'Avalanche',
      tagline: 'Highest interest rate first',
      stat: `Cheapest path — ${extraCost > 0 ? `saves $${extraCost.toLocaleString()} vs snowball` : 'lowest total interest'}`,
    },
    {
      id: 'snowball',
      name: 'Snowball',
      tagline: 'Smallest balance first',
      stat: winGap > 0
        ? `First debt gone ${winGap} month${winGap === 1 ? '' : 's'} sooner — easier to stick with`
        : 'Early wins build the habit',
    },
  ]

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Your strategy</p>
      <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
        {identical
          ? 'For your debts both methods play out the same — smallest is also highest-rate.'
          : 'Math favors avalanche. Habit-building favors snowball. Both get you to zero — pick the one you’ll stick with.'}
      </p>
      <div className="mt-4 space-y-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMethod(opt.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              method === opt.id
                ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-600 dark:bg-blue-950/30 dark:ring-blue-900'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{opt.name}</p>
              {method === opt.id && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">Active</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{opt.tagline}</p>
            {!identical && <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{opt.stat}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Turbo boost ─────────────────────────────────────────────────────────────
// What an extra monthly payment actually buys — months and dollars.

const TurboBoost = ({ debts, plan, method }) => {
  const [extra, setExtra] = useState(100)
  const boosted = useMemo(
    () => calculatePayoffPlan(debts, 0, plan.monthlyPayment + extra, method),
    [debts, plan.monthlyPayment, extra, method],
  )

  if (!plan.monthsUntilPayoff) return null
  const monthsSooner = Math.max(0, plan.monthsUntilPayoff - boosted.monthsUntilPayoff)
  const interestSaved = Math.max(0, plan.totalInterest - boosted.totalInterest)

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm sm:p-8 dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Turbo boost</p>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">What would a little more each month actually do?</p>
      <div className="mt-4 flex gap-2">
        {[50, 100, 250].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setExtra(amt)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              extra === amt
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-emerald-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            +${amt}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-slate-900">
        {monthsSooner > 0 || interestSaved > 0 ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              An extra <span className="font-bold text-emerald-700 dark:text-emerald-400">${extra}/mo</span> makes you debt-free{' '}
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{monthsSooner} month{monthsSooner === 1 ? '' : 's'} sooner</span>
              {boosted.payoffDate ? ` (${boosted.payoffDate})` : ''}
            </p>
            {interestSaved > 0 && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                …and keeps <span className="font-bold text-emerald-700 dark:text-emerald-400">${interestSaved.toLocaleString()}</span> out of your lenders' pockets.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">You're already close to the fastest possible payoff at this budget.</p>
        )}
      </div>
    </div>
  )
}

// ─── Payoff curve ────────────────────────────────────────────────────────────
// The falling line: projected total balance, month by month, down to zero.

const PayoffChart = ({ plan, totalStarting, totalPaidOff }) => {
  const series = plan.balanceByMonth
  if (!series || series.length < 2 || !plan.monthsUntilPayoff) return null

  const W = 600
  const H = 180
  const PAD = 8
  const max = series[0]
  const x = (i) => PAD + (i / (series.length - 1)) * (W - PAD * 2)
  const y = (v) => PAD + (1 - v / max) * (H - PAD * 2)
  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`

  const payoffEvents = plan.milestones.filter((m) => m.label.endsWith('paid off'))

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">The road to zero</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{plan.payoffDate}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Projected debt balance falling to zero">
        <path d={area} className="fill-blue-100 dark:fill-blue-950/50" />
        <path d={line} fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-blue-600 dark:stroke-blue-400" />
        {payoffEvents.map((m) => (
          <circle key={m.label} cx={x(Math.min(m.month, series.length - 1))} cy={y(series[Math.min(m.month, series.length - 1)])} r="4.5" className="fill-yellow-400 stroke-white stroke-2 dark:stroke-slate-900">
            <title>{`${m.label} — month ${m.month}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Today · ${series[0].toLocaleString()}</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" /> debt eliminated
        </span>
        <span>$0</span>
      </div>
      {totalPaidOff > 0 && totalStarting > 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          You've already knocked out <span className="font-semibold text-emerald-600 dark:text-emerald-400">${totalPaidOff.toLocaleString()}</span> of your original ${totalStarting.toLocaleString()}.
        </p>
      )}
    </div>
  )
}

// ─── Recovery card ───────────────────────────────────────────────────────────
// The moment that decides whether someone reaches zero isn't month 1 — it's
// the month after they disappear. Detect the gap and make restarting one tap.

const RecoveryCard = ({ user }) => {
  const [lastMonth, setLastMonth] = useState(null)
  const [gapMonths, setGapMonths] = useState(0)

  useEffect(() => {
    if (!user || !supabase) return
    supabase.from('progress_logs')
      .select('logged_month, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!data?.length) return
        const last = monthValue(data[0].logged_month)
        if (!last) return
        const now = new Date()
        const gap = (now.getFullYear() - new Date(last).getFullYear()) * 12
          + (now.getMonth() - new Date(last).getMonth())
        if (gap >= 2) {
          setLastMonth(data[0].logged_month)
          setGapMonths(gap)
        }
      })
  }, [user])

  if (!lastMonth) return null

  return (
    <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-8 dark:border-violet-900 dark:bg-violet-950/30">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-400">Welcome back</p>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Your last check-in was <span className="font-semibold">{lastMonth}</span>. Life happened — that's {gapMonths} months out of a multi-year journey, and the plan is still right here.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/coach?recover=1"
          className="flex-1 rounded-full bg-violet-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Restart with Miles →
        </Link>
      </div>
    </div>
  )
}

// ─── Rate cut check ──────────────────────────────────────────────────────────
// Turns "you could balance-transfer that" into a real number: fee added up
// front, 0% for the intro window, offer APR after — versus the current plan.

const RateCutCheck = ({ debts, plan, monthlyIncome, maxMonthlyPayment, method }) => {
  const eligible = useMemo(
    () => debts.filter((d) => Number(d.rate) >= 15 && Number(d.balance) > 0),
    [debts],
  )
  const [targetId, setTargetId] = useState(eligible[0]?.id)
  const [introMonths, setIntroMonths] = useState(15)
  const [feePct, setFeePct] = useState(3)

  const target = eligible.find((d) => d.id === targetId) || eligible[0]
  const result = useMemo(() => {
    if (!target || !plan.monthsUntilPayoff) return null
    return simulateTransfer(debts, target.id, { introMonths, feePct, postApr: target.rate }, monthlyIncome, maxMonthlyPayment, method)
  }, [debts, target, introMonths, feePct, monthlyIncome, maxMonthlyPayment, method, plan.monthsUntilPayoff])

  if (!eligible.length || !result) return null

  const saved = plan.totalInterest - result.totalInterest
  const sooner = plan.monthsUntilPayoff - result.monthsUntilPayoff
  const worthIt = saved > 100

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Rate cut check</p>
      <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
        A 0% balance-transfer card could defuse your high-interest debt. Here's the math with a typical offer:
      </p>

      <div className="mt-4 space-y-3">
        {eligible.length > 1 && (
          <select
            value={target.id}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {eligible.map((d) => (
              <option key={d.id} value={d.id}>{d.name} — ${Number(d.balance).toLocaleString()} at {d.rate}%</option>
            ))}
          </select>
        )}
        <div className="flex gap-2 text-xs">
          <div className="flex-1">
            <p className="mb-1 text-slate-400 dark:text-slate-500">0% intro period</p>
            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {[12, 15, 18, 21].map((m) => (
                <button key={m} type="button" onClick={() => setIntroMonths(m)}
                  className={`flex-1 rounded-full py-1.5 font-medium transition ${introMonths === m ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {m}mo
                </button>
              ))}
            </div>
          </div>
          <div className="w-24">
            <p className="mb-1 text-slate-400 dark:text-slate-500">Fee</p>
            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {[3, 5].map((f) => (
                <button key={f} type="button" onClick={() => setFeePct(f)}
                  className={`flex-1 rounded-full py-1.5 font-medium transition ${feePct === f ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {f}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl p-4 ${worthIt ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
        {worthIt ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Transferring <span className="font-semibold">{target.name}</span> ({introMonths} months at 0%, {feePct}% fee) would save about{' '}
            <span className="font-bold text-emerald-700 dark:text-emerald-400">${saved.toLocaleString()}</span>
            {sooner > 0 && <> and finish <span className="font-bold text-emerald-700 dark:text-emerald-400">{sooner} month{sooner === 1 ? '' : 's'} sooner</span></>}.
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            At these terms a transfer doesn't meaningfully beat your current plan — your attack is already working.
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400 dark:text-slate-500">
        Requires good enough credit to qualify, and only works if the old card stays at $0 after the transfer. Ask Miles if it's right for you.
      </p>
    </div>
  )
}

// ─── Miles explainer ─────────────────────────────────────────────────────────

const PlanExplainer = ({ debts, plan, monthlyIncome }) => {
  const [explanation, setExplanation] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [explanation])

  const explain = async () => {
    if (streaming) return
    setExplanation('')
    setDone(false)
    setError('')
    setStreaming(true)
    const target = plan.monthlyAllocation?.[0]
    const question = [
      `Explain my debt payoff plan in plain English — 3 to 5 sentences, conversational tone, no bullet points.`,
      `I have ${debts.length} debt(s): ${debts.map(d => `${d.name} ($${Number(d.balance).toLocaleString()} at ${d.rate}% APR, $${d.minPayment}/mo minimum${d.type === 'mortgage' ? ', mortgage' : ''})`).join('; ')}.`,
      target ? `My current attack target is ${target.name} at ${target.rate}% APR — I'm paying $${target.total.toLocaleString()}/mo there ($${target.minimum} minimum + $${target.extra} extra).` : '',
      `My projected payoff date is ${plan.payoffDate || 'unknown'}${plan.interestSaved != null ? ` and I'll save $${plan.interestSaved.toLocaleString()} in interest versus paying minimums only` : ` — paying minimums only, I'd never reach zero`}.`,
      `Explain WHY this split is optimal, what I should focus on this month, and make it feel like advice from a knowledgeable friend — not a textbook.`,
    ].filter(Boolean).join(' ')
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null
      const res = await fetch(`${apiBase}/api/coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, debts, monthlyIncome, method: plan.method }),
      })
      if (!res.ok) {
        setError("Miles couldn't connect right now — give it another try in a moment.")
        setStreaming(false)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done: rdone, value } = await reader.read()
        if (rdone) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try { const p = JSON.parse(data); if (p.text) setExplanation((prev) => prev + p.text) } catch { /* skip */ }
        }
      }
      setDone(true)
    } catch {
      setError("Miles couldn't connect right now — give it another try in a moment.")
    }
    finally { setStreaming(false) }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">Miles explains</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Why this split, in plain English</p>
        </div>
        <button type="button" onClick={explain} disabled={streaming}
          className="shrink-0 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/50 dark:text-blue-400">
          {streaming ? 'Thinking…' : done ? 'Refresh' : 'Explain this plan'}
        </button>
      </div>
      {(explanation || streaming) && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {explanation}
          {streaming && <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-middle" />}
          <div ref={bottomRef} />
        </div>
      )}
      {error && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">{error}</p>
      )}
      {!explanation && !streaming && !error && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Tap "Explain this plan" and Miles will walk through exactly why your money is split this way.</p>
      )}
    </div>
  )
}

// ─── Milestone timeline ───────────────────────────────────────────────────────

const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
)

const MilestoneRow = ({ milestone }) => {
  const isPaidOff = milestone.label.includes('paid off')
  const isPmi = milestone.type === 'pmi'
  const isProgress = milestone.label.startsWith('Progress:')
  return (
    <li className="mb-5 ml-6 last:mb-0">
      <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${isPaidOff ? 'bg-blue-500' : isPmi ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'}`}>
        {isPaidOff && <svg viewBox="0 0 8 8" fill="currentColor" className="h-2 w-2 text-white"><path d="M6.41 1.59L3 5l-1.41-1.41L.17 5l2.83 2.83 5-5z" /></svg>}
      </span>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Month {milestone.month}</p>
      <p className={`mt-0.5 text-sm ${isPaidOff ? 'font-semibold text-blue-600 dark:text-blue-400' : isPmi ? 'font-semibold text-amber-600 dark:text-amber-400' : isProgress ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {milestone.label}
      </p>
    </li>
  )
}

const MilestoneTimeline = ({ milestones }) => {
  const byYear = useMemo(() => milestones.reduce((acc, m) => {
    const year = Math.ceil(m.month / 12)
    if (!acc[year]) acc[year] = []
    acc[year].push(m)
    return acc
  }, {}), [milestones])
  const years = useMemo(() => Object.keys(byYear).map(Number).sort((a, b) => a - b), [byYear])
  const [openYears, setOpenYears] = useState(() => new Set([years[0]]))
  const toggle = (year) => setOpenYears((prev) => { const next = new Set(prev); next.has(year) ? next.delete(year) : next.add(year); return next })
  if (!milestones.length) return <p className="mt-4 text-slate-400 dark:text-slate-500">Milestones will appear once your debt details are entered.</p>
  return (
    <div className="mt-6 space-y-2">
      {years.map((year) => {
        const yearMs = byYear[year]
        const isOpen = openYears.has(year)
        const startMonth = (year - 1) * 12 + 1
        const endMonth = yearMs[yearMs.length - 1].month
        const keyEvents = yearMs.filter((m) => m.label.includes('paid off') || m.type === 'pmi')
        const lastProgress = [...yearMs].reverse().find((m) => m.label.startsWith('Progress:'))
        return (
          <div key={year} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <button type="button" onClick={() => toggle(year)} className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Year {year}</p>
                  {keyEvents.map((e, i) => (
                    <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.type === 'pmi' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'}`}>
                      {e.type === 'pmi' ? 'PMI eliminated' : (e.label.split(' paid off')[0] || 'Paid off')}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Month {startMonth}–{endMonth}{lastProgress && <span className="ml-2">· {lastProgress.label}</span>}</p>
              </div>
              <ChevronIcon open={isOpen} />
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-700">
                <ol className="relative ml-3 border-l border-slate-200 dark:border-slate-700">
                  {yearMs.map((milestone, i) => <MilestoneRow key={`${milestone.label}-${i}`} milestone={milestone} />)}
                </ol>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const KeyEventsList = ({ milestones }) => {
  const keyEvents = milestones.filter((m) => m.label.includes('paid off') || m.type === 'pmi')
  if (!keyEvents.length) return <p className="mt-4 text-slate-400 dark:text-slate-500">No key milestones yet — add debts to see your payoff events.</p>
  return (
    <ol className="relative ml-3 mt-6 border-l border-slate-200 dark:border-slate-700">
      {keyEvents.map((milestone, i) => <MilestoneRow key={`key-${i}`} milestone={milestone} />)}
    </ol>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Plan = () => {
  const { debts, monthlyIncome, maxMonthlyPayment, plan, method, setMethod, planComparison } = useDebt()
  const { user } = useAuth()
  const [milestoneView, setMilestoneView] = useState('events')
  const [celebration, setCelebration] = useState(null)

  const totalStarting = useMemo(() =>
    debts.reduce((sum, d) => sum + (Number(d.startingBalance) || Number(d.balance) || 0), 0),
    [debts]
  )
  const totalCurrent = useMemo(() =>
    debts.reduce((sum, d) => sum + Number(d.balance || 0), 0),
    [debts]
  )
  const totalPaidOff = Math.max(0, totalStarting - totalCurrent)
  const pctPaidOff = totalStarting > 0 ? (totalPaidOff / totalStarting) * 100 : 0

  const achievements = useMemo(() => computeAchievements(debts), [debts])

  const streak = useMemo(() => {
    try {
      const commitments = JSON.parse(localStorage.getItem('zc_commitments') || '[]')
      if (!commitments.length) return 0
      const allCheckIns = commitments.flatMap((c) => c.checkIns || [])
      if (!allCheckIns.length) return 0
      const byMonth = {}
      for (const ci of allCheckIns) {
        if (!byMonth[ci.month]) byMonth[ci.month] = []
        byMonth[ci.month].push(ci.kept)
      }
      const months = Object.keys(byMonth).sort((a, b) => monthValue(b) - monthValue(a))
      let count = 0
      for (const m of months) {
        if (byMonth[m].every(Boolean)) count++
        else break
      }
      return count
    } catch { return 0 }
  }, [])

  useEffect(() => {
    if (!debts.length) return
    const newOnes = getNewlyUnlocked(debts)
    if (newOnes.length) setCelebration(newOnes[0])
  }, [debts])

  if (!debts.length) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">Your Journey</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400">Add your debts in the Calculator to start tracking your journey to zero.</p>
          <Link to="/calculator" className="mt-8 inline-flex rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300">
            Start my journey
          </Link>
        </div>
      </section>
    )
  }

  const payoffOrder = plan.payoffOrder

  return (
    <>
      {celebration && <Celebration milestone={celebration} onDone={() => setCelebration(null)} />}

      <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_0.7fr]">

          <div className="flex flex-col gap-4 sm:gap-6">

            {/* Missed check-ins? Make restarting one tap */}
            {user && <RecoveryCard user={user} />}

            {/* Progress profile */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Your Journey</p>
                {streak > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-950/30">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{streak}</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">month streak</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
                <ProgressRing pct={pctPaidOff} />
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3 text-center sm:p-4 dark:bg-slate-800">
                      <p className="text-xs text-slate-400 dark:text-slate-500">Started</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">${totalStarting.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 text-center sm:p-4 dark:bg-slate-800">
                      <p className="text-xs text-slate-400 dark:text-slate-500">Current</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">${totalCurrent.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-center sm:p-4 dark:bg-emerald-950/30">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid off</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700 sm:text-base dark:text-emerald-400">${totalPaidOff.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 sm:p-4 dark:bg-blue-950/30">
                      <p className="text-xs text-blue-600 dark:text-blue-400">Debt-free by</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">{plan.payoffDate || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 sm:p-4 dark:bg-amber-950/30">
                      <p className="text-xs text-amber-600 dark:text-amber-400">Interest saved</p>
                      {plan.interestSaved != null ? (
                        <p className="mt-1 text-sm font-bold text-amber-700 sm:text-base dark:text-amber-400">${plan.interestSaved.toLocaleString()}</p>
                      ) : (
                        <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">Minimums alone would never reach zero</p>
                      )}
                    </div>
                  </div>
                  {plan.paymentTooLow && (
                    <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                      At ${plan.monthlyPayment.toLocaleString()}/mo, your payments don't outpace the interest on these balances. Raise your monthly payment — even a small bump — and the payoff date will appear.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payoff curve */}
            <PayoffChart plan={plan} totalStarting={totalStarting} totalPaidOff={totalPaidOff} />

            {/* Balance-transfer math for high-APR debts */}
            <RateCutCheck debts={debts} plan={plan} monthlyIncome={monthlyIncome} maxMonthlyPayment={maxMonthlyPayment} method={method} />

            {/* Achievements */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">Achievements</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {achievements.filter((a) => a.unlocked).length} of {achievements.length} unlocked
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {achievements.map((a) => <AchievementBadge key={a.id} achievement={a} />)}
              </div>
            </div>

            {/* Debt stack */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Debt breakdown</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Sized by balance · sorted by attack order</p>
              <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                {payoffOrder.map((debt, i) => {
                  const pct = totalCurrent > 0 ? (Number(debt.balance) / totalCurrent) * 100 : 0
                  return <div key={debt.name || i} className={`${debtColors[i % debtColors.length]} transition-all`} style={{ width: `${pct}%` }} title={`${debt.name}: $${Number(debt.balance).toLocaleString()}`} />
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {payoffOrder.map((debt, i) => (
                  <div key={debt.name || i} className="flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${debtColors[i % debtColors.length]}`} />
                    <span className="text-slate-700 dark:text-slate-300">{debt.name || 'Unnamed'}</span>
                    <span className="text-slate-400 dark:text-slate-500">${Number(debt.balance).toLocaleString()}</span>
                    <span className="text-slate-300 dark:text-slate-600">{debt.rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Avalanche timeline */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Payoff timeline</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{milestoneView === 'events' ? 'Key events only' : 'Click a year to expand'}</p>
                </div>
                <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800">
                  {['events', 'all'].map((v) => (
                    <button key={v} type="button" onClick={() => setMilestoneView(v)}
                      className={`rounded-full px-3 py-1.5 transition capitalize ${milestoneView === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                      {v === 'events' ? 'Key events' : 'All months'}
                    </button>
                  ))}
                </div>
              </div>
              {milestoneView === 'events' ? <KeyEventsList milestones={plan.milestones} /> : <MilestoneTimeline milestones={plan.milestones} />}
            </div>

          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4 sm:gap-6 lg:self-start">

            {/* Strategy */}
            <MethodChooser method={method} setMethod={setMethod} comparison={planComparison} />

            {/* Monthly payment split */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">This month's attack</p>
              <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
                Minimums everywhere, extra dollars hit the {method === 'snowball' ? 'smallest balance' : 'highest rate'} first.
              </p>
              <ol className="mt-6 space-y-3">
                {plan.monthlyAllocation.map((item, i) => (
                  <li key={item.id || i} className={`rounded-2xl p-4 ${item.isTarget ? 'border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${debtColors[i % debtColors.length]}`}>{i + 1}</span>
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{item.name || 'Unnamed'}</p>
                          {item.isTarget && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Target</span>}
                        </div>
                        <div className="ml-7 mt-2 space-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                          <p>${item.minimum.toLocaleString()} minimum</p>
                          {item.extra > 0 && <p className="font-medium text-blue-600 dark:text-blue-400">+${item.extra.toLocaleString()} extra</p>}
                        </div>
                      </div>
                      <p className={`shrink-0 text-lg font-bold ${item.isTarget ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>${item.total.toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total per month</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">${plan.monthlyPayment.toLocaleString()}</p>
              </div>
            </div>

            <TurboBoost debts={debts} plan={plan} method={method} />

            <PlanExplainer debts={debts} plan={plan} monthlyIncome={monthlyIncome} />
            {user && <MonthlyCheckin debts={debts} />}

            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Remaining debt</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">${totalCurrent.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{plan.monthsUntilPayoff || '—'} months to zero</p>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}

export default Plan
