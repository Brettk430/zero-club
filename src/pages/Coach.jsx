import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebt } from '../context/DebtContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import ProGate from '../components/ProGate.jsx'
import { apiBase } from '../lib/apiBase.js'

const Coach = () => {
  const { debts, monthlyIncome } = useDebt()
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!question.trim() || streaming) return

    const userText = question.trim()
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', text: '' }])

    try {
      const response = await fetch(`${apiBase}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, debts, monthlyIncome }),
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
      <ProGate feature="Miles, Your AI Coach">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">Miles</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:mt-3 sm:text-base dark:text-slate-400">
                Your AI coach. Miles uses your real debt numbers to answer what-if questions and keep your payoff plan on track.
              </p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 ${coachReady ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              {coachReady ? 'Personalized' : 'Waiting for debt data'}
            </span>
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
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${message.role === 'assistant' ? 'text-slate-400 dark:text-slate-500' : 'text-blue-200'}`}>
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

          <form className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="coach-question">Ask a debt question</label>
            <input
              id="coach-question"
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={streaming}
              placeholder={coachReady ? 'e.g. What if I add $200 to my highest card?' : 'Add debts first in Calculator'}
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
      </ProGate>
    </section>
  )
}

export default Coach
