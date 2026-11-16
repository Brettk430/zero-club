import { createClient } from '@supabase/supabase-js'
import { apnsConfigured, sendPush } from '../_lib/apns.js'

// Called by the app straight after a member does something a friend or
// clubmate would want to hear about, naming the row they just wrote.
// Everything a notification says, and who it goes to, is read back from the
// database here — the caller can only point at something it did itself, so it
// can't put words in anyone's mouth or reach anyone it has no tie to.
//
// What sends, to whom, and how often:
//   chat             a club message      → the rest of the club, once per club per 5 min
//   milestone        a milestone post    → friends and clubmates
//   payment          a payment post      → friends, once per friend per 12 h
//   comment          a feed comment      → the post's author, and earlier commenters
//                                          (once per post per 15 min)
//   reaction         a like or cheer     → the post's author, once per post per 10 min
//   friend_request   a request sent      → the person asked, once per pair ever
//   friend_accepted  a request accepted  → the person who asked
//
// No notification carries a dollar amount: a lock screen is read by whoever is
// nearby. Members who turned a kind off, and anyone on either side of a block,
// are left out.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// An event older than this is not news, and refusing it stops an old row being
// replayed to buzz people after the fact.
const FRESH_MS = 10 * 60 * 1000
const MIN = 60 * 1000

const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text)
const quote = (text) => `“${clip(String(text || ''), 120)}”`
const fresh = (iso) => Boolean(iso) && Date.now() - new Date(iso) <= FRESH_MS
const uniq = (ids) => [...new Set(ids.filter(Boolean))]

// Claims the event so it is sent once: a second request for the same thing
// gets false. Only called once the caller is known to have done the thing, so
// nobody can use up someone else's notification.
const claim = async (kind, key) => {
  const { error } = await admin.from('push_events').insert({ kind, source_id: key })
  if (!error) return true
  if (error.code === '23505') return false
  throw error
}

const nameOf = async (userId) => {
  const { data } = await admin.from('profiles').select('handle, display_name').eq('id', userId).maybeSingle()
  return { name: data?.display_name || data?.handle || 'A member', handle: data?.handle || '' }
}

// Drops anyone who turned this kind off, or who blocked or was blocked by the
// sender.
const willing = async (ids, senderId, pref) => {
  ids = uniq(ids).filter((id) => id !== senderId)
  if (!ids.length) return []
  const [{ data: prefs }, { data: blockedBy }, { data: blocking }] = await Promise.all([
    admin.from('notification_prefs').select(`user_id, ${pref}`).in('user_id', ids),
    admin.from('user_blocks').select('blocker_id').eq('blocked_id', senderId).in('blocker_id', ids),
    admin.from('user_blocks').select('blocked_id').eq('blocker_id', senderId).in('blocked_id', ids),
  ])
  const off = new Set([
    ...(prefs || []).filter((p) => p[pref] === false).map((p) => p.user_id),
    ...(blockedBy || []).map((b) => b.blocker_id),
    ...(blocking || []).map((b) => b.blocked_id),
  ])
  return ids.filter((id) => !off.has(id))
}

// Keeps only recipients not told about `key` within `ms`, and stamps them.
const quiet = async (ids, key, ms) => {
  if (!ids.length) return []
  const since = new Date(Date.now() - ms).toISOString()
  const { data: recent } = await admin.from('push_throttle')
    .select('user_id').eq('key', key).gt('sent_at', since).in('user_id', ids)
  const told = new Set((recent || []).map((r) => r.user_id))
  const allowed = ids.filter((id) => !told.has(id))
  if (allowed.length) {
    const now = new Date().toISOString()
    await admin.from('push_throttle').upsert(allowed.map((user_id) => ({ user_id, key, sent_at: now })))
  }
  return allowed
}

const send = async (ids, message, options) => {
  if (!ids.length) return { status: 200, sent: 0 }
  const { data: tokens } = await admin.from('push_tokens').select('token').eq('platform', 'ios').in('user_id', ids)
  if (!tokens?.length) return { status: 200, sent: 0 }
  const { sent, deadTokens } = await sendPush(tokens.map((t) => t.token), message, options)
  if (deadTokens.length) await admin.from('push_tokens').delete().in('token', deadTokens)
  return { status: 200, sent }
}

const friendsOf = async (userId) => {
  const { data } = await admin.from('friendships').select('requester, addressee')
    .eq('status', 'accepted').or(`requester.eq.${userId},addressee.eq.${userId}`)
  return (data || []).map((f) => (f.requester === userId ? f.addressee : f.requester))
}

