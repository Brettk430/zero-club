// Static group catalog — no table needed. Membership lives in user metadata
// (zc_group) with a localStorage mirror, and posts carry the group_id.

export const GROUPS = [
  { id: 'student-loans', name: 'Student Loans', emoji: '🎓', description: 'Degrees paid for twice — never a third time.' },
  { id: 'dave-ramsey', name: 'Dave Ramsey', emoji: '❄️', description: 'Baby steps, gazelle intensity, beans and rice.' },
  { id: 'under-30', name: 'Under 30', emoji: '🚀', description: 'Debt-free before the decade turns.' },
  { id: 'medical-debt', name: 'Medical Debt', emoji: '🩺', description: 'You didn’t choose this debt. You’re choosing the way out.' },
  { id: 'first-home', name: 'First Home', emoji: '🏡', description: 'Clearing the path to a down payment.' },
]

export const groupById = (id) => GROUPS.find((g) => g.id === id) || null

const KEY = 'zc_group'

export const loadGroup = (user) =>
  user?.user_metadata?.zc_group ?? localStorage.getItem(KEY) ?? ''

export const saveGroupLocally = (id) => {
  if (id) localStorage.setItem(KEY, id)
  else localStorage.removeItem(KEY)
}
