import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { apiBase } from '../lib/apiBase.js'
import { clearMemberData, rememberUserId } from '../lib/localData.js'

// Deliberately understated and at the bottom of the page — findable, never
// alarming. Typing DELETE is the confirmation; this cannot be undone.

const DeleteAccount = () => {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  const handleDelete = async (e) => {
    e.preventDefault()
    if (confirm !== 'DELETE' || busy) return
    setBusy(true)
    setError('')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`${apiBase}/api/account/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not delete the account')
      clearMemberData()
      rememberUserId(null)
      await signOut()
      window.location.href = '/'
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-700 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-200"
        >
          Delete my account
        </button>
      ) : (
        <>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Delete your account</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            This permanently removes your plan, payment history, savings goals, community posts and comments.
            It can't be undone, and we can't recover it for you afterwards.
          </p>
          <form onSubmit={handleDelete} className="mt-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Type <span className="font-bold text-slate-700 dark:text-slate-200">DELETE</span> to confirm
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={confirm !== 'DELETE' || busy}
                className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-40"
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setConfirm(''); setError('') }}
                className="rounded-full px-4 text-sm text-slate-500 dark:text-slate-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

export default DeleteAccount
