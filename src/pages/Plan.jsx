import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import MonthlyCheckin from '../components/MonthlyCheckin.jsx'
import Celebration from '../components/Celebration.jsx'
import { apiBase } from '../lib/apiBase.js'
import { computeAchievements, getNewlyUnlocked } from '../lib/milestones.js'

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

// ─── Miles explainer ─────────────────────────────────────────────────────────

const PlanExplainer = ({ debts, plan, monthlyIncome }) => {
  const [explanation, setExplanation] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [explanation])

  const explain = async () => {
    if (streaming) return
    setExplanation('')
    setDone(false)
    setStreaming(true)
    const target = plan.monthlyAllocation?.[0]
    const question = [
      `Explain my debt payoff plan in plain English — 3 to 5 sentences, conversational tone, no bullet points.`,
      `I have ${debts.length} debt(s): ${debts.map(d => `${d.name} ($${Number(d.balance).toLocaleString()} at ${d.rate}% APR, $${d.minPayment}/mo minimum${d.type === 'mortgage' ? ', mortgage' : ''})`).join('; ')}.`,
      target ? `My current attack target is ${target.name} at ${target.rate}% APR — I'm paying $${target.total.toLocaleString()}/mo there ($${target.minimum} minimum + $${target.extra} extra).` : '',
      `My projected payoff date is ${plan.payoffDate || 'unknown'} and I'll save $${plan.interestSaved.toLocaleString()} in interest versus paying minimums only.`,
      `Explain WHY this split is optimal, what I should focus on this month, and make it feel like advice from a knowledgeable friend — not a textbook.`,
    ].filter(Boolean).join(' ')
    try {
      const res = await fetch(`${apiBase}/api/coach`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, debts, monthlyIncome }),
      })
      if (!res.ok) { setStreaming(false); return }
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
    } catch { /* network error */ }
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
      {!explanation && !streaming && (
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
  const { debts, monthlyIncome, plan } = useDebt()
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

            {/* Progress profile */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Your Journey</p>

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
                      <p className="mt-1 text-sm font-bold text-amber-700 sm:text-base dark:text-amber-400">${plan.interestSaved.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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

            {/* Monthly payment split */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">This month's attack</p>
              <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">Minimums everywhere, extra dollars hit the highest rate first.</p>
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
