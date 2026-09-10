import { supabase } from './supabaseClient.js'

const missingFunction = (error) => error?.code === 'PGRST202'
const notReady = (error) => missingFunction(error)
  ? 'Member profiles need a database update that has not been applied yet.'
  : null

export const fetchMemberProfile = async (handle) => {
  if (!supabase || !handle) return { profile: null, ready: false }
  const { data, error } = await supabase.rpc('member_profile', { target_handle: handle })
  if (error) return { profile: null, ready: !notReady(error), error: notReady(error) }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { profile: null, ready: true }
  return {
    ready: true,
    profile: {
      userId: row.user_id,
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: row.avatar_url || '',
      progressPct: Number(row.progress_pct) || 0,
      // null when that member keeps their balances private
      eliminated: row.eliminated === null ? null : Number(row.eliminated),
      startingDebt: row.starting_debt === null ? null : Number(row.starting_debt),
      badges: Number(row.badges) || 0,
      streakMonths: Number(row.streak_months) || 0,
      memberSince: row.member_since,
      friendCount: Number(row.friend_count) || 0,
      mutualFriends: Number(row.mutual_friends) || 0,
      clubCount: Number(row.club_count) || 0,
      isSelf: Boolean(row.is_self),
      friendStatus: row.friend_status || 'none',
    },
  }
}

export const fetchMemberClubs = async (handle) => {
  if (!supabase || !handle) return []
  const { data, error } = await supabase.rpc('member_clubs', { target_handle: handle })
  if (error) return []
  return (data || []).map((c) => ({
    id: c.id, name: c.name, category: c.category, memberCount: Number(c.member_count) || 0,
  }))
}

export const fetchBadgeLeaderboard = async (limit = 25) => {
  if (!supabase) return { rows: [], ready: false }
  const { data, error } = await supabase.rpc('badge_leaderboard', { limit_count: limit })
  if (error) return { rows: [], ready: !notReady(error) }
  return {
    ready: true,
    rows: (data || []).map((r) => ({
      userId: r.user_id,
      handle: r.handle,
      avatarUrl: r.avatar_url || '',
      badges: Number(r.badges) || 0,
      progressPct: Number(r.progress_pct) || 0,
      streakMonths: Number(r.streak_months) || 0,
    })),
  }
}

// ── Friends ────────────────────────────────────────────────────────────────
export const requestFriend = async (meId, otherId) => {
  if (!supabase) return { error: 'Not available' }
  const { error } = await supabase.from('friendships').insert({ requester: meId, addressee: otherId })
  return { error: error?.message ?? null }
}

export const acceptFriend = async (meId, requesterId) => {
  if (!supabase) return { error: 'Not available' }
  const { error } = await supabase.from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('requester', requesterId).eq('addressee', meId)
  return { error: error?.message ?? null }
}

// Covers withdrawing a request, declining one, and unfriending — all the same
// row, deleted from whichever end.
export const removeFriend = async (meId, otherId) => {
  if (!supabase) return { error: 'Not available' }
  const { error } = await supabase.from('friendships').delete()
    .or(`and(requester.eq.${meId},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${meId})`)
  return { error: error?.message ?? null }
}

export const incomingRequests = async (meId) => {
  if (!supabase || !meId) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('requester, created_at, profiles!friendships_requester_fkey(handle, avatar_url)')
    .eq('addressee', meId).eq('status', 'pending')
  if (error) return []
  return (data || []).map((r) => ({
    userId: r.requester,
    handle: r.profiles?.handle ?? 'Member',
    avatarUrl: r.profiles?.avatar_url ?? '',
    at: r.created_at,
  }))
}

export const fetchFriends = async () => {
  if (!supabase) return { friends: [], ready: false }
  const { data, error } = await supabase.rpc('my_friends')
  if (error) return { friends: [], ready: !notReady(error) }
  return {
    ready: true,
    friends: (data || []).map((r) => ({
      userId: r.user_id,
      handle: r.handle,
      avatarUrl: r.avatar_url || '',
      progressPct: Number(r.progress_pct) || 0,
      badges: Number(r.badges) || 0,
      since: r.since,
    })),
  }
}

export const fetchPendingRequests = async () => {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('pending_friend_requests')
  if (error) return []
  return (data || []).map((r) => ({
    userId: r.user_id,
    handle: r.handle,
    avatarUrl: r.avatar_url || '',
    at: r.requested_at,
  }))
}
