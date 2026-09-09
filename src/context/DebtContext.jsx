import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { calculatePayoffPlan, comparePlans, normalizeDebt } from '../lib/debtUtils.js'
import { loadPayments, savePayments, makePayment } from '../lib/payments.js'
import { loadGoals, saveGoals, makeGoal } from '../lib/savings.js'
import { clearMemberData, lastUserId, rememberUserId, localDataStamp, setLocalDataStamp } from '../lib/localData.js'
import { loadSeenAchievements, markUnlockedAsSeen } from '../lib/milestones.js'
import { supabase } from '../lib/supabaseClient.js'
import { track } from '../lib/analytics.js'

const DebtContext = createContext(null)

// Initialize state from localStorage synchronously. Loading in an effect is not
// safe here: the save effects below fire on mount with the initial empty values,
// and under StrictMode's double-mount the reload pass reads that back — wiping
// the user's stored debts.
const loadDebts = () => {
  try {
    const stored = window.localStorage.getItem('zero-club-debts')
    return stored ? JSON.parse(stored).map(normalizeDebt) : []
  } catch (error) {
    console.warn('Failed to parse debt data', error)
    return []
  }
}

// Repair plans saved before startingBalance stopped locking on the first
// keystroke. A starting balance can never be lower than what's still owed plus
// everything already paid against it; if it is, it was captured mid-typing.
const repairStartingBalances = (debts, payments) =>
  debts.map((debt) => {
    const paidAgainst = payments
      .filter((p) => p.debtId === debt.id)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const floor = (Number(debt.balance) || 0) + paidAgainst
    return (Number(debt.startingBalance) || 0) < floor
      ? { ...debt, startingBalance: floor }
      : debt
  })

// The comparable shape of a plan. Deliberately excludes the sync timestamp:
// including it would make every payload differ from the last and push forever.
const syncPayload = ({ debts, monthlyIncome, maxMonthlyPayment, method, payments, goals }) =>
  JSON.stringify({
    debts,
    monthlyIncome,
    maxMonthlyPayment,
    method,
    payments: payments.slice(-500), // metadata has size limits
    goals,
    seenAchievements: loadSeenAchievements(),
  })

export const DebtProvider = ({ children }) => {
  const [debts, setDebts] = useState(() => repairStartingBalances(loadDebts(), loadPayments()))
  const [monthlyIncome, setMonthlyIncome] = useState(() => window.localStorage.getItem('zero-club-income') || '')
  const [maxMonthlyPayment, setMaxMonthlyPayment] = useState(() => window.localStorage.getItem('zero-club-max-payment') || '')
  const [method, setMethod] = useState(() => window.localStorage.getItem('zero-club-method') || 'avalanche')
  const [payments, setPayments] = useState(loadPayments)
  const [goals, setGoals] = useState(loadGoals)

  useEffect(() => {
    window.localStorage.setItem('zero-club-debts', JSON.stringify(debts))
  }, [debts])

  useEffect(() => {
    window.localStorage.setItem('zero-club-income', monthlyIncome)
  }, [monthlyIncome])

  useEffect(() => {
    window.localStorage.setItem('zero-club-max-payment', maxMonthlyPayment)
  }, [maxMonthlyPayment])

  useEffect(() => {
    window.localStorage.setItem('zero-club-method', method)
  }, [method])

  useEffect(() => {
    savePayments(payments)
  }, [payments])

  useEffect(() => {
    saveGoals(goals)
  }, [goals])

  // ── Cloud sync ──────────────────────────────────────────────────────────
  // The plan lives in auth user_metadata (zc_data) so it follows the member
  // across devices. Whichever copy was written last wins: every push stamps
  // `updatedAt` and mirrors it into local storage, so on sign-in a device can
  // tell whether the account moved on without it. That comparison — rather
  // than "adopt only when local is empty" — is what lets an iOS home-screen
  // PWA (its own storage container, so always near-empty) pick up the plan the
  // browser built, without a half-finished local copy overwriting the real one.
  const [syncUserId, setSyncUserId] = useState(null)
  const lastPushedRef = useRef(null)

  // The auth listener is registered once, so it needs a live view of state
  // rather than the values captured at mount.
  const stateRef = useRef(null)
  stateRef.current = { debts, payments, goals, monthlyIncome, maxMonthlyPayment, method }

  // Wipe this device's copy of a member's plan (state + storage)
  const resetLocalState = () => {
    clearMemberData()
    lastPushedRef.current = null
    setDebts([])
    setPayments([])
    setGoals([])
    setMonthlyIncome('')
    setMaxMonthlyPayment('')
    setMethod('avalanche')
  }

  // Replace this device's plan with the account's copy.
  const adoptCloudPlan = (cloud) => {
    const cloudPayments = Array.isArray(cloud.payments) ? cloud.payments : []
    setMonthlyIncome(cloud.monthlyIncome || '')
    setMaxMonthlyPayment(cloud.maxMonthlyPayment || '')
    setMethod(cloud.method || 'avalanche')
    setPayments(cloudPayments)
    setGoals(Array.isArray(cloud.goals) ? cloud.goals : [])
    const adopted = repairStartingBalances(cloud.debts.map(normalizeDebt), cloudPayments)
    setDebts(adopted)

    // Milestones already earned are history, not news
    markUnlockedAsSeen(adopted, Array.isArray(cloud.seenAchievements) ? cloud.seenAchievements : [])
    setLocalDataStamp(Number(cloud.updatedAt || Date.now()))
    lastPushedRef.current = syncPayload({
      debts: adopted,
      monthlyIncome: cloud.monthlyIncome || '',
      maxMonthlyPayment: cloud.maxMonthlyPayment || '',
      method: cloud.method || 'avalanche',
      payments: cloudPayments,
      goals: Array.isArray(cloud.goals) ? cloud.goals : [],
    })
  }

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return

      const user = session?.user ?? null
      setSyncUserId(user?.id ?? null)

      // Signing out must not leave balances on the device for the next person
      if (!user) {
        if (event === 'SIGNED_OUT') {
          resetLocalState()
          rememberUserId(null)
        }
        return
      }

      // A different member on this browser: drop the previous plan before
      // adopting theirs, otherwise they inherit it *and* sync it to their account
      const switchedAccounts = lastUserId() && lastUserId() !== user.id
      if (switchedAccounts) resetLocalState()
      rememberUserId(user.id)

      const cloud = user.user_metadata?.zc_data
      if (!cloud || !Array.isArray(cloud.debts) || !cloud.debts.length) return

      const localDebts = switchedAccounts ? [] : (stateRef.current?.debts ?? [])
      const cloudIsNewer = Number(cloud.updatedAt || 0) > localDataStamp()
      if (localDebts.length && !cloudIsNewer) return

      adoptCloudPlan(cloud)
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!supabase || !syncUserId) return
    // Nothing to protect yet — and pushing an empty plan before the account's
    // own copy has been read would wipe it. Once this device has synced once,
    // an empty plan is a real deletion and must travel.
    if (!debts.length && !lastPushedRef.current) return

    const payload = syncPayload({ debts, monthlyIncome, maxMonthlyPayment, method, payments, goals })
    if (payload === lastPushedRef.current) return

    const timer = setTimeout(() => {
      lastPushedRef.current = payload
      const updatedAt = Date.now()
      const zcData = { ...JSON.parse(payload), updatedAt }
      supabase.auth.updateUser({ data: { zc_data: zcData } })
        .then(({ error }) => {
          if (error) lastPushedRef.current = null // retry on next change
          else setLocalDataStamp(updatedAt)
        })
        .catch(() => { lastPushedRef.current = null })
    }, 1500)
    return () => clearTimeout(timer)
  }, [syncUserId, debts, monthlyIncome, maxMonthlyPayment, method, payments, goals])

  const plan = useMemo(
    () => calculatePayoffPlan(debts, monthlyIncome, maxMonthlyPayment, method),
    [debts, monthlyIncome, maxMonthlyPayment, method],
  )

  // Both strategies, for the method chooser on the Plan page
  const planComparison = useMemo(
    () => (debts.length ? comparePlans(debts, monthlyIncome, maxMonthlyPayment) : null),
    [debts, monthlyIncome, maxMonthlyPayment],
  )

  const addDebt = () => {
    const newDebt = { id: crypto.randomUUID(), name: '', balance: 0, rate: 0, minPayment: 0, type: 'debt', homeValue: 0, pmiRate: 0.85 }
    setDebts((prev) => {
      if (prev.length === 0) track('first_debt_added')
      return [...prev, newDebt]
    })
    return newDebt.id
  }

  const updateDebt = (id, updates) => {
    setDebts((prev) => prev.map((debt) => {
      if (debt.id !== id) return debt
      const updated = { ...debt, ...updates }
      // While no payments exist for this debt the starting balance simply
      // follows whatever they type. Locking it on the first keystroke froze
      // it at "7" while someone entered "7000", so progress read $0 forever.
      if (updates.balance !== undefined && !payments.some((p) => p.debtId === id)) {
        updated.startingBalance = Number(updates.balance) || 0
      }
      return updated
    }))
  }

  const removeDebt = (id) => {
    setDebts((prev) => prev.filter((debt) => debt.id !== id))
  }

  const addGoal = ({ name, target, kind }) => {
    const goal = makeGoal({ name, target, kind })
    setGoals((prev) => [...prev, goal])
    track('goal_created')
    return goal
  }

  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id))

  // Contributing to savings is a win too — same shape as logging a payment.
  const contributeToGoal = (goalId, amount) => {
    const value = Number(amount)
    if (!value || value <= 0) return null
    let updated = null
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g
      updated = {
        ...g,
        saved: Math.max(0, Number(g.saved) + value),
        contributions: [...(g.contributions || []), { amount: value, date: new Date().toISOString() }],
      }
      return updated
    }))
    track('goal_contribution')
    return updated
  }

  // The core action: log a payment against a debt. Reduces the balance,
  // records the payment, and returns the payment so callers can celebrate.
  const logPayment = (debtId, amount, note = '') => {
    const value = Number(amount)
    if (!value || value <= 0) return null
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) return null
    const payment = makePayment({ debtId, debtName: debt.name || 'debt', amount: Math.min(value, debt.balance), note })
    setDebts((prev) => prev.map((d) => (
      d.id === debtId ? { ...d, balance: Math.max(0, d.balance - value) } : d
    )))
    setPayments((prev) => [...prev, payment])
    track('payment_logged')
    return payment
  }

  return (
    <DebtContext.Provider
      value={{
        debts, monthlyIncome, setMonthlyIncome, maxMonthlyPayment, setMaxMonthlyPayment,
        method, setMethod, plan, planComparison,
        payments, logPayment,
        goals, addGoal, removeGoal, contributeToGoal,
        addDebt, updateDebt, removeDebt,
      }}
    >
      {children}
    </DebtContext.Provider>
  )
}

export const useDebt = () => {
  const context = useContext(DebtContext)
  if (!context) throw new Error('useDebt must be used within DebtProvider')
  return context
}
