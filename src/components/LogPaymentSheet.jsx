import { useState } from 'react'
import { useZero } from '../context/ZeroContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { money, progressPct as pctOf } from '../lib/zero.js'
import { shareProgress } from '../lib/shareCard.js'
import { postElimination } from '../lib/feed.js'
import AuthModal from './AuthModal.jsx'

// Log, watch the number drop, then be handed something worth posting.

const QUICK = [100, 250, 500, 1000]

const LogPaymentSheet = ({ onClose }) => {
  const { currentDebt, startingDebt, logPayment, handle } = useZero()
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)

  const digits = amount.replace(/[^0-9]/g, '')
  const value = Number(digits) || 0
  const display = digits ? Number(digits).toLocaleString() : ''

  const submit = async (e) => {
    e.preventDefault()
    if (!user) { setNeedsAuth(true); return }
    const result = await logPayment(value)
    if (!result) return
    setDone(result)
    postElimination(user, handle, { amount: result.amount, remaining: result.remaining })
  }

  const share = async () => {
    setSharing(true)
    const outcome = await shareProgress({
      amount: done.amount,
      remaining: done.remaining,
      starting: startingDebt,
      progressPct: pctOf(startingDebt, done.remaining),
    })
    setSharing(false)
    if (outcome === 'downloaded') setShareNote('Saved to your device, caption copied.')
    else if (outcome === 'failed') setShareNote("Couldn't build the card — try again.")
  }

  if (needsAuth) return <AuthModal onClose={() => setNeedsAuth(false)} />

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-slate-950 text-white shadow-2xl sm:max-h-[85vh] sm:rounded-[28px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {done ? (
          <div className="overflow-y-auto px-6 py-9 text-center sm:px-8">
            <p className="text-5xl">🎉</p>
            <p className="mt-5 text-4xl font-black tracking-tight text-emerald-400">−{money(done.amount)}</p>

            <div className="mt-6 flex items-center justify-center gap-3 text-lg font-bold">
              <span className="text-slate-500 line-through">{money(done.remaining + done.amount)}</span>
              <span className="text-slate-600">→</span>
              <span className="text-white">{money(done.remaining)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {pctOf(startingDebt, done.remaining).toFixed(1)}% closer to zero
            </p>

            <button
              onClick={share}
              disabled={sharing}
              className="mt-8 w-full rounded-full bg-emerald-500 py-4 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {sharing ? 'Building your card…' : 'Share it'}
            </button>
            {shareNote && <p className="mt-2 text-xs text-slate-500">{shareNote}</p>}
            <button onClick={onClose} className="mt-3 w-full py-3 text-sm font-semibold text-slate-400 transition hover:text-white">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-6 pt-6 sm:px-8">
              <p className="text-base font-bold">Log a payment</p>
              <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-full p-2 text-slate-500 transition hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-8 sm:px-8">
              <div className="flex items-center justify-center gap-1">
                <span className="text-3xl font-black text-slate-600">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={display}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  aria-label="Payment amount"
                  className="min-w-[2ch] max-w-full bg-transparent text-center text-5xl font-black tracking-tight text-white outline-none placeholder:text-slate-800"
                  style={{ width: `${Math.max(1, display.length || 1)}ch` }}
                />
              </div>

              <div className="mt-8 grid grid-cols-4 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`rounded-full py-2.5 text-xs font-bold transition ${
                      value === q ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    ${q >= 1000 ? `${q / 1000}k` : q}
                  </button>
                ))}
              </div>

              {value > 0 && (
                <p className="mt-6 text-center text-sm text-slate-400">
                  {money(currentDebt)} <span className="text-slate-600">→</span>{' '}
                  <span className="font-bold text-white">{money(Math.max(0, currentDebt - value))}</span>
                </p>
              )}
            </div>

            <div className="border-t border-white/10 px-6 py-4 sm:px-8">
              <button
                type="submit"
                disabled={!value}
                className="w-full rounded-full bg-white py-4 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-slate-200 disabled:opacity-30"
              >
                Eliminate {value > 0 ? money(value) : ''}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default LogPaymentSheet
