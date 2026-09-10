import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { uploadAvatar, removeOldAvatars } from '../lib/avatars.js'
import { money, monthLabel } from '../lib/zero.js'
import Avatar from '../components/Avatar.jsx'
import DeleteAccount from '../components/DeleteAccount.jsx'

// Everything editable, in one place and in order of how often it changes.
// Scattered across the profile, half of it was unreachable: the goal date could
// only ever be set during onboarding, and a display name could not be set at all.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const Section = ({ title, hint, children }) => (
  <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</p>
    {hint && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>}
    <div className="mt-3">{children}</div>
  </div>
)

const field = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white'

const ProfileEdit = () => {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const {
    handle, displayName, avatarUrl, showAmounts, currentDebt, startingDebt,
    goalDate, eliminated, payments,
    updateIdentity, restateBalance, resetJourney, setGoal,
  } = useZero()
  const navigate = useNavigate()

  const [draftHandle, setDraftHandle] = useState(handle)
  const [draftName, setDraftName] = useState(displayName)
  const [draftBalance, setDraftBalance] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [saved, setSaved] = useState('')

  const now = new Date()
  const [month, setMonth] = useState(() => (goalDate ? Number(goalDate.slice(5, 7)) - 1 : now.getMonth()))
  const [year, setYear] = useState(() => (goalDate ? Number(goalDate.slice(0, 4)) : now.getFullYear() + 2))
  const years = useMemo(() => Array.from({ length: 12 }, (_, i) => now.getFullYear() + i), [])

  const [resetting, setResetting] = useState(false)
  const [resetTotal, setResetTotal] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => { setDraftHandle(handle) }, [handle])
  useEffect(() => { setDraftName(displayName) }, [displayName])

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  const saveIdentity = async (e) => {
    e.preventDefault()
    await updateIdentity({ handle: draftHandle.trim(), displayName: draftName })
    flash('Name saved.')
  }

  const saveNumber = async (e) => {
    e.preventDefault()
    const total = Number(draftBalance.replace(/[^0-9]/g, ''))
    if (total > 0) await restateBalance(total)
    await setGoal(`${year}-${String(month + 1).padStart(2, '0')}`)
    setDraftBalance('')
    flash('Updated.')
  }

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setPhotoBusy(true); setPhotoError('')
    const { url, error } = await uploadAvatar(user.id, file)
    if (error) { setPhotoError(error); setPhotoBusy(false); return }
    await updateIdentity({ avatarUrl: url })
    removeOldAvatars(user.id, url)
    setPhotoBusy(false)
  }

  const doReset = async (e) => {
    e.preventDefault()
    const total = Number(resetTotal.replace(/[^0-9]/g, ''))
    if (!total) return
    await resetJourney({ total })
    setResetting(false); setConfirmReset(false); setResetTotal('')
    navigate('/profile')
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <Link to="/profile" className="text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        ← Profile
      </Link>
      <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Edit profile</h1>
      {saved && <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">{saved}</p>}

      <Section title="You" hint="Your handle is how the feed and club standings know you. A display name, if you set one, is shown instead.">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer" title="Change photo">
            <Avatar url={avatarUrl} name={handle} size={64} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-[10px] font-bold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
              {photoBusy ? '…' : 'Edit'}
            </span>
            <input type="file" accept="image/*" onChange={pickPhoto} disabled={photoBusy} className="sr-only" />
          </label>
          {avatarUrl && (
            <button
              onClick={async () => { setPhotoBusy(true); await updateIdentity({ avatarUrl: '' }); if (user) removeOldAvatars(user.id, null); setPhotoBusy(false) }}
              disabled={photoBusy}
              className="text-xs font-semibold text-slate-500 underline underline-offset-4 transition hover:text-red-500"
            >
              Remove photo
            </button>
          )}
        </div>
        {photoError && <p className="mt-2 text-xs text-red-500">{photoError}</p>}

        <form onSubmit={saveIdentity} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Handle
            <input value={draftHandle} maxLength={24} onChange={(e) => setDraftHandle(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Display name <span className="font-normal">(optional)</span>
            <input value={draftName} maxLength={40} placeholder="Leave blank to stay as your handle" onChange={(e) => setDraftName(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <button type="submit" className="w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Save</button>
        </form>
      </Section>

      <Section title="Your number" hint={`Interest, a new charge, or a figure that was wrong. Your ${money(eliminated)} eliminated and your badges stay as they are.`}>
        <form onSubmit={saveNumber} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            What you owe today
            <input inputMode="numeric" value={draftBalance} placeholder={String(Math.round(currentDebt))} onChange={(e) => setDraftBalance(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Reach $0 by {goalDate && <span className="font-normal">(now {monthLabel(goalDate)})</span>}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={field}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={field}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Save</button>
        </form>
      </Section>

      <Section title="Privacy">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={showAmounts} onChange={(e) => updateIdentity({ showAmounts: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 rounded accent-emerald-600" />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Show my dollar amounts</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
              Off, your clubs see your percentage and badges but never your balances.
            </span>
          </span>
        </label>
      </Section>

      <Section title="Appearance">
        <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
          {[['dark', 'Dark'], ['light', 'Light']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { if (theme !== id) toggle() }}
              className={`flex-1 rounded-full py-2.5 transition ${theme === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Account">
        <p className="truncate text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <button onClick={signOut} className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 dark:text-slate-300">Sign out</button>
          <Link to="/privacy" className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 dark:text-slate-300">Privacy</Link>
        </div>
      </Section>

      {/* Destructive things last, and each behind its own confirmation. */}
      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        {resetting ? (
          <form onSubmit={doReset} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Start over</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Clears every payment you've logged and every badge you've earned, then restarts from the number below.
              Your clubs and handle stay.
            </p>
            <input inputMode="numeric" autoFocus value={resetTotal} placeholder={String(Math.round(currentDebt))}
                   onChange={(e) => { setResetTotal(e.target.value); setConfirmReset(false) }} className={`mt-3 ${field}`} />
            {confirmReset ? (
              <div className="mt-3 rounded-2xl bg-red-50 p-3 dark:bg-red-950/30">
                <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
                  This erases {payments.length} logged payment{payments.length === 1 ? '' : 's'}. It can't be undone.
                </p>
                <button type="submit" className="mt-2.5 w-full rounded-full bg-red-600 py-2.5 text-sm font-bold text-white">Yes, erase it</button>
              </div>
            ) : (
              <button type="button" disabled={!Number(resetTotal.replace(/[^0-9]/g, ''))} onClick={() => setConfirmReset(true)}
                      className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-30 dark:bg-white dark:text-slate-900">
                Continue
              </button>
            )}
            <button type="button" onClick={() => { setResetting(false); setConfirmReset(false); setResetTotal('') }}
                    className="mt-2 w-full py-2 text-xs font-semibold text-slate-400">Cancel</button>
          </form>
        ) : (
          <button onClick={() => setResetting(true)} className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-red-600 dark:text-slate-400">
            Start over with a new number
          </button>
        )}
        <div className="mt-5"><DeleteAccount /></div>
      </div>
    </section>
  )
}

export default ProfileEdit
