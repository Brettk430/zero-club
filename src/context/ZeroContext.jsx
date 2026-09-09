import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from './AuthContext.jsx'
import { eliminated, progressPct, paymentStreakMonths } from '../lib/zero.js'
import { track } from '../lib/analytics.js'

const ZeroContext = createContext(null)

const KEYS = {
  starting: 'zc_starting_debt',
  current: 'zc_current_debt',
  goal: 'zc_goal_date',
  payments: 'zc_payments_v2',
  handle: 'zc_username',
  showAmounts: 'zc_show_amounts',
  avatar: 'zc_avatar_url',
}

const read = (key, fallback = '') => {
  try { return window.localStorage.getItem(key) ?? fallback } catch { return fallback }
}
const write = (key, value) => {
  try {
    if (value === null || value === undefined || value === '') window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, String(value))
  } catch { /* storage blocked */ }
}
const readJSON = (key, fallback) => {
  try { return JSON.parse(window.localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

// Anyone who used the avalanche version has their debts itemised. One total is
// the whole model now, so carry them over by summing rather than asking them to
// type it all again.
const migrateFromDebts = () => {
  const debts = readJSON('zero-club-debts', [])
  if (!Array.isArray(debts) || !debts.length) return null
  const current = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const starting = debts.reduce((sum, d) => sum + (Number(d.startingBalance) || Number(d.balance) || 0), 0)
  return { starting: Math.max(starting, current), current }
}

// Nobody has eliminated a negative amount. A device can still be holding the
// half-state an earlier build could produce — a current balance with no
// starting figure — so the pair is reconciled before it is trusted or sent.
const reconcile = (starting, current) => ({
  starting: Math.max(Number(starting) || 0, Number(current) || 0),
  current: Number(current) || 0,
})

const randomHandle = () => {
  const a = ['Steady', 'Calm', 'Bold', 'Relentless', 'Quiet', 'Bright', 'Swift', 'Iron']
  const b = ['Falcon', 'Otter', 'Hawk', 'Wolf', 'Heron', 'Eagle', 'Fox', 'Crane']
  return `${a[Math.floor(Math.random() * a.length)]}${b[Math.floor(Math.random() * b.length)]}${Math.floor(Math.random() * 90) + 10}`
}

export const ZeroProvider = ({ children }) => {
  const { user } = useAuth()

  const [startingDebt, setStartingDebt] = useState(() => {
    const stored = read(KEYS.starting)
    if (stored) return reconcile(stored, read(KEYS.current)).starting
    return migrateFromDebts()?.starting ?? 0
  })
  const [currentDebt, setCurrentDebt] = useState(() => {
    const stored = read(KEYS.current)
    if (stored) return Number(stored)
    return migrateFromDebts()?.current ?? 0
  })
  const [goalDate, setGoalDate] = useState(() => read(KEYS.goal))
  const [payments, setPayments] = useState(() => readJSON(KEYS.payments, []))
  const [handle, setHandle] = useState(() => read(KEYS.handle) || randomHandle())
  const [showAmounts, setShowAmounts] = useState(() => read(KEYS.showAmounts, 'true') !== 'false')
  const [avatarUrl, setAvatarUrl] = useState(() => read(KEYS.avatar) || '')
  const [syncing, setSyncing] = useState(false)
  // Someone arriving cold — an invite link, a shared card — should meet the
  // pitch before a form. Signed-in members without a number skip straight to it.
  const [onboardingRequested, setOnboardingRequested] = useState(false)
  const [onboardingLatched, setOnboardingLatched] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  // Whether we yet know what this account holds. Onboarding must not ask until
  // the answer is in, or a returning member gets asked during the round trip.
  const [profileResolved, setProfileResolved] = useState(false)

  // Set once the backing tables answer. Until the migration is run the app is
  // simply local-only rather than broken.
  const [cloudReady, setCloudReady] = useState(false)
  const cloudReadyRef = useRef(false)
  cloudReadyRef.current = cloudReady

  // Only ever persist a real number. `write` removes the key for a falsy value,
  // so any momentary zero — a slow profile fetch, a failed round trip — would
  // delete the member's journey from this device with no way to get it back.
  // Nothing legitimately sets these to zero: a reset writes the new figure.
  useEffect(() => { if (startingDebt > 0) write(KEYS.starting, startingDebt) }, [startingDebt])
  useEffect(() => { if (startingDebt > 0) write(KEYS.current, currentDebt) }, [currentDebt, startingDebt])
  useEffect(() => { write(KEYS.goal, goalDate) }, [goalDate])
  useEffect(() => { write(KEYS.handle, handle) }, [handle])
  useEffect(() => { write(KEYS.showAmounts, showAmounts) }, [showAmounts])
  useEffect(() => { write(KEYS.avatar, avatarUrl) }, [avatarUrl])
  useEffect(() => {
    try { window.localStorage.setItem(KEYS.payments, JSON.stringify(payments.slice(-500))) } catch { /* ignore */ }
  }, [payments])

  // ── Pull ────────────────────────────────────────────────────────────────
  // Signed in, the account is the truth: it is what club standings read, and
  // the only copy that survives a reinstall, a new phone, or the home-screen
  // app (which gets its own storage container and so always starts empty).
  useEffect(() => {
    if (!supabase || !user) {
      setCloudReady(false)
      setProfileResolved(true) // signed out, this device is the only answer there is
      return
    }
    let cancelled = false
    setSyncing(true)
    setProfileResolved(false)

    const pull = async () => {
      const { data: profile, error } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (cancelled) return

      if (error) {
        // Tables aren't there yet. Local is all there is, and that is a settled
        // answer — not a reason to keep asking.
        setCloudReady(false); setSyncing(false); setProfileResolved(true)
        return
      }
      setCloudReady(true)

      const localStarting = Number(read(KEYS.starting)) || 0
      const cloudStarting = Number(profile?.starting_debt) || 0

      if (profile && cloudStarting > 0) {
        const fixed = reconcile(cloudStarting, profile.current_debt)
        setStartingDebt(fixed.starting)
        setCurrentDebt(fixed.current)
        // A stored row that says otherwise is repaired rather than mirrored
        if (fixed.starting !== cloudStarting) {
          await supabase.from('profiles').update({ starting_debt: fixed.starting }).eq('id', user.id)
        }
        setGoalDate(profile.goal_date || '')
        setHandle(profile.handle)
        setShowAmounts(profile.show_amounts !== false)
        setAvatarUrl(profile.avatar_url || '')
      } else if (profile) {
        // The row exists but carries no number — the state a first sign-in
        // leaves behind. Adopting its zero would wipe the number this device
        // already has and send the member back through onboarding, forever.
        // The device's answer wins, and gets published.
        setHandle(profile.handle)
        setShowAmounts(profile.show_amounts !== false)
        setAvatarUrl(profile.avatar_url || '')
        if (localStarting > 0) {
          const fixed = reconcile(localStarting, Number(read(KEYS.current)) || localStarting)
          await supabase.from('profiles').update({
            starting_debt: fixed.starting,
            current_debt: fixed.current,
            goal_date: read(KEYS.goal) || null,
          }).eq('id', user.id)
        }
      } else {
        const fixed = reconcile(localStarting, Number(read(KEYS.current)) || localStarting)
        await supabase.from('profiles').insert({
          id: user.id,
          handle: read(KEYS.handle) || randomHandle(),
          starting_debt: fixed.starting,
          current_debt: fixed.current,
          goal_date: read(KEYS.goal) || null,
        })
      }

      // Payments follow the same rule: only an account that actually holds a
      // journey gets to replace what this device has.
      if (cloudStarting > 0) {
        const { data: rows } = await supabase
          .from('payments').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: true }).limit(500)
        if (!cancelled && rows) {
          setPayments(rows.map((r) => ({ id: r.id, amount: Number(r.amount), note: r.note, date: r.created_at })))
        }
      }

      if (!cancelled) { setSyncing(false); setProfileResolved(true) }
    }

    pull()
    return () => { cancelled = true }
    // Keyed on the id, not the user object: Supabase hands back a fresh object
    // on every token refresh and metadata write, and re-running the whole pull
    // on each one is what made the number appear to reset in normal use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const pushProfile = useCallback(async (patch) => {
    if (!supabase || !user || !cloudReadyRef.current) return
    await supabase.from('profiles').update(patch).eq('id', user.id)
  }, [user])

  // ── Actions ─────────────────────────────────────────────────────────────
  const setZero = useCallback(async ({ total, goal }) => {
    const amount = Math.max(0, Number(total) || 0)
    setStartingDebt(amount)
    setCurrentDebt(amount)
    setGoalDate(goal || '')
    track('zero_set', { total: amount })
    await pushProfile({ starting_debt: amount, current_debt: amount, goal_date: goal || null })
  }, [pushProfile])

  const logPayment = useCallback(async (amount, note = '') => {
    const value = Number(amount)
    if (!value || value <= 0) return null

    const applied = Math.min(value, currentDebt)
    const next = Math.max(0, currentDebt - value)
    const payment = { id: crypto.randomUUID(), amount: applied, note, date: new Date().toISOString() }

    setCurrentDebt(next)
    setPayments((prev) => [...prev, payment])
    track('payment_logged', { amount: applied })

    if (supabase && user && cloudReadyRef.current) {
      await supabase.from('payments').insert({ id: payment.id, user_id: user.id, amount: applied, note: note || null })
      await pushProfile({ current_debt: next })
    }
    return { ...payment, remaining: next }
  }, [currentDebt, user, pushProfile])

  // A balance can move for reasons that aren't payments: interest, a new
  // charge, or a figure that was simply wrong on day one. Moving `current` on
  // its own would mint progress out of nothing — drop your balance by $2,000
  // to fix a typo and you'd be handed $2,000 "eliminated" and the badges that
  // come with it. So the starting figure moves by the same delta and the
  // eliminated total, which is what badges and club standings read, holds still.
  const restateBalance = useCallback(async (nextCurrent) => {
    const next = Math.max(0, Number(nextCurrent) || 0)
    const delta = next - currentDebt
    const nextStarting = Math.max(next, startingDebt + delta)

    setCurrentDebt(next)
    setStartingDebt(nextStarting)
    track('balance_restated', { delta })
    await pushProfile({ current_debt: next, starting_debt: nextStarting })
  }, [currentDebt, startingDebt, pushProfile])

  // Starting over is its own act, and a destructive one: history and badges go
  // with it. Kept separate from restating precisely so neither can happen by
  // accident while someone meant the other.
  const resetJourney = useCallback(async ({ total, goal }) => {
    const amount = Math.max(0, Number(total) || 0)
    setStartingDebt(amount)
    setCurrentDebt(amount)
    setPayments([])
    if (goal !== undefined) setGoalDate(goal || '')
    track('journey_reset')

    if (supabase && user && cloudReadyRef.current) {
      await supabase.from('payments').delete().eq('user_id', user.id)
      await pushProfile({
        starting_debt: amount,
        current_debt: amount,
        ...(goal !== undefined ? { goal_date: goal || null } : {}),
      })
    }
  }, [user, pushProfile])

  const setGoal = useCallback(async (date) => {
    setGoalDate(date || '')
    await pushProfile({ goal_date: date || null })
  }, [pushProfile])

  const updateIdentity = useCallback(async ({ handle: nextHandle, showAmounts: nextShow, avatarUrl: nextAvatar }) => {
    const patch = {}
    if (nextHandle !== undefined) { setHandle(nextHandle); patch.handle = nextHandle }
    if (nextShow !== undefined) { setShowAmounts(nextShow); patch.show_amounts = nextShow }
    if (nextAvatar !== undefined) { setAvatarUrl(nextAvatar); patch.avatar_url = nextAvatar || null }
    await pushProfile(patch)
  }, [pushProfile])

  const hasZero = startingDebt > 0

  // Latched deliberately. Onboarding saves the number at the end of step two so
  // it survives the OAuth redirect, which immediately makes `needsOnboarding`
  // false — without the latch the flow would tear itself down one screen early
  // and swallow the welcome. Only finishing it closes it.
  const needsOnboarding = !hasZero && profileResolved && (onboardingRequested || Boolean(user))
  const onboardingOpen = onboardingLatched && !onboardingDismissed

  useEffect(() => {
    if (needsOnboarding) setOnboardingLatched(true)
  }, [needsOnboarding])

  const value = {
    startingDebt, currentDebt, goalDate, payments, handle, showAmounts, avatarUrl,
    hasZero, cloudReady, syncing, profileResolved,
    onboardingOpen,
    openOnboarding: () => setOnboardingRequested(true),
    closeOnboarding: () => setOnboardingRequested(false),
    eliminated: eliminated(startingDebt, currentDebt),
    progressPct: progressPct(startingDebt, currentDebt),
    streakMonths: paymentStreakMonths(payments),
    setZero, logPayment, restateBalance, resetJourney, setGoal, updateIdentity,
  }

  return <ZeroContext.Provider value={value}>{children}</ZeroContext.Provider>
}

export const useZero = () => {
  const context = useContext(ZeroContext)
  if (!context) throw new Error('useZero must be used within ZeroProvider')
  return context
}
