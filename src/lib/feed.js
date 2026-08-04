import { supabase } from './supabaseClient.js'
import { loadGroup } from './groups.js'

// Feed data layer. Every function tolerates the tables not existing yet
// (migration pending) by returning empty results — the UI shows a warming-up
// state instead of breaking.

// Debt is more sensitive than a 5k time: the feed is handle-based by default.
// Members can set their own handle in Profile; otherwise we mint a friendly one
// so nobody posts as "Anonymous" (and nobody accidentally posts a legal name).
const ADJECTIVES = ['Quiet', 'Bold', 'Steady', 'Calm', 'Focused', 'Brave', 'Sharp', 'Driven', 'Patient', 'Relentless']
const ANIMALS = ['Falcon', 'Wolf', 'Fox', 'Sparrow', 'Otter', 'Hawk', 'Bear', 'Eagle', 'Heron', 'Lynx']

export const ensureUsername = () => {
  const stored = localStorage.getItem('zc_username')
  if (stored) return stored
  const handle = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}${ANIMALS[Math.floor(Math.random() * ANIMALS.length)]}${Math.floor(Math.random() * 90) + 10}`
  localStorage.setItem('zc_username', handle)
  return handle
}

const username = (user) => user?.user_metadata?.username || ensureUsername()

// Auto-post a logged payment, Strava-style: "Brett paid $250 toward Chase Visa."
export const postPayment = async (user, payment) => {
  if (!supabase || !user || !payment) return
  await supabase.from('posts').insert({
    user_id: user.id,
    username: username(user),
    type: 'payment',
    payload: { amount: Number(payment.amount), debtName: payment.debtName },
    group_id: loadGroup(user) || null,
  })
}

// Auto-post an unlocked milestone: "Brett reached Halfway to Zero."
export const postMilestone = async (user, milestone) => {
  if (!supabase || !user || !milestone) return
  await supabase.from('posts').insert({
    user_id: user.id,
    username: username(user),
    type: 'milestone',
    payload: { label: milestone.label },
    group_id: loadGroup(user) || null,
  })
}

// Posts with aggregated reactions and comments, newest first.
// scope: 'all' | group id.
export const fetchFeed = async (scope = 'all', currentUserId = null) => {
  if (!supabase) return { posts: [], ready: false }

  let query = supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50)
  if (scope !== 'all') query = query.eq('group_id', scope)
  const { data: posts, error } = await query
  if (error) return { posts: [], ready: false } // table missing or unreachable
  if (!posts?.length) return { posts: [], ready: true }

  const ids = posts.map((p) => p.id)
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from('post_reactions').select('post_id, user_id, kind').in('post_id', ids),
    supabase.from('post_comments').select('*').in('post_id', ids).order('created_at', { ascending: true }),
  ])

  const enriched = posts.map((post) => {
    const mine = (reactions || []).filter((r) => r.post_id === post.id)
    return {
      ...post,
      likes: mine.filter((r) => r.kind === 'like').length,
      celebrates: mine.filter((r) => r.kind === 'celebrate').length,
      myReactions: new Set(mine.filter((r) => r.user_id === currentUserId).map((r) => r.kind)),
      comments: (comments || []).filter((c) => c.post_id === post.id),
    }
  })
  return { posts: enriched, ready: true }
}

export const toggleReaction = async (user, post, kind) => {
  if (!supabase || !user) return
  if (post.myReactions.has(kind)) {
    await supabase.from('post_reactions').delete()
      .eq('post_id', post.id).eq('user_id', user.id).eq('kind', kind)
  } else {
    await supabase.from('post_reactions').insert({ post_id: post.id, user_id: user.id, kind })
  }
}

export const addComment = async (user, postId, body) => {
  if (!supabase || !user || !body.trim()) return null
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, user_id: user.id, username: username(user), body: body.trim().slice(0, 500) })
    .select().single()
  return error ? null : data
}

export const timeAgo = (date) => {
  const seconds = (Date.now() - new Date(date)) / 1000
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
