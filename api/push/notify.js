import { createClient } from '@supabase/supabase-js'
import { apnsConfigured, sendPush } from '../_lib/apns.js'

// Called by the app straight after it writes a club chat message or a
// milestone post, with that row's id. Everything the notification says, and who
// it goes to, is read back from the database here — the caller only names a
// row it wrote itself, so it can't put words in anyone's mouth or reach anyone
// outside its own clubs.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// An event older than this is not news, and refusing it stops an old id being
// replayed to buzz a club after the fact.
const FRESH_MS = 10 * 60 * 1000
// At most one chat notification per member per club in this window.
const CHAT_QUIET_MS = 5 * 60 * 1000

const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text)

// Members who turned this kind off, or who have blocked the sender, are left
// out; whoever remains is returned with their device tokens.
const reachable = async (recipientIds, senderId, prefColumn) => {
  if (!recipientIds.length) return { ids: [], tokens: [] }
  const [{ data: prefs }, { data: blocks }] = await Promise.all([
    admin.from('notification_prefs').select(`user_id, ${prefColumn}`).in('user_id', recipientIds),
    admin.from('user_blocks').select('blocker_id').eq('blocked_id', senderId).in('blocker_id', recipientIds),
  ])
  const off = new Set([
    ...(prefs || []).filter((p) => p[prefColumn] === false).map((p) => p.user_id),
    ...(blocks || []).map((b) => b.blocker_id),
  ])
  const ids = recipientIds.filter((id) => !off.has(id))
  if (!ids.length) return { ids: [], tokens: [] }
  const { data: tokens } = await admin.from('push_tokens').select('token, user_id').eq('platform', 'ios').in('user_id', ids)
  return { ids, tokens: tokens || [] }
}

// Claims the event so it is sent once: a second request for the same row hits
// the primary key and gets false. Only ever called once the caller is known to
// have written the row, so nobody can use up someone else's notification.
const claim = async (kind, id) => {
  const { error } = await admin.from('push_events').insert({ kind, source_id: id })
  if (!error) return true
  if (error.code === '23505') return false
  throw error
}

const handleOf = async (userId) => {
  const { data } = await admin.from('profiles').select('handle').eq('id', userId).maybeSingle()
  return data?.handle || 'A clubmate'
}

const chat = async (user, id) => {
  const { data: msg } = await admin.from('club_messages')
    .select('id, club_id, user_id, body, created_at').eq('id', id).maybeSingle()
  if (!msg || msg.user_id !== user.id) return { status: 404, error: 'No such message' }
  if (Date.now() - new Date(msg.created_at) > FRESH_MS) return { status: 200, skipped: 'stale' }
  if (!(await claim('chat', msg.id))) return { status: 200, skipped: 'already_sent' }

  const [{ data: club }, { data: members }, handle] = await Promise.all([
    admin.from('clubs').select('name').eq('id', msg.club_id).maybeSingle(),
    admin.from('club_members').select('user_id').eq('club_id', msg.club_id).neq('user_id', user.id),
    handleOf(user.id),
  ])
  let { ids, tokens } = await reachable((members || []).map((m) => m.user_id), user.id, 'chat')

  // Leave out anyone already told about this club in the last few minutes.
  if (ids.length) {
    const since = new Date(Date.now() - CHAT_QUIET_MS).toISOString()
    const { data: recent } = await admin.from('push_chat_throttle')
      .select('user_id').eq('club_id', msg.club_id).gt('sent_at', since).in('user_id', ids)
    const quiet = new Set((recent || []).map((r) => r.user_id))
    tokens = tokens.filter((t) => !quiet.has(t.user_id))
  }
  if (!tokens.length) return { status: 200, sent: 0 }

  const notified = [...new Set(tokens.map((t) => t.user_id))]
  await admin.from('push_chat_throttle').upsert(
    notified.map((userId) => ({ user_id: userId, club_id: msg.club_id, sent_at: new Date().toISOString() })),
  )
  return deliver(tokens, {
    title: club?.name || 'Your club',
    body: clip(`${handle}: ${msg.body}`, 160),
    data: { path: `/clubs/${msg.club_id}?tab=chat` },
  }, { threadId: `club-${msg.club_id}`, collapseId: `chat-${msg.club_id}` })
}

const milestone = async (user, id) => {
  const { data: post } = await admin.from('posts')
    .select('id, user_id, type, payload, created_at').eq('id', id).maybeSingle()
  if (!post || post.user_id !== user.id || post.type !== 'milestone') return { status: 404, error: 'No such milestone' }
  if (Date.now() - new Date(post.created_at) > FRESH_MS) return { status: 200, skipped: 'stale' }
  if (!(await claim('milestone', post.id))) return { status: 200, skipped: 'already_sent' }

  // Everyone who shares a club with the member, once each however many clubs
  // they share.
  const { data: mine } = await admin.from('club_members').select('club_id').eq('user_id', user.id)
  const clubIds = (mine || []).map((m) => m.club_id)
  if (!clubIds.length) return { status: 200, sent: 0 }
  const { data: mates } = await admin.from('club_members').select('user_id').in('club_id', clubIds).neq('user_id', user.id)
  const recipientIds = [...new Set((mates || []).map((m) => m.user_id))]

  const [{ tokens }, handle] = await Promise.all([
    reachable(recipientIds, user.id, 'milestones'),
    handleOf(user.id),
  ])
  if (!tokens.length) return { status: 200, sent: 0 }

  // A lock screen is read by whoever is nearby, so no dollar figure goes on
  // one: "$10,000 Eliminated" becomes a plain milestone, while "Halfway to
  // Zero" says nothing about money and is kept.
  const raw = String(post.payload?.label || '')
  const label = raw && !/\$|\d{3,}/.test(raw) ? clip(raw, 60) : 'A new milestone'
  const emoji = post.payload?.emoji ? `${post.payload.emoji} ` : ''
  return deliver(tokens, {
    title: `${handle} hit a milestone`,
    body: `${emoji}${label}. Send them some love.`,
    data: { path: '/feed' },
  })
}

const deliver = async (tokens, body, options) => {
  const { sent, deadTokens } = await sendPush(tokens.map((t) => t.token), body, options)
  if (deadTokens.length) await admin.from('push_tokens').delete().in('token', deadTokens)
  return { status: 200, sent }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  // Not configured is not an error the app should surface: the message was
  // sent, there is just nobody to tell yet.
  if (!apnsConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ skipped: 'not_configured' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Session expired' })

  const kind = req.body?.kind
  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (!['chat', 'milestone'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Bad request' })
  }

  try {
    const { status, ...result } = kind === 'chat' ? await chat(user, id) : await milestone(user, id)
    return res.status(status).json(result)
  } catch (err) {
    console.error('Push send failed:', err)
    return res.status(500).json({ error: 'Send failed' })
  }
}
