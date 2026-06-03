export const MILESTONE_DEFS = [
  { id: 'plan_created',   label: 'Plan Created',        description: 'You built your avalanche plan',         type: 'start' },
  { id: 'paid_1k',        label: 'First $1,000',         description: '$1,000 down. The journey begins.',      type: 'amount',  threshold: 1000 },
  { id: 'paid_5k',        label: '$5,000 Crushed',        description: 'Five thousand reasons to keep going.',  type: 'amount',  threshold: 5000 },
  { id: 'paid_10k',       label: '$10,000 Gone',          description: 'Five figures eliminated.',              type: 'amount',  threshold: 10000 },
  { id: 'pct_10',         label: '10% Paid Off',          description: 'The first 10% is always the hardest.', type: 'percent', threshold: 10 },
  { id: 'pct_25',         label: '25% There',             description: 'A quarter of the way to zero.',        type: 'percent', threshold: 25 },
  { id: 'paid_25k',       label: '$25,000 Eliminated',    description: 'You\'re dismantling this.',            type: 'amount',  threshold: 25000 },
  { id: 'pct_50',         label: 'Halfway to Zero',       description: 'The view from the top of the hill.',  type: 'percent', threshold: 50 },
  { id: 'paid_50k',       label: '$50,000 Defeated',      description: 'Fifty thousand down.',                 type: 'amount',  threshold: 50000 },
  { id: 'pct_75',         label: '75% Free',              description: 'Three quarters done. The end is close.', type: 'percent', threshold: 75 },
  { id: 'pct_90',         label: '90% There',             description: 'Final stretch. Don\'t stop now.',      type: 'percent', threshold: 90 },
  { id: 'zero',           label: 'Zero Club Member',      description: 'You made it. Welcome to the club.',    type: 'percent', threshold: 100 },
]

export const computeAchievements = (debts) => {
  const totalStarting = debts.reduce((sum, d) => sum + (Number(d.startingBalance) || Number(d.balance) || 0), 0)
  const totalCurrent = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const totalPaidOff = Math.max(0, totalStarting - totalCurrent)
  const pctPaidOff = totalStarting > 0 ? (totalPaidOff / totalStarting) * 100 : 0
  const hasPlan = debts.length > 0

  return MILESTONE_DEFS.map((def) => {
    let unlocked = false
    if (def.type === 'start')   unlocked = hasPlan
    if (def.type === 'amount')  unlocked = totalPaidOff >= def.threshold
    if (def.type === 'percent') unlocked = pctPaidOff >= def.threshold
    return { ...def, unlocked, totalPaidOff, pctPaidOff }
  })
}

export const getNewlyUnlocked = (debts) => {
  const achievements = computeAchievements(debts)
  const seenKey = 'zc_seen_achievements'
  const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'))
  const newOnes = achievements.filter((a) => a.unlocked && !seen.has(a.id))
  if (newOnes.length) {
    newOnes.forEach((a) => seen.add(a.id))
    localStorage.setItem(seenKey, JSON.stringify([...seen]))
  }
  return newOnes
}
