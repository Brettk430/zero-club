import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { calculatePayoffPlan, comparePlans, normalizeDebt } from '../lib/debtUtils.js'
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

  return (
    <DebtContext.Provider
      value={{ debts, monthlyIncome, setMonthlyIncome, maxMonthlyPayment, setMaxMonthlyPayment, method, setMethod, plan, planComparison, addDebt, updateDebt, removeDebt }}
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
