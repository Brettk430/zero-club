import { supabase } from './supabaseClient.js'

// Every call tolerates the tables not existing yet: before the migration runs,
// clubs simply report as unavailable instead of taking the app down.
const missingTable = (error) => !!error && /relation .* does not exist/i.test(error.message || '')
// PGRST202 is specifically "that function isn't there" — a migration that has
// not been run, not a feature that is switched off. Saying the same thing for
// both sent us looking in the wrong place.
const missingFunction = (error) => error?.code === 'PGRST202'

const notReady = (error) => missingFunction(error)
  ? 'Clubs need a database update that has not been applied yet.'
  : missingTable(error)
    ? 'Clubs are not switched on yet.'
    : null

export const myClubs = async (userId) => {
  if (!supabase || !userId) return { clubs: [], ready: false }
  const { data, error } = await supabase
    .from('club_members')
    .select('role, joined_at, clubs(id, name, invite_code, created_by)')
    .eq('user_id', userId)

  if (error) return { clubs: [], ready: !notReady(error) }
  return {
    ready: true,
    clubs: (data || []).filter((r) => r.clubs).map((r) => ({ ...r.clubs, role: r.role, joinedAt: r.joined_at })),
  }
}

// One call: the club and its founding membership land together, or neither
// does. Doing it as two inserts from here could strand a club with no members,
// which the read policy then makes invisible to everyone including its owner.
export const createClub = async (userId, name) => {
  if (!supabase || !userId) return { error: 'Not signed in' }
  const { data, error } = await supabase.rpc('create_club', { club_name: name.trim() })
  if (error) return { error: notReady(error) ?? error.message }
  return { club: Array.isArray(data) ? data[0] : data }
}

// Clubs are not listable by design, so joining goes through a definer-rights
// function: a wrong code reveals nothing except that it was wrong.
export const joinClub = async (code) => {
  if (!supabase) return { error: 'Not available' }
  const { data, error } = await supabase.rpc('join_club', { code })
  if (error) return { error: notReady(error) ?? error.message }
  if (!data) return { error: "That code doesn't match a club." }
  return { clubId: data }
}

export const leaveClub = async (clubId, userId) => {
  if (!supabase) return
  await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId)
}

export const clubStandings = async (clubId) => {
  if (!supabase || !clubId) return { rows: [], ready: false }
  const { data, error } = await supabase.rpc('club_standings', { club: clubId })
  if (error) return { rows: [], ready: !notReady(error) }
  return {
    ready: true,
    rows: (data || []).map((r) => ({
      userId: r.user_id,
      handle: r.handle,
      displayName: r.display_name,
      progressPct: Number(r.progress_pct) || 0,
      // null when that member keeps their amounts private
      eliminated: r.eliminated === null ? null : Number(r.eliminated),
      currentDebt: r.current_debt === null ? null : Number(r.current_debt),
      monthPaid: r.month_paid === null ? null : Number(r.month_paid),
    })),
  }
}

// What the club has knocked down together. Members who hide their amounts
// still count toward the total; their individual figure just isn't shown.
export const clubTotals = (rows) => {
  const known = rows.filter((r) => r.eliminated !== null)
  return {
    eliminated: known.reduce((sum, r) => sum + r.eliminated, 0),
    remaining: known.reduce((sum, r) => sum + (r.currentDebt || 0), 0),
    monthPaid: known.reduce((sum, r) => sum + (r.monthPaid || 0), 0),
    hiddenCount: rows.length - known.length,
    members: rows.length,
  }
}

// Just the ids, for scoping the feed to a club without pulling everyone's
// balances along with it.
export const clubMemberIds = async (clubId) => {
  if (!supabase || !clubId) return []
  const { data, error } = await supabase.from('club_members').select('user_id').eq('club_id', clubId)
  if (error) return []
  return (data || []).map((r) => r.user_id)
}
