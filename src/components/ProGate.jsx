import { useEffect, useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { useAuth } from '../context/AuthContext.jsx'
import { apiBase } from '../lib/apiBase.js'

// Lazy: Stripe.js is only fetched when the checkout modal actually opens,
// not on every page that imports this component.
let stripePromise = null
const getStripe = () => {
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) return null
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  return stripePromise
}

// Reflects what the product actually does today. Nothing here is gated yet —
// founders get everything — but this is the value the paid tier will carry.
const proFeatures = [
  'Unlimited coaching with Miles',
  'Payment logging, streaks & milestones',
  'Progress charts and monthly recaps',
  'Community feed and groups',
  'Rate-cut and what-if scenario tools',
]

const CheckoutModal = ({ user, onClose }) => {
  const stripe = getStripe()
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch(`${apiBase}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, userEmail: user.email, origin: window.location.origin }),
    })
    const data = await res.json()
    return data.clientSecret
  }, [user])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Claim founder access — free</p>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-1">
          {stripe ? (
            <EmbeddedCheckoutProvider stripe={stripe} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="p-6 text-center text-sm text-slate-500">
              Stripe not configured for local development. Deploy to use checkout.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const UpgradeCard = ({ user }) => {
  const [showCheckout, setShowCheckout] = useState(false)
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === 'true') {
      setUpgraded(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (upgraded) {
    return (
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center shadow-sm sm:p-10 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">You're in!</p>
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
    <>
      {showCheckout && <CheckoutModal user={user} onClose={() => setShowCheckout(false)} />}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377 49.78 49.78 0 00-6.093.377.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Founder Access — Free</p>
        <p className="mt-3 text-slate-500 dark:text-slate-400">You're one of the first 100 members. Your first month is completely free — no charge until next month, cancel anytime.</p>

        <div className="mt-8 inline-block rounded-3xl border border-slate-200 bg-slate-50 px-8 py-6 text-left dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Zero Club Pro — Founder Pricing</p>
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
          <button
            onClick={() => setShowCheckout(true)}
            className="mt-6 w-full rounded-full bg-yellow-400 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
          >
            Claim Founder Access — Free →
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Signed in as {user.email}</p>
      </div>
    </>
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
              We sent a magic link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>. Click it to sign in and claim your founder access.
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Claim Founder Access — Free</p>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              You're one of the first 100 members. Your first month is completely free — no charge until next month, cancel anytime.
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
                {loading ? 'Sending link…' : 'Claim Founder Access — Free →'}
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Includes {feature}</p>
          </>
        )}
      </div>
    </div>
  )
}

// Standalone upgrade surface for the Profile page — renders the right step of
// the funnel (sign in → upgrade) and nothing once the user is already Pro.
export const UpgradeSection = () => {
  const { user, isPro, loading } = useAuth()
  if (loading || isPro) return null
  if (!user) return <TrialSignInGate feature="Miles AI coaching and accountability circles" />
  return <UpgradeCard user={user} />
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
