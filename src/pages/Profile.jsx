import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import { myClubs } from '../lib/clubs.js'
import { earnedMilestones, MILESTONES, money, monthLabel } from '../lib/zero.js'
import Avatar from '../components/Avatar.jsx'
import { uploadAvatar, removeOldAvatars } from '../lib/avatars.js'
import Referral from '../components/Referral.jsx'
import DeleteAccount from '../components/DeleteAccount.jsx'

// The Zero profile: one journey, stated plainly, with the badges to show for it.

const Profile = () => {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const {
    startingDebt, currentDebt, goalDate, eliminated, progressPct,
    streakMonths, handle, showAmounts, avatarUrl, payments, updateIdentity, restateBalance, resetJourney,
  } = useZero()

  const [clubs, setClubs] = useState([])
  const [editing, setEditing] = useState(false)
  const [draftHandle, setDraftHandle] = useState(handle)
  const [draftTotal, setDraftTotal] = useState('')
  const [saved, setSaved] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetTotal, setResetTotal] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => { setDraftHandle(handle) }, [handle])
  useEffect(() => {
    if (!user) return
    myClubs(user.id).then((r) => setClubs(r.clubs))
  }, [user])

  const earned = earnedMilestones(startingDebt, currentDebt)
  const earnedIds = new Set(earned.map((m) => m.id))

  const save = async (e) => {
    e.preventDefault()
    const total = Number(draftTotal.replace(/[^0-9]/g, ''))
    await updateIdentity({ handle: draftHandle.trim() })
    if (total > 0) await restateBalance(total)
    setEditing(false)
    setDraftTotal('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so re-picking the same file still fires
    if (!file || !user) return
    setPhotoBusy(true); setPhotoError('')
    const { url, error } = await uploadAvatar(user.id, file)
    if (error) { setPhotoError(error); setPhotoBusy(false); return }
    await updateIdentity({ avatarUrl: url })
    removeOldAvatars(user.id, url) // tidy the bucket; not worth blocking on
    setPhotoBusy(false)
  }

  const clearPhoto = async () => {
    setPhotoBusy(true)
    await updateIdentity({ avatarUrl: '' })
    if (user) removeOldAvatars(user.id, null)
    setPhotoBusy(false)
  }

  const doReset = async (e) => {
    e.preventDefault()
    const total = Number(resetTotal.replace(/[^0-9]/g, ''))
    if (!total) return
    await resetJourney({ total })
    setResetting(false)
    setConfirmReset(false)
    setResetTotal('')
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      {/* Identity + the journey */}
      <div className="rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Zero profile</p>
        <div className="mt-2 flex items-center gap-4">
          <label className="group relative cursor-pointer" title="Change photo">
            <Avatar url={avatarUrl} name={handle} size={64} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-[10px] font-bold uppercase tracking-wide opacity-0 transition group-hover:opacity-100">
              {photoBusy ? '…' : 'Edit'}
            </span>
            <input type="file" accept="image/*" onChange={pickPhoto} disabled={photoBusy} className="sr-only" />
          </label>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl">{handle}</h1>
            {avatarUrl && (
              <button onClick={clearPhoto} disabled={photoBusy} className="mt-1 text-xs font-semibold text-slate-500 underline underline-offset-4 transition hover:text-slate-300">
                Remove photo
              </button>
            )}
          </div>
        </div>
        {photoError && <p className="mt-2 text-xs text-red-400">{photoError}</p>}

        {/* What's left, and the distance already covered behind it. Leading with
            the starting figure named a number the member had already beaten and
            never moved as they paid down. */}
        <div className="mt-7 flex items-baseline gap-3">
          <span className="text-2xl font-black tracking-tight text-white">{money(currentDebt)}</span>
          <span className="text-slate-600">→</span>
          <span className="text-2xl font-black tracking-tight text-slate-500">$0</span>
        </div>
        {eliminated > 0 && (
          <p className="mt-1.5 text-sm text-slate-400">
            Started at {money(startingDebt)} — <span className="font-bold text-emerald-400">{money(eliminated)} gone</span>
          </p>
        )}

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-deep-600">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000" style={{ width: `${Math.max(progressPct > 0 ? 2 : 0, progressPct)}%` }} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-y-5 border-t border-white/10 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Complete</p>
            <p className="mt-1 text-lg font-black text-emerald-400">{progressPct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Eliminated</p>
            <p className="mt-1 text-lg font-black">{showAmounts ? money(eliminated) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Streak</p>
            <p className="mt-1 text-lg font-black">{streakMonths > 0 ? `🔥 ${streakMonths}mo` : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Goal</p>
            <p className="mt-1 text-lg font-black">{monthLabel(goalDate) ?? '—'}</p>
          </div>
        </div>

        {clubs.length > 0 && (
          <p className="mt-5 border-t border-white/10 pt-4 text-sm text-slate-400">
            Club: <Link to="/clubs" className="font-bold text-white underline decoration-slate-600 underline-offset-4">{clubs.map((c) => c.name).join(', ')}</Link>
          </p>
        )}
      </div>

      {/* Badges — everything, so the unearned ones read as a ladder */}
      <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Badges</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{earned.length} / {MILESTONES.length}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MILESTONES.map((m) => {
            const has = earnedIds.has(m.id)
            return (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-3 text-center transition ${
                  has ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                <p className={`text-xl ${has ? '' : 'opacity-30 grayscale'}`}>{m.emoji}</p>
                <p className="mt-1 text-[11px] font-bold leading-tight">{m.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Settings</p>

        {editing ? (
          <form onSubmit={save} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Handle
              <input
                value={draftHandle}
                maxLength={24}
                onChange={(e) => setDraftHandle(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Update what you owe today
              <input
                inputMode="numeric"
                value={draftTotal}
                placeholder={String(Math.round(currentDebt))}
                onChange={(e) => setDraftTotal(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="mt-1 block text-[11px] font-normal leading-4 text-slate-400">
                Interest, a new charge, or a number that was wrong. Your {money(eliminated)} eliminated
                and your badges stay exactly as they are — to clear those, start over below.
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button type="submit" className="flex-[2] rounded-full bg-slate-900 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Save</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-3 w-full rounded-2xl bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200">
            Edit handle or debt total
          </button>
        )}
        {saved && <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Saved.</p>}

        {/* Appearance lives here rather than in the header: it is set once and
            then forgotten, which is not worth a permanent slot in the chrome. */}
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Appearance</p>
          <div className="mt-2.5 flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            {[['dark', 'Dark'], ['light', 'Light']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => { if (theme !== id) toggle() }}
                className={`flex-1 rounded-full py-2.5 transition ${
                  theme === id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy: percentages always show, dollars are the member's call */}
        <label className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <input
            type="checkbox"
            checked={showAmounts}
            onChange={(e) => updateIdentity({ showAmounts: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-emerald-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Show my dollar amounts</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
              Off, your club sees your percentage and badges but never your balances.
            </span>
          </span>
        </label>

        {/* Starting over is deliberately its own act, with its own confirmation:
            it is the only way to clear history, and there is no undo. */}
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {resetting ? (
            <form onSubmit={doReset}>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Start over</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Clears every payment you've logged and every badge you've earned, then restarts
                from the number below. Your club memberships and handle stay.
              </p>
              <label className="mt-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Start from
                <input
                  inputMode="numeric"
                  autoFocus
                  value={resetTotal}
                  placeholder={String(Math.round(currentDebt))}
                  onChange={(e) => { setResetTotal(e.target.value); setConfirmReset(false) }}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              {confirmReset ? (
                <div className="mt-3 rounded-2xl bg-red-50 p-3 dark:bg-red-950/30">
                  <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
                    This erases {payments.length} logged payment{payments.length === 1 ? '' : 's'} and{' '}
                    {earned.length} badge{earned.length === 1 ? '' : 's'}. It can't be undone.
                  </p>
                  <button type="submit" className="mt-2.5 w-full rounded-full bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700">
                    Yes, erase it and start over
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!Number(resetTotal.replace(/[^0-9]/g, ''))}
                  onClick={() => setConfirmReset(true)}
                  className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-30 dark:bg-white dark:text-slate-900"
                >
                  Continue
                </button>
              )}
              <button
                type="button"
                onClick={() => { setResetting(false); setConfirmReset(false); setResetTotal('') }}
                className="mt-2 w-full py-2 text-xs font-semibold text-slate-400 transition hover:text-slate-600"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setResetting(true)}
              className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-red-600 dark:text-slate-400 dark:decoration-slate-600"
            >
              Start over with a new number
            </button>
          )}
        </div>
      </div>

      <div className="mt-3"><Referral /></div>

      <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Account</p>
        <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <button onClick={signOut} className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 dark:text-slate-300">Sign out</button>
          <Link to="/privacy" className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 dark:text-slate-300">Privacy</Link>
        </div>
        <div className="mt-4"><DeleteAccount /></div>
      </div>
    </section>
  )
}

export default Profile
