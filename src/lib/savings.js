// Savings goals — in a debt app these compete with payoff, so the app takes a
// position rather than staying neutral: a small starter buffer FIRST (it's what
// stops the next surprise expense from becoming new debt), then attack, then
// bigger goals. This mirrors the advice Miles already gives.

const STORAGE_KEY = 'zc_goals'

export const STARTER_BUFFER = 1000

export const loadGoals = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export const saveGoals = (goals) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

export const makeGoal = ({ name, target, kind = 'custom' }) => ({
  id: crypto.randomUUID(),
  name,
  kind, // 'buffer' | 'custom'
  target: Number(target) || 0,
  saved: 0,
  contributions: [],
  createdAt: new Date().toISOString(),
})

export const SUGGESTED_GOALS = [
  { name: 'Starter emergency fund', target: STARTER_BUFFER, kind: 'buffer', why: 'The one that protects your payoff plan' },
  { name: 'Full emergency fund', target: 0, kind: 'custom', why: '3–6 months of expenses, after the debt is gone' },
  { name: 'Car repairs', target: 1500, kind: 'custom', why: 'The classic plan-wrecker' },
  { name: 'Holidays', target: 800, kind: 'custom', why: 'Budget for it or the card pays for it' },
]

export const goalProgress = (goal) => {
  if (!goal?.target) return 0
  return Math.min(100, (Number(goal.saved) / Number(goal.target)) * 100)
}

export const bufferGoal = (goals) => goals.find((g) => g.kind === 'buffer') || null

// Does the user have a funded safety net? Drives the app's advice about
// whether to prioritise saving or attacking debt.
export const hasBuffer = (goals) => {
  const buffer = bufferGoal(goals)
  return Boolean(buffer && Number(buffer.saved) >= Number(buffer.target) && Number(buffer.target) > 0)
}

export const totalSaved = (goals) =>
  goals.reduce((sum, g) => sum + (Number(g.saved) || 0), 0)
