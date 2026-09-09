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

const randomHandle = () => {
  const a = ['Steady', 'Calm', 'Bold', 'Relentless', 'Quiet', 'Bright', 'Swift', 'Iron']
  const b = ['Falcon', 'Otter', 'Hawk', 'Wolf', 'Heron', 'Eagle', 'Fox', 'Crane']
  return `${a[Math.floor(Math.random() * a.length)]}${b[Math.floor(Math.random() * b.length)]}${Math.floor(Math.random() * 90) + 10}`
}

export const ZeroProvider = ({ children }) => {
  const { user } = useAuth()

  const [startingDebt, setStartingDebt] = useState(() => {
    const stored = read(KEYS.starting)
    if (stored) return Number(stored)
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
  const [syncing, setSyncing] = useState(false)
  // Someone arriving cold — an invite link, a shared card — should meet the
  // pitch before a form. Signed-in members without a number skip straight to it.
  const [onboardingRequested, setOnboardingRequested] = useState(false)

  // Set once the backing tables answer. Until the migration is run the app is
  // simply local-only rather than broken.
  const [cloudReady, setCloudReady] = useState(false)
  const cloudReadyRef = useRef(false)
  cloudReadyRef.current = cloudReady

  useEffect(() => { write(KEYS.starting, startingDebt || '') }, [startingDebt])
  useEffect(() => { write(KEYS.current, currentDebt || '') }, [currentDebt])
  useEffect(() => { write(KEYS.goal, goalDate) }, [goalDate])
  useEffect(() => { write(KEYS.handle, handle) }, [handle])
  useEffect(() => { write(KEYS.showAmounts, showAmounts) }, [showAmounts])
  useEffect(() => {
    try { window.localStorage.setItem(KEYS.payments, JSON.stringify(payments.slice(-500))) } catch { /* ignore */ }
  }, [payments])

  // ── Pull ────────────────────────────────────────────────────────────────
  // Signed in, the account is the truth: it is what club standings read, and
  // it is the only copy that survives reinstalling or switching devices.
  useEffect(() => {
    if (!supabase || !user) { setCloudReady(false); return }
    let cancelled = false

    const pull = async () => {
      setSyncing(true)
      const { data: profile, error } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()

      if (cancelled) return
      if (error) { setCloudReady(false); setSyncing(false); return } // tables not there yet
      setCloudReady(true)

      if (profile) {
        setStartingDebt(Number(profile.starting_debt) || 0)
        setCurrentDebt(Number(profile.current_debt) || 0)
        setGoalDate(profile.goal_date || '')
        setHandle(profile.handle)
        setShowAmounts(profile.show_amounts !== false)
      } else {
        // First sign-in on the new model: publish what this device knows.
        await supabase.from('profiles').insert({
          id: user.id,
          handle: read(KEYS.handle) || randomHandle(),
          starting_debt: Number(read(KEYS.starting)) || 0,
          current_debt: Number(read(KEYS.current)) || 0,
          goal_date: read(KEYS.goal) || null,
        })
      }

      const { data: rows } = await supabase
        .from('payments').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(500)
      if (!cancelled && rows) {
        setPayments(rows.map((r) => ({ id: r.id, amount: Number(r.amount), note: r.note, date: r.created_at })))
      }
      if (!cancelled) setSyncing(false)
    }

    pull()
    return () => { cancelled = true }
  }, [user])

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

  // The total can move for reasons that are not payments — interest, a new
  // card, a balance that was wrong on day one. Adjusting the current figure
  // without crediting it as progress keeps the eliminated number honest.
  const adjustTotal = useCallback(async ({ current, starting, goal }) => {
    const patch = {}
    if (current !== undefined) { setCurrentDebt(Math.max(0, Number(current) || 0)); patch.current_debt = Math.max(0, Number(current) || 0) }
    if (starting !== undefined) { setStartingDebt(Math.max(0, Number(starting) || 0)); patch.starting_debt = Math.max(0, Number(starting) || 0) }
    if (goal !== undefined) { setGoalDate(goal); patch.goal_date = goal || null }
    await pushProfile(patch)
  }, [pushProfile])

  const updateIdentity = useCallback(async ({ handle: nextHandle, showAmounts: nextShow }) => {
    const patch = {}
    if (nextHandle !== undefined) { setHandle(nextHandle); patch.handle = nextHandle }
    if (nextShow !== undefined) { setShowAmounts(nextShow); patch.show_amounts = nextShow }
    await pushProfile(patch)
  }, [pushProfile])

  const hasZero = startingDebt > 0
  const onboardingOpen = !hasZero && (onboardingRequested || Boolean(user))

  const value = {
    startingDebt, currentDebt, goalDate, payments, handle, showAmounts,
    hasZero, cloudReady, syncing,
    onboardingOpen,
    openOnboarding: () => setOnboardingRequested(true),
    closeOnboarding: () => setOnboardingRequested(false),
    eliminated: eliminated(startingDebt, currentDebt),
    progressPct: progressPct(startingDebt, currentDebt),
    streakMonths: paymentStreakMonths(payments),
    setZero, logPayment, adjustTotal, updateIdentity,
  }

  return <ZeroContext.Provider value={value}>{children}</ZeroContext.Provider>
}

export const useZero = () => {
  const context = useContext(ZeroContext)
  if (!context) throw new Error('useZero must be used within ZeroProvider')
  return context
}
