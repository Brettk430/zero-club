import { supabase } from './supabaseClient.js'

// Reports, blocks and the blocked-terms filter. Apple guideline 1.2 expects all
// three of any app where members post to each other.

export const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'self-harm', label: 'Self-harm or threats' },
  { id: 'spam', label: 'Spam or a scam' },
  { id: 'other', label: 'Something else' },
]

// The database refuses text containing a blocked term and marks the refusal
// 'content_blocked'. Every write path that takes free text runs its error
// through here, so the member reads a sentence rather than an error code.
export const BLOCKED_CONTENT_MESSAGE = "That contains language Zero Club doesn't allow."
const messageOf = (error) => (typeof error === 'string' ? error : error?.message || '')
export const isBlockedContent = (error) => /content_blocked/.test(messageOf(error))
export const friendlyWriteError = (error) =>
  isBlockedContent(error) ? BLOCKED_CONTENT_MESSAGE : messageOf(error) || 'Something went wrong.'

// The server looks up the reported text and its author itself, so all a report
// carries from here is what was reported and why.
export const reportContent = async (kind, targetId, reason, note) => {
  if (!supabase) return { error: 'Not available' }
  const { error } = await supabase.rpc('report_content', {
    kind, target: targetId, reason, note: note?.trim() || null,
  })
  if (!error) return { error: null }
  if (/own_content/.test(error.message)) return { error: "That's yours — you can't report it." }
  if (/not_found/.test(error.message)) return { error: 'That has already been removed.' }
  if (error.code === 'PGRST202') return { error: 'Reporting needs a database update that has not been applied yet.' }
  return { error: 'Could not send the report. Try again.' }
}

export const fetchBlocks = async (userId) => {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('user_blocks').select('blocked_id, blocked_handle, created_at')
    .eq('blocker_id', userId).order('created_at', { ascending: false })
  return error ? [] : data || []
}

export const blockUser = async (userId, blockedId, handle) => {
  if (!supabase || !userId) return { error: 'Not signed in' }
  const { error } = await supabase.from('user_blocks')
    .insert({ blocker_id: userId, blocked_id: blockedId, blocked_handle: handle || null })
  // Already blocked is the outcome that was asked for.
  if (error && error.code !== '23505') return { error: 'Could not block them. Try again.' }
  return { error: null }
}

export const unblockUser = async (userId, blockedId) => {
  if (!supabase || !userId) return { error: 'Not signed in' }
  const { error } = await supabase.from('user_blocks').delete()
    .eq('blocker_id', userId).eq('blocked_id', blockedId)
  return { error: error ? 'Could not unblock them. Try again.' : null }
}