const clubmatesOf = async (userId) => {
  const { data: mine } = await admin.from('club_members').select('club_id').eq('user_id', userId)
  const clubIds = (mine || []).map((m) => m.club_id)
  if (!clubIds.length) return []
  const { data } = await admin.from('club_members').select('user_id').in('club_id', clubIds)
  return (data || []).map((m) => m.user_id)
}

const NOT_FOUND = { status: 404, error: 'Nothing to notify about' }
const STALE = { status: 200, skipped: 'stale' }
const DONE = { status: 200, skipped: 'already_sent' }

// ── Each kind ──────────────────────────────────────────────────────────────

const chat = async (me, { id }) => {
  const { data: msg } = await admin.from('club_messages')
    .select('id, club_id, user_id, body, created_at').eq('id', id).maybeSingle()
  if (!msg || msg.user_id !== me) return NOT_FOUND
  if (!fresh(msg.created_at)) return STALE
  if (!(await claim('chat', msg.id))) return DONE

  const [{ data: club }, { data: members }, { name }] = await Promise.all([
    admin.from('clubs').select('name').eq('id', msg.club_id).maybeSingle(),
    admin.from('club_members').select('user_id').eq('club_id', msg.club_id),
    nameOf(me),
  ])
  const ids = await quiet(await willing((members || []).map((m) => m.user_id), me, 'chat'), `chat:${msg.club_id}`, 5 * MIN)
  return send(ids, {
    title: club?.name || 'Your club',
    body: clip(`${name}: ${msg.body}`, 160),
    data: { path: `/clubs/${msg.club_id}?tab=chat` },
  }, { threadId: `club-${msg.club_id}`, collapseId: `chat-${msg.club_id}` })
}

const milestone = async (me, { id }) => {
  const { data: post } = await admin.from('posts')
    .select('id, user_id, type, payload, created_at').eq('id', id).maybeSingle()
  if (!post || post.user_id !== me || post.type !== 'milestone') return NOT_FOUND
  if (!fresh(post.created_at)) return STALE
  if (!(await claim('milestone', post.id))) return DONE

  const [friends, clubmates, { name }] = await Promise.all([friendsOf(me), clubmatesOf(me), nameOf(me)])
  const ids = await willing([...friends, ...clubmates], me, 'milestones')
  // "$10,000 Eliminated" becomes a plain milestone; "Halfway to Zero" says
  // nothing about money and is kept.
  const raw = String(post.payload?.label || '')
  const label = raw && !/\$|\d{3,}/.test(raw) ? clip(raw, 60) : 'A new milestone'
  const emoji = post.payload?.emoji || '🏁'
  return send(ids, {
    title: `${name} hit a milestone`,
    body: `${emoji} ${label}. Go celebrate.`,
    data: { path: '/feed' },
  })
}

const payment = async (me, { id }) => {
  const { data: post } = await admin.from('posts')
    .select('id, user_id, type, payload, created_at').eq('id', id).maybeSingle()
  if (!post || post.user_id !== me || post.type !== 'payment') return NOT_FOUND
  if (!fresh(post.created_at)) return STALE
  if (!(await claim('payment', post.id))) return DONE

  const [friends, { name }] = await Promise.all([friendsOf(me), nameOf(me)])
  const ids = await quiet(await willing(friends, me, 'friend_payments'), `payment:${me}`, 12 * 60 * MIN)
  const pct = Number(post.payload?.progressPct)
  const progress = Number.isFinite(pct) && pct >= 1 ? ` They’re ${Math.floor(pct)}% of the way to zero.` : ''
  return send(ids, {
    title: `${name} just knocked out a payment`,
    body: `Send some love.${progress}`,
    data: { path: '/feed' },
  })
}

