// Everything on this device that belongs to a specific member.
//
// Financial data must not survive a sign-out: a shared laptop would otherwise
// show the next person the previous member's balances. Worse, because cloud
// data is only adopted when local storage is empty, a second member signing in
// would inherit the first member's plan — and the sync effect would then write
// it into their account.
//
// Deliberately excluded: `zero-club-theme` (a device preference), `zc_ref`
// (who invited them, needed at sign-up), and `zc_onboarded` (clearing it would
// replay onboarding for a returning member; signing in restores their plan).
const MEMBER_KEYS = [
  'zero-club-debts',
  'zero-club-income',
  'zero-club-max-payment',
  'zero-club-method',
  'zc_payments',
  'zc_goals',
  'zc_commitments',
  'zc_username',
  'zc_group',
  'zc_fullname',
  'zc_birthday',
  'zc_goal',
  'zc_seen_achievements',
  'zc_checked_in',
  'zc_asked_miles',
  'zc_visit_days',
]

const TOUR_KEY = 'zc_toured'

export const hasSeenTour = () => {
  try {
    return Boolean(window.localStorage.getItem(TOUR_KEY))
  } catch {
    return true // storage blocked — don't nag
  }
}

export const markTourSeen = () => {
  try { window.localStorage.setItem(TOUR_KEY, '1') } catch { /* ignore */ }
}

export const resetTour = () => {
  try { window.localStorage.removeItem(TOUR_KEY) } catch { /* ignore */ }
}

const LAST_USER_KEY = 'zc_last_user'

export const clearMemberData = () => {
  try {
    MEMBER_KEYS.forEach((k) => window.localStorage.removeItem(k))
  } catch { /* storage unavailable — nothing to clear */ }
}

export const lastUserId = () => {
  try {
    return window.localStorage.getItem(LAST_USER_KEY)
  } catch {
    return null
  }
}

export const rememberUserId = (id) => {
  try {
    if (id) window.localStorage.setItem(LAST_USER_KEY, id)
    else window.localStorage.removeItem(LAST_USER_KEY)
  } catch { /* ignore */ }
}
