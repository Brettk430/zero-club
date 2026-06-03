import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { calculateAvalanchePlan, normalizeDebt } from '../lib/debtUtils.js'

const DebtContext = createContext(null)

export const DebtProvider = ({ children }) => {
  const [debts, setDebts] = useState([])
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [maxMonthlyPayment, setMaxMonthlyPayment] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem('zero-club-debts')
    const storedIncome = window.localStorage.getItem('zero-club-income')
    const storedMax = window.localStorage.getItem('zero-club-max-payment')
    if (stored) {
      try {
        setDebts(JSON.parse(stored).map(normalizeDebt))
      } catch (error) {
        console.warn('Failed to parse debt data', error)
      }
    }
    if (storedIncome) setMonthlyIncome(storedIncome)
    if (storedMax) setMaxMonthlyPayment(storedMax)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('zero-club-debts', JSON.stringify(debts))
  }, [debts])

  useEffect(() => {
    window.localStorage.setItem('zero-club-income', monthlyIncome)
  }, [monthlyIncome])

  useEffect(() => {
    window.localStorage.setItem('zero-club-max-payment', maxMonthlyPayment)
  }, [maxMonthlyPayment])

  const plan = useMemo(
    () => calculateAvalanchePlan(debts, monthlyIncome, maxMonthlyPayment),
    [debts, monthlyIncome, maxMonthlyPayment],
  )

  const addDebt = () => {
    const newDebt = { id: crypto.randomUUID(), name: '', balance: 0, rate: 0, minPayment: 0, type: 'debt', homeValue: 0, pmiRate: 0.85 }
    setDebts((prev) => [...prev, newDebt])
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
      value={{ debts, monthlyIncome, setMonthlyIncome, maxMonthlyPayment, setMaxMonthlyPayment, plan, addDebt, updateDebt, removeDebt }}
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
