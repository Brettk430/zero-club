import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiBase } from '../lib/apiBase.js'

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

const proFeatures = [
  'Unlimited sessions with Miles',
  'Anonymous peer community',
  'What-if scenario analysis',
  'Priority support',
]

const UpgradeCard = ({ user }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === 'true') {
      setUpgraded(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userEmail: user.email, origin: window.location.origin }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Checkout unavailable — Stripe is only active on the deployed app, not locally.')
        setLoading(false)
      }
    } catch (err) {
      setError('Checkout unavailable locally — deploy to Vercel to test Stripe.')
      setLoading(false)
    }
  }

  if (upgraded) {
    return (
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center shadow-sm sm:p-10 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Payment successful!</p>
        <p className="mt-3 text-slate-500 dark:text-slate-400">Your Pro access is activating — usually just a few seconds. Try refreshing.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 rounded-full bg-yellow-400 px-8 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
        >
          Refresh now
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <LockIcon />
      </div>
      <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Pro feature</p>
      <p className="mt-3 text-slate-500 dark:text-slate-400">Try Pro free for 10 days, then $9/month. Cancel anytime.</p>
      <div className="mt-8 inline-block rounded-3xl border border-slate-200 bg-slate-50 px-8 py-6 text-left dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Pro — 10-day free trial · $9/month</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {proFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-yellow-400 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-60"
        >
          {loading ? 'Redirecting to checkout…' : 'Start 10-day free trial'}
        </button>
      </div>
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Signed in as {user.email}</p>
    </div>
  )
}

const TrialSignInGate = ({ feature }) => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email.trim())
    if (err) { setError(err.message); setLoading(false) }
    else setSent(true)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        {sent ? (
          <>
            <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Check your email</p>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              We sent a magic link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>. Click it to create your account and start your trial.
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Start your 10-day free trial</p>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Then $9/month — cancel anytime. Enter your email to create an account instantly. No password needed.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-yellow-400 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {loading ? 'Sending link…' : 'Start 10-day free trial →'}
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Includes {feature}</p>
          </>
        )}
      </div>
    </div>
  )
}

const ProGate = ({ children, feature = 'this feature' }) => {
  const { user, isPro, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
      </div>
    )
  }

  if (isPro) return children
  if (!user) return <TrialSignInGate feature={feature} />
  return <UpgradeCard user={user} />
}

export default ProGate
