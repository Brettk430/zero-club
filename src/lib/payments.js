// Payments are the atom of Zero Club — the thing users log, the thing the
// feed will celebrate, the thing streaks count. Stored locally and mirrored
// to cloud metadata via DebtContext's zc_data sync.

const STORAGE_KEY = 'zc_payments'

export const loadPayments = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export const savePayments = (payments) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payments))
}

export const makePayment = ({ debtId, debtName, amount, note = '' }) => ({
  id: crypto.randomUUID(),
  debtId,
  debtName,
  amount: Number(amount),
  note,
  date: new Date().toISOString(),
})

export const totalPaid = (payments) =>
  payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

// ISO week key ("2026-W31") so streaks count calendar weeks with >= 1 payment
const weekKey = (date) => {
  const d = new Date(date)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

// Consecutive weeks with at least one payment, counting back from this week
// (or last week, so a streak isn't "broken" before the current week is over).
export const paymentStreakWeeks = (payments) => {
  if (!payments.length) return 0
  const weeks = new Set(payments.map((p) => weekKey(p.date)))
  let streak = 0
  const cursor = new Date()
  if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7)
  while (weeks.has(weekKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

// A different line every day — deterministic so it doesn't change on reload.
const MOTIVATION = [
  'Every payment is a vote for the person you’re becoming.',
  'The balance doesn’t care about motivation. It cares about payments.',
  'Slow is fine. Stopped is the only failure.',
  'You’re not paying off debt. You’re buying back your future.',
  'Interest never sleeps — but neither does your streak.',
  'The best day to pay was yesterday. The second best is today.',
  'Small payments compound. So does showing up.',
  'One day this number reads $0, and you’ll remember these weeks.',
  'Freedom is built one payment at a time.',
  'Progress over perfection — log the win.',
]

export const todaysMotivation = () => {
  const day = Math.floor(Date.now() / 86400000)
  return MOTIVATION[day % MOTIVATION.length]
}
