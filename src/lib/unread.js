import { supabase } from './supabaseClient.js'

const missing = (error) => error?.code === 'PGRST202'

// Unread counts keyed by club id, plus the total for the nav badge.
export const fetchUnread = async () => {
  if (!supabase) return { byClub: {}, total: 0, ready: false }
  const { data, error } = await supabase.rpc('club_unread')
  if (error) return { byClub: {}, total: 0, ready: !missing(error) }
  const byClub = {}
  let total = 0
  for (const row of data || []) {
    const n = Number(row.unread) || 0
    byClub[row.club_id] = n
    total += n
  }
  return { byClub, total, ready: true }
}

export const markClubRead = async (clubId) => {
  if (!supabase || !clubId) return
  await supabase.rpc('mark_club_read', { club: clubId })
}
