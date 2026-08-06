import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { apiBase } from '../lib/apiBase.js'
import { track } from '../lib/analytics.js'
import { paymentStreakWeeks, totalPaid } from '../lib/payments.js'
import { bufferGoal, hasBuffer } from '../lib/savings.js'

const Coach = () => {
  const { debts, monthlyIncome, method, payments, goals } = useDebt()
  const { user } = useAuth()
  const [progressLogs, setProgressLogs] = useState([])
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hey, I'm Miles — your debt payoff coach. Ask me a what-if question like \"What if I throw an extra $200 at my highest card?\" and I'll run the numbers.",
    },
  ])
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)

  const coachReady = useMemo(() => debts.length > 0, [debts.length])

  // What Miles needs to know about the core loop: payments, streak, buffer.
  const activity = useMemo(() => {
    const now = new Date()
    const thisMonthPaid = payments
      .filter((p) => {
        const d = new Date(p.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((s, p) => s + Number(p.amount), 0)
    const last = payments.length ? new Date(payments[payments.length - 1].date) : null
    const buffer = bufferGoal(goals)
    return {
      paidTotal: totalPaid(payments),
      paymentCount: payments.length,
      streakWeeks: paymentStreakWeeks(payments),
      thisMonthPaid,
      lastPaymentDays: last ? Math.floor((now - last) / 86400000) : null,
      buffer: buffer
        ? { saved: Number(buffer.saved), target: Number(buffer.target), funded: hasBuffer(goals) }
        : null,
    }
  }, [payments, goals])

  useEffect(() => {
    if (!user || !supabase) return
    supabase
      .from('progress_logs')
      .select('logged_month, debt_balances, notes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => data && setProgressLogs(data))
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (userText) => {
    if (!userText || streaming) return
    const history = messages.slice(1) // prior turns, minus the canned welcome
    setQuestion('')
    setMessages((prev) => {
      if (prev.length === 1) track('first_miles_message') // only the welcome message exists
      return [...prev, { role: 'user', text: userText }]
    })
    localStorage.setItem('zc_asked_miles', '1')
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', text: '' }])

    try {
      // Send the session token so usage is counted per account, not per IP
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null
      const response = await fetch(`${apiBase}/api/coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: userText, debts, monthlyIncome, history, progressLogs, method, activity }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }))
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', text: `Sorry, something went wrong: ${err.error || response.statusText}` }
          return updated
        })
        setStreaming(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  text: updated[updated.length - 1].text + parsed.text,
                }
                return updated
              })
            }
            if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', text: `Error: ${parsed.error}` }
                return updated
              })
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', text: `Network error: ${err.message}` }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(question.trim())
  }

  // Arriving from the "Restart with Miles" recovery card: open the
  // conversation for them — the lowest-motivation moment deserves zero friction.
  // Ref guard: state-based guards don't stop StrictMode's double effect run.
  const [searchParams, setSearchParams] = useSearchParams()
  const recoverFiredRef = useRef(false)
  useEffect(() => {
    if (recoverFiredRef.current) return
    if (searchParams.get('recover') !== '1') return
    if (!coachReady || streaming || messages.length > 1) return
    recoverFiredRef.current = true
    setSearchParams({}, { replace: true })
    sendMessage("I fell off my plan for a couple of months and I'm coming back. No guilt trip — just help me restart. What should this week look like?")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, coachReady])

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
      <>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">Miles</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:mt-3 sm:text-base dark:text-slate-400">
                Your accountability coach. Miles focuses on behavior — helping you stay consistent, recover from setbacks, and find extra money to throw at debt.
              </p>
            </div>
            {coachReady
              ? <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 sm:px-4 sm:py-2">Personalized</span>
              : <Link to="/calculator" className="w-fit rounded-full bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 sm:px-4 sm:py-2">Add your debts first →</Link>
            }
          </div>

          <div className="mt-6 max-h-[400px] overflow-y-auto rounded-3xl bg-slate-50 p-4 sm:mt-10 sm:max-h-[480px] sm:p-6 dark:bg-slate-800">
            <div className="space-y-3 sm:space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl p-3 sm:p-4 ${
                    message.role === 'assistant'
                      ? 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      : 'bg-blue-600 text-white dark:bg-blue-700'
                  }`}
                >
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${message.role === 'assistant' ? 'text-slate-500 dark:text-slate-400' : 'text-blue-200'}`}>
                    {message.role === 'assistant' ? 'Miles' : 'You'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm sm:text-base">
                    {message.text}
                    {streaming && index === messages.length - 1 && message.role === 'assistant' && (
                      <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-middle" />
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {coachReady && messages.length <= 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                'What if I pay $300 extra a month?',
                'Can I afford a $400 purchase right now?',
                'Give me one action I can take this week',
                'I had a tough month — help me get back on track',
                'Where am I leaking money?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form className="mt-4 grid gap-3 sm:mt-4 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="coach-question">Ask Miles</label>
            <input
              id="coach-question"
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={streaming}
              placeholder={coachReady ? 'Ask Miles anything about your debt journey…' : 'Add debts first in Calculator'}
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 placeholder:text-slate-400 sm:px-5 sm:py-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={streaming}
              className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-4"
            >
              {streaming ? 'Thinking…' : 'Ask Miles'}
            </button>
          </form>
        </div>
      </>
    </section>
  )
}

export default Coach
