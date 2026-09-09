// The whole product is one number falling to zero. Everything here is in
// service of that: what's left, what's gone, how far along, and the badges
// earned on the way.

export const MILESTONES = [
  { id: 'elim_1k',  kind: 'amount',  at: 1000,   label: '$1,000 Eliminated',  emoji: '🏅' },
  { id: 'pct_10',   kind: 'percent', at: 10,     label: '10% to Zero',        emoji: '🔟' },
  { id: 'elim_5k',  kind: 'amount',  at: 5000,   label: '$5,000 Eliminated',  emoji: '🏅' },
  { id: 'pct_25',   kind: 'percent', at: 25,     label: '25% to Zero',        emoji: '⚡' },
  { id: 'elim_10k', kind: 'amount',  at: 10000,  label: '$10,000 Eliminated', emoji: '🏆' },
  { id: 'pct_50',   kind: 'percent', at: 50,     label: 'Halfway to Zero',    emoji: '🔥' },
  { id: 'elim_25k', kind: 'amount',  at: 25000,  label: '$25,000 Eliminated', emoji: '🏆' },
  { id: 'pct_75',   kind: 'percent', at: 75,     label: '75% to Zero',        emoji: '💪' },
  { id: 'elim_50k', kind: 'amount',  at: 50000,  label: '$50,000 Eliminated', emoji: '👑' },
  { id: 'pct_90',   kind: 'percent', at: 90,     label: '90% to Zero',        emoji: '🚀' },
  { id: 'zero',     kind: 'percent', at: 100,    label: 'ZERO',               emoji: '0️⃣' },
]

export const eliminated = (starting, current) => Math.max(0, Number(starting || 0) - Number(current || 0))

export const progressPct = (starting, current) => {
  const start = Number(starting || 0)
  if (start <= 0) return 0
  return Math.min(100, (eliminated(start, current) / start) * 100)
}

export const earnedMilestones = (starting, current) => {
  const gone = eliminated(starting, current)
  const pct = progressPct(starting, current)
  return MILESTONES.filter((m) => (m.kind === 'amount' ? gone >= m.at : pct >= m.at))
}

export const nextMilestone = (starting, current) => {
  const earned = new Set(earnedMilestones(starting, current).map((m) => m.id))
  return MILESTONES.find((m) => !earned.has(m.id)) ?? null
}

// What's left to do before the next badge, in the units that badge is measured in.
export const distanceToNext = (starting, current) => {
  const next = nextMilestone(starting, current)
  if (!next) return null
  if (next.kind === 'amount') {
    return { milestone: next, amount: Math.max(0, next.at - eliminated(starting, current)) }
  }
  const target = Number(starting || 0) * (next.at / 100)
  return { milestone: next, amount: Math.max(0, target - eliminated(starting, current)) }
}

export const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`

export const monthLabel = (date) => {
  if (!date) return null
  const d = new Date(`${String(date).slice(0, 7)}-01T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Consecutive calendar months ending with this one or last one. Missing the
// current month doesn't break a streak until the month is actually over —
// nobody should watch their streak die on the 2nd.
export const paymentStreakMonths = (payments) => {
  if (!payments?.length) return 0
  const months = new Set(payments.map((p) => String(p.date ?? p.created_at).slice(0, 7)))
  const cursor = new Date()
  cursor.setDate(1)
  const key = (d) => d.toISOString().slice(0, 7)

  if (!months.has(key(cursor))) cursor.setMonth(cursor.getMonth() - 1)

  let streak = 0
  while (months.has(key(cursor))) {
    streak += 1
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return streak
}

export const paidInMonth = (payments, when = new Date()) => {
  const target = when.toISOString().slice(0, 7)
  return (payments || []).reduce((sum, p) => (
    String(p.date ?? p.created_at).slice(0, 7) === target ? sum + (Number(p.amount) || 0) : sum
  ), 0)
}

// Pace against the goal date, so "December 2028" means something month to month.
export const monthlyPaceNeeded = (current, goalDate) => {
  const left = Number(current || 0)
  if (left <= 0 || !goalDate) return null
  const target = new Date(`${String(goalDate).slice(0, 7)}-01T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  if (months <= 0) return null
  return left / months
}
