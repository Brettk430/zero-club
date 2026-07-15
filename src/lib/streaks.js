// Check-in months are stored as display labels like "June 2026".
// Parse them to timestamps so streaks sort chronologically, not alphabetically.
export const monthValue = (label) => {
  const date = new Date(`1 ${label}`)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

// Consecutive kept check-ins, counting back from the most recent month.
export const keptStreak = (checkIns = []) => {
  const sorted = [...checkIns].sort((a, b) => monthValue(b.month) - monthValue(a.month))
  let count = 0
  for (const entry of sorted) {
    if (entry.kept) count++
    else break
  }
  return count
}
