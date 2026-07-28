import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { loadAboutYou } from '../lib/aboutYou.js'

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

const AboutYou = () => {
  const { user } = useAuth()
  const [form, setForm] = useState(() => loadAboutYou(user))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setSaved(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const username = form.username.trim()
    const fullName = form.fullName.trim()

    // Community reads the username from localStorage; keep everything local too
    // so guests keep their info and signed-in users survive a signed-out visit.
    if (username) localStorage.setItem('zc_username', username)
    if (fullName) localStorage.setItem('zc_fullname', fullName)
    if (form.birthday) localStorage.setItem('zc_birthday', form.birthday)

    if (user && supabase) {
      const { error: err } = await supabase.auth.updateUser({
        data: { full_name: fullName, username, birthday: form.birthday },
      })
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    }

    setSaved(true)
    setSaving(false)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">About you</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Your username is what the community sees. Your name and birthday stay private — we just like to celebrate with you.
      </p>

      <form onSubmit={handleSave} className="mt-5 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</span>
          <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="What should we call you?" maxLength={60} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Community username</span>
          <input type="text" value={form.username} onChange={set('username')} placeholder="e.g. SteadyFalcon22" maxLength={30} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Birthday</span>
          <input type="date" value={form.birthday} onChange={set('birthday')} className={`mt-1 ${inputCls}`} />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-yellow-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>
    </div>
  )
}

export default AboutYou