const comment = async (me, { id }) => {
  const { data: c } = await admin.from('post_comments')
    .select('id, post_id, user_id, body, created_at').eq('id', id).maybeSingle()
  if (!c || c.user_id !== me) return NOT_FOUND
  if (!fresh(c.created_at)) return STALE
  if (!(await claim('comment', c.id))) return DONE

  const [{ data: post }, { data: earlier }, { name }] = await Promise.all([
    admin.from('posts').select('user_id').eq('id', c.post_id).maybeSingle(),
    admin.from('post_comments').select('user_id').eq('post_id', c.post_id).lt('created_at', c.created_at),
    nameOf(me),
  ])
  const author = post?.user_id
  const thread = { threadId: `post-${c.post_id}` }
  // The author hears about every comment on their own post.
  const toAuthor = author ? await willing([author], me, 'comments') : []
  const a = await send(toAuthor, { title: `${name} commented on your post`, body: quote(c.body), data: { path: '/feed' } }, thread)
  // Everyone else already in the thread hears about replies, but not every one.
  const others = (earlier || []).map((e) => e.user_id).filter((uid) => uid !== author)
  const toThread = await quiet(await willing(others, me, 'comments'), `thread:${c.post_id}`, 15 * MIN)
  const b = await send(toThread, { title: `${name} also commented`, body: quote(c.body), data: { path: '/feed' } }, thread)
  return { status: 200, sent: a.sent + b.sent }
}

const reaction = async (me, { id, reaction: kind }) => {
  if (!['like', 'celebrate'].includes(kind)) return NOT_FOUND
  const { data: r } = await admin.from('post_reactions')
    .select('post_id, created_at').eq('post_id', id).eq('user_id', me).eq('kind', kind).maybeSingle()
  if (!r) return NOT_FOUND
  if (!fresh(r.created_at)) return STALE
  // Keyed without a time: unliking and liking again never re-sends.
  if (!(await claim('reaction', `${id}:${me}:${kind}`))) return DONE

  const [{ data: post }, { name }] = await Promise.all([
    admin.from('posts').select('user_id, type').eq('id', id).maybeSingle(),
    nameOf(me),
  ])
  if (!post) return NOT_FOUND
  const ids = await quiet(await willing([post.user_id], me, 'reactions'), `reactions:${id}`, 10 * MIN)
  const what = post.type === 'milestone' ? 'milestone' : 'payment'
  return send(ids, kind === 'celebrate'
    ? { title: '🎉 Someone’s cheering', body: `${name} celebrated your ${what}.`, data: { path: '/feed' } }
    : { title: '❤️ New like', body: `${name} liked your ${what}.`, data: { path: '/feed' } })
}

const friendRequest = async (me, { other }) => {
  const { data: f } = await admin.from('friendships')
    .select('status, created_at').eq('requester', me).eq('addressee', other).maybeSingle()
  if (!f || f.status !== 'pending') return NOT_FOUND
  if (!fresh(f.created_at)) return STALE
  // One per pair, ever: withdrawing and re-sending never rings twice.
  if (!(await claim('friend_request', `${me}:${other}`))) return DONE

  const { name } = await nameOf(me)
  return send(await willing([other], me, 'friend_requests'), {
    title: 'New friend request',
    body: `${name} wants to be friends on Zero Club.`,
    data: { path: '/profile' },
  })
}

const friendAccepted = async (me, { other }) => {
  const { data: f } = await admin.from('friendships')
    .select('status, responded_at').eq('requester', other).eq('addressee', me).maybeSingle()
  if (!f || f.status !== 'accepted') return NOT_FOUND
  if (!fresh(f.responded_at)) return STALE
  if (!(await claim('friend_accepted', `${other}:${me}`))) return DONE

  const { name, handle } = await nameOf(me)
  return send(await willing([other], me, 'friend_requests'), {
    title: 'Request accepted',
    body: `You and ${name} are now friends. Go see how they’re doing.`,
    data: { path: handle ? `/u/${encodeURIComponent(handle)}` : '/profile' },
  })
}

const KINDS = {
  chat, milestone, payment, comment, reaction,
  friend_request: friendRequest,
  friend_accepted: friendAccepted,
}

const UUID = /^[0-9a-f-]{36}$/i

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  // Not configured is not an error the app should surface: the thing was done,
  // there is just nobody to tell yet.
  if (!apnsConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ skipped: 'not_configured' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Session expired' })

  const { kind, id, other, reaction } = req.body || {}
  const run = Object.hasOwn(KINDS, kind) ? KINDS[kind] : null
  const target = kind?.startsWith('friend_') ? other : id
  if (!run || typeof target !== 'string' || !UUID.test(target)) return res.status(400).json({ error: 'Bad request' })

  try {
    const { status, ...result } = await run(user.id, { id, other, reaction })
    return res.status(status).json(result)
  } catch (err) {
    console.error('Push send failed:', err)
    return res.status(500).json({ error: 'Send failed' })
  }
}
