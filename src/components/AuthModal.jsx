import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

// Raw fetch errors ("Failed to fetch") read as broken code rather than a
// connectivity problem — translate them for humans.
const friendlyError = (message) => {
  if (/fetch|network|load failed/i.test(message || '')) {
    return "Can't reach the server right now. Check your connection and try again in a minute."
  }
  if (/provider is not enabled|unsupported provider/i.test(message || '')) {
    return 'That sign-in option isn’t switched on yet — use your email and a password for now.'
  }
  if (/invalid login credentials/i.test(message || '')) {
    return "That email and password don't match. Try again, or reset your password below."
  }
  return message
}

const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4.5 w-4.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    {off && <path strokeLinecap="round" d="M3 3l18 18" />}
  </svg>
)

// One field, used for every password on this screen, so revealing works the
// same way wherever you are.
const PasswordField = ({ value, onChange, placeholder, autoComplete, show, onToggle, invalid }) => (
  <div className="relative">
    <input
      type={show ? 'text' : 'password'}
      required
      value={value}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} pr-12 ${invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20' : ''}`}
    />
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
    >
      <EyeIcon off={show} />
    </button>
  </div>
)

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.77c.03 2.86 2.5 3.81 2.53 3.82-.02.07-.4 1.36-1.31 2.7-.79 1.16-1.61 2.31-2.9 2.34-1.27.02-1.68-.75-3.13-.75s-1.9.73-3.1.78c-1.25.04-2.2-1.26-3-2.41-1.62-2.35-2.86-6.64-1.2-9.54.83-1.44 2.3-2.35 3.9-2.37 1.22-.03 2.38.82 3.13.82.75 0 2.16-1.02 3.64-.87.62.03 2.36.25 3.48 1.89-.09.06-2.08 1.21-2.04 3.59M14.68 4.4c.66-.8 1.11-1.92.99-3.03-.95.04-2.11.64-2.8 1.44-.62.71-1.16 1.85-1.02 2.94 1.07.08 2.16-.54 2.83-1.35" />
  </svg>
)

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 01-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0012 24z" />
    <path fill="#FBBC05" d="M5.29 14.29a7.22 7.22 0 010-4.58v-3.1H1.29a12.01 12.01 0 000 10.78l4-3.1z" />
    <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.43A11.98 11.98 0 0012 0 11.99 11.99 0 001.29 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76z" />
  </svg>
)

const AuthModal = ({ onClose }) => {
  const { signIn, signInWithPassword, signUpWithPassword, signInWithGoogle, signInWithApple, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup | magic | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const mismatch = mode === 'signup' && confirm.length > 0 && password !== confirm
  const tooShort = mode === 'signup' && password.length > 0 && password.length < 6

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (mode === 'signup') {
      if (password !== confirm) { setError("Those passwords don't match."); return }
      if (password.length < 6) { setError('Use at least 6 characters.'); return }
    }
    setLoading(true); setError('')

    const fn = mode === 'signup' ? signUpWithPassword : signInWithPassword
    const { data, error: err } = await fn(email.trim(), password.trim())

    if (err) setError(friendlyError(err.message))
    else if (mode === 'signup' && !data?.session) { setError(''); setSent(true) }
    else onClose()
    setLoading(false)
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    const { error: err } = await signIn(email.trim())
    if (err) setError(friendlyError(err.message)) 
    else setSent(true)
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    const { error: err } = await sendPasswordReset(email.trim())
    // Whether the address has an account is not something a stranger should be
    // able to learn by typing it in, so the confirmation is the same either way.
    if (err && !/rate|limit/i.test(err.message)) setError(friendlyError(err.message))
    else setSent(true)
    setLoading(false)
  }

  const switchTo = (next) => { setMode(next); setError(''); setSent(false) }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">

        {sent ? (
          <>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {mode === 'magic' ? 'Check your email' : mode === 'reset' ? 'Check your email' : 'Confirm your email'}
            </p>
            <p className="mt-3 leading-7 text-slate-500 dark:text-slate-400">
              {mode === 'magic'
                ? <>We sent a one-time link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>.</>
                : mode === 'reset'
                  ? <>If <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span> has an account, a reset link is on its way. Open it on this device and you'll be asked to pick a new password.</>
                  : <>We sent a confirmation link to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>. Click it to activate your account, then sign in.</>}
            </p>
            <button onClick={onClose} className="mt-8 w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Done
            </button>
          </>
        ) : mode === 'reset' ? (
          <>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">Reset your password</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">We'll email you a link to set a new one.</p>
            <form onSubmit={handleReset} className="mt-6 space-y-3">
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full bg-lime py-3.5 text-sm font-bold text-deep transition hover:bg-[#D9FF7A] disabled:opacity-50">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <button onClick={() => switchTo('signin')} className="mt-4 w-full text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400">
              Back to sign in
            </button>
          </>
        ) : mode === 'magic' ? (
          <>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">Sign in with an email link</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">We'll email you a one-time link — no password needed.</p>
            <form onSubmit={handleMagicLink} className="mt-6 space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-full bg-lime py-3.5 text-sm font-bold text-deep transition hover:bg-[#D9FF7A] disabled:opacity-50">
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
            <button onClick={() => switchTo('signin')} className="mt-4 w-full text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400">
              Use a password instead
            </button>
          </>
        ) : (
          <>
            {/* Apple first: it is the option that collects least, and on iOS it
                is the one people expect to see at the top. */}
            <button
              type="button"
              onClick={async () => { setError(''); const { error: err } = await signInWithApple(); if (err) setError(friendlyError(err.message)) }}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <AppleIcon />
              Continue with Apple
            </button>

            <button
              type="button"
              onClick={async () => { setError(''); const { error: err } = await signInWithGoogle(); if (err) setError(friendlyError(err.message)) }}
              className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">or use email</span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
            </div>

            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {[['signin', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchTo(m)}
                  className={`flex-1 rounded-full py-2 text-sm font-bold transition ${mode === m ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className={inputCls} />
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="Password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                show={show}
                onToggle={() => setShow((v) => !v)}
                invalid={tooShort}
              />
              {mode === 'signup' && (
                <>
                  <PasswordField
                    value={confirm}
                    onChange={setConfirm}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    show={show}
                    onToggle={() => setShow((v) => !v)}
                    invalid={mismatch}
                  />
                  {mismatch && <p className="text-xs font-semibold text-red-500">Those passwords don't match.</p>}
                  {tooShort && !mismatch && <p className="text-xs text-slate-500 dark:text-slate-400">Use at least 6 characters.</p>}
                </>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || mismatch || tooShort}
                className="w-full rounded-full bg-lime py-3.5 text-sm font-bold text-deep transition hover:bg-[#D9FF7A] disabled:opacity-40"
              >
                {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
              {mode === 'signin' && (
                <button onClick={() => switchTo('reset')} className="font-semibold text-slate-500 underline underline-offset-4 transition hover:text-slate-700 dark:text-slate-400">
                  Forgot your password?
                </button>
              )}
              <button onClick={() => switchTo('magic')} className="font-semibold text-slate-400 underline underline-offset-4 transition hover:text-slate-600 dark:text-slate-500">
                Email me a link instead
              </button>
            </div>
            <button onClick={onClose} className="mt-3 w-full rounded-full py-2 text-sm text-slate-400 transition hover:text-slate-600">Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthModal
