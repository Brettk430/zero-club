import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { calculatePayoffPlan, comparePlans, normalizeDebt } from '../lib/debtUtils.js'
import { loadPayments, savePayments, makePayment } from '../lib/payments.js'
import { loadGoals, saveGoals, makeGoal } from '../lib/savings.js'
import { clearMemberData, lastUserId, rememberUserId } from '../lib/localData.js'
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

export const DebtProvider = ({ children }) => {
  const [debts, setDebts] = useState(loadDebts)
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
  // The plan lives in auth user_metadata (zc_data) so it follows the user
  // across devices and into the native app. Local storage stays the source
  // of truth on this device: cloud data is only adopted when local is empty,
  // and every local change is pushed (debounced) while signed in.
  const [syncUserId, setSyncUserId] = useState(null)
  const lastPushedRef = useRef(null)

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
      if (!cloud) return
      setDebts((local) => {
        const localEmpty = switchedAccounts || !local.length
        if (!localEmpty || !Array.isArray(cloud.debts) || !cloud.debts.length) return local
        // Adopting cloud state wholesale — mark it as already pushed
        lastPushedRef.current = JSON.stringify(cloud)
        setMonthlyIncome(cloud.monthlyIncome || '')
        setMaxMonthlyPayment(cloud.maxMonthlyPayment || '')
        setMethod(cloud.method || 'avalanche')
        setPayments(Array.isArray(cloud.payments) ? cloud.payments : [])
        setGoals(Array.isArray(cloud.goals) ? cloud.goals : [])
        return cloud.debts.map(normalizeDebt)
      })
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!supabase || !syncUserId || !debts.length) return
    // Metadata has size limits — the most recent payments are plenty for sync
    const zcData = { debts, monthlyIncome, maxMonthlyPayment, method, payments: payments.slice(-500), goals }
    const payload = JSON.stringify(zcData)
    if (payload === lastPushedRef.current) return
    const timer = setTimeout(() => {
      lastPushedRef.current = payload
      supabase.auth.updateUser({ data: { zc_data: zcData } })
        .then(({ error }) => { if (error) lastPushedRef.current = null }) // retry on next change
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
      // Lock in startingBalance the first time a real balance is entered
      if (!updated.startingBalance && updated.balance > 0) {
        updated.startingBalance = updated.balance
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
