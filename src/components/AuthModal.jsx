import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

// Raw fetch errors ("Failed to fetch") read as broken code rather than a
// connectivity problem — translate them for humans.
const friendlyError = (message) =>
  /fetch|network|load failed/i.test(message || '')
    ? "Can't reach the server right now. Check your connection and try again in a minute."
    : message

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 01-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0012 24z" />
    <path fill="#FBBC05" d="M5.29 14.29a7.22 7.22 0 010-4.58v-3.1H1.29a12.01 12.01 0 000 10.78l4-3.1z" />
    <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.43A11.98 11.98 0 0012 0 11.99 11.99 0 001.29 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76z" />
  </svg>
)

const AuthModal = ({ onClose }) => {
  const { signIn, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup | magic
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')

    const fn = mode === 'signup' ? signUpWithPassword : signInWithPassword
    const { data, error: err } = await fn(email.trim(), password.trim())

    if (err) {
      setError(friendlyError(err.message))
    } else if (mode === 'signup' && !data?.session) {
      // No session means the project requires email confirmation before sign-in
      setError('')
      setSent(true)
    } else {
      onClose()
    }
    setLoading(false)
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email.trim())
    if (err) setError(friendlyError(err.message))
    else setSent(true)
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">

        {sent ? (
          <>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {mode === 'magic' ? 'Check your email' : 'Confirm your email'}
            </p>
            <p className="mt-3 leading-7 text-slate-500 dark:text-slate-400">
              {mode === 'magic'
                ? <>We sent a magic link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>. Click it to sign in.</>
                : <>We sent a confirmation link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>. Click it to activate your account, then sign in.</>
              }
            </p>
            <button onClick={onClose} className="mt-8 w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Done
            </button>
          </>
        ) : mode === 'magic' ? (
          <>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign in with email link</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">We'll email you a one-time link — no password needed.</p>
            <form onSubmit={handleMagicLink} className="mt-6 space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full bg-yellow-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50">
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
            <button onClick={() => { setMode('signin'); setError('') }} className="mt-4 w-full text-sm text-blue-600 transition hover:text-blue-700 dark:text-blue-400">
              Sign in with password instead
            </button>
            <button onClick={onClose} className="mt-2 w-full rounded-full py-2 text-sm text-slate-400 transition hover:text-slate-600">Cancel</button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={async () => {
                setError('')
                const { error: err } = await signInWithGoogle()
                if (err) setError(friendlyError(err.message))
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">or use email</span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
            </div>

            {/* Tabs */}
            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {[['signin', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === m ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputCls} />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full bg-yellow-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50">
                {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <button onClick={() => { setMode('magic'); setError('') }} className="mt-4 w-full text-sm text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              Use email link instead
            </button>
            <button onClick={onClose} className="mt-1 w-full rounded-full py-2 text-sm text-slate-400 transition hover:text-slate-600">Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthModal
