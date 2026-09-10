import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from './Logo.jsx'

// Shown when a reset link brings someone back. Supabase signs them in to do it,
// so this covers the app until a new password is actually chosen — otherwise
// they land on the dashboard with a session and no idea the reset never
// finished.
const PasswordRecovery = () => {
  const { setNewPassword, endRecovery, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const mismatch = confirm.length > 0 && password !== confirm
  const tooShort = password.length > 0 && password.length < 6

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError("Those passwords don't match."); return }
    if (password.length < 6) { setError('Use at least 6 characters.'); return }
    setBusy(true); setError('')
    const { error: err } = await setNewPassword(password)
    setBusy(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  const field = 'w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white outline-none focus:border-emerald-500 placeholder:text-slate-500'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950 px-5">
      <div className="w-full max-w-sm text-center">
        <Logo variant="plain" size={56} className="mx-auto" />
        {done ? (
          <>
            <h1 className="mt-6 text-2xl font-black tracking-tight text-white">Password updated</h1>
            <p className="mt-2 text-sm text-slate-400">You're signed in and ready to go.</p>
            <button onClick={endRecovery} className="mt-8 w-full rounded-full bg-lime py-4 text-sm font-bold text-deep transition hover:bg-[#D9FF7A]">
              Continue
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-black tracking-tight text-white">Choose a new password</h1>
            <p className="mt-2 text-sm text-slate-400">Then you're back in.</p>
            <form onSubmit={submit} className="mt-7 space-y-3 text-left">
              <div className="relative">
                <input type={show ? 'text' : 'password'} required autoFocus value={password}
                       autoComplete="new-password" onChange={(e) => setPassword(e.target.value)}
                       placeholder="New password" className={field} />
                <button type="button" onClick={() => setShow((v) => !v)}
                        aria-label={show ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-xs font-bold text-slate-400">
                  {show ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <input type={show ? 'text' : 'password'} required value={confirm}
                     autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)}
                     placeholder="Confirm new password" className={field} />
              {mismatch && <p className="text-xs font-semibold text-red-400">Those passwords don't match.</p>}
              {tooShort && !mismatch && <p className="text-xs text-slate-500">Use at least 6 characters.</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={busy || mismatch || tooShort}
                      className="w-full rounded-full bg-lime py-4 text-sm font-bold text-deep transition hover:bg-[#D9FF7A] disabled:opacity-40">
                {busy ? 'Saving…' : 'Set password'}
              </button>
            </form>
            <button onClick={async () => { await signOut(); endRecovery() }}
                    className="mt-4 w-full py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-300">
              Cancel and sign out
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default PasswordRecovery
