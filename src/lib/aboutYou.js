// Profile personal info lives in Supabase auth user_metadata when signed in
// (follows the user across devices) with localStorage as the guest fallback.

// Birthdays are stored as YYYY-MM-DD; compare month/day only.
export const isBirthdayToday = (birthday) => {
  if (!birthday) return false
  const [, month, day] = birthday.split('-').map(Number)
  const now = new Date()
  return now.getMonth() + 1 === month && now.getDate() === day
}

export const loadAboutYou = (user) => ({
  fullName: user?.user_metadata?.full_name ?? localStorage.getItem('zc_fullname') ?? '',
  username: user?.user_metadata?.username ?? localStorage.getItem('zc_username') ?? '',
  birthday: user?.user_metadata?.birthday ?? localStorage.getItem('zc_birthday') ?? '',
})
