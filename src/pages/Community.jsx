import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { Link } from 'react-router-dom'
import { GROUPS, groupById, loadGroup, saveGroupLocally } from '../lib/groups.js'
import { fetchFeed, toggleReaction, addComment, timeAgo, ensureUsername } from '../lib/feed.js'
import { track } from '../lib/analytics.js'

// Strava for debt payoff: the feed celebrates every payment and milestone.
// Positive-only by design — reactions are applause, comments are encouragement.

const postText = (post) => {
  if (post.type === 'payment') {
    return (
      <>
        paid <span className="font-bold text-emerald-600 dark:text-emerald-400">${Number(post.payload.amount).toLocaleString()}</span>
        {post.payload.debtName ? <> toward {post.payload.debtName}</> : null}
      </>
    )
  }
  return <>reached <span className="font-bold text-slate-900 dark:text-white">{post.payload.label}</span> 🏆</>
}

const ReactionButton = ({ active, emoji, count, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition disabled:opacity-40 ${
      active
        ? 'bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900'
        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
    }`}
  >
    <span>{emoji}</span>
    {count > 0 && <span className="text-xs">{count}</span>}
  </button>
)

const PostCard = ({ post, user, onReact, onComment }) => {
  const [showComments, setShowComments] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const handleComment = async (e) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    await onComment(post, draft)
    setDraft('')
    setSending(false)
  }

  const group = groupById(post.group_id)

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
          {(post.username?.[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{post.username}</span>{' '}
            {postText(post)}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            {timeAgo(post.created_at)}
            {group && <span className="rounded-full bg-slate-50 px-2 py-0.5 dark:bg-slate-800">{group.emoji} {group.name}</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ReactionButton emoji="👏" count={post.likes} active={post.myReactions.has('like')} disabled={!user} onClick={() => onReact(post, 'like')} />
        <ReactionButton emoji="🎉" count={post.celebrates} active={post.myReactions.has('celebrate')} disabled={!user} onClick={() => onReact(post, 'celebrate')} />
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="ml-auto text-xs font-medium text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
        >
          {post.comments.length > 0 ? `${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          {post.comments.map((c) => (
            <div key={c.id} className="mb-2 flex items-baseline gap-2 text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{c.username}</span>
              <span className="min-w-0 text-slate-500 dark:text-slate-400">{c.body}</span>
            </div>
          ))}
          {user ? (
            <form onSubmit={handleComment} className="mt-2 flex gap-2">
              <input
                type="text"
                value={draft}
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Cheer them on…"
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button type="submit" disabled={sending || !draft.trim()} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900">
                Send
              </button>
            </form>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Sign in to comment.</p>
          )}
        </div>
      )}
    </div>
  )
}

const Community = () => {
  const { user } = useAuth()
  const [myGroup, setMyGroup] = useState(() => loadGroup(user))
  const [scope, setScope] = useState('all')
  const [posts, setPosts] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const handle = user?.user_metadata?.username || ensureUsername()

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await fetchFeed(scope === 'group' ? myGroup : 'all', user?.id ?? null)
    setPosts(result.posts)
    setReady(result.ready)
    setLoading(false)
  }, [scope, myGroup, user?.id])

  useEffect(() => { refresh() }, [refresh])

  // Identity changed (sign in/out): adopt that member's saved group. Without
  // this the initial useState value sticks, so a member signing in on a new
  // device would never pick up the group stored in their metadata.
  useEffect(() => {
    setMyGroup(loadGroup(user))
  }, [user])

  const joinGroup = async (id) => {
    const next = myGroup === id ? '' : id
    setMyGroup(next)
    saveGroupLocally(next)
    if (next) track('group_joined')
    if (user && supabase) await supabase.auth.updateUser({ data: { zc_group: next || null } })
    if (scope === 'group' && !next) setScope('all')
  }

  const handleReact = async (post, kind) => {
    if (!user) return
    // Optimistic: flip locally, then persist
    setPosts((prev) => prev.map((p) => {
      if (p.id !== post.id) return p
      const mine = new Set(p.myReactions)
      const had = mine.has(kind)
      if (had) mine.delete(kind)
      else mine.add(kind)
      return {
        ...p,
        myReactions: mine,
        likes: p.likes + (kind === 'like' ? (had ? -1 : 1) : 0),
        celebrates: p.celebrates + (kind === 'celebrate' ? (had ? -1 : 1) : 0),
      }
    }))
    await toggleReaction(user, post, kind)
  }

  const handleComment = async (post, body) => {
    const comment = await addComment(user, post.id, body)
    if (comment) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comments: [...p.comments, comment] } : p)))
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">Community</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every payment deserves a crowd. Cheer, get cheered, keep going.</p>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        You post as <span className="font-semibold text-slate-600 dark:text-slate-300">{handle}</span> — balances stay private, only amounts you log are shared.{' '}
        <Link to="/profile" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">Change handle</Link>
      </p>

      {/* Groups */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => joinGroup(g.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              myGroup === g.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
            }`}
            title={g.description}
          >
            {g.emoji} {g.name}{myGroup === g.id ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {/* Scope tabs */}
      <div className="mt-4 flex rounded-full border border-slate-200 bg-white p-0.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-900">
        {[['all', 'Everyone'], ['group', myGroup ? `${groupById(myGroup)?.emoji ?? ''} My group` : 'My group']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={id === 'group' && !myGroup}
            onClick={() => setScope(id)}
            className={`flex-1 rounded-full py-2 transition disabled:opacity-40 ${
              scope === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
          </div>
        ) : !ready ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">The feed is warming up.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Community posts are almost ready — check back shortly.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quiet in here — for now.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Log a payment and it shows up here automatically. Someone has to be first.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} user={user} onReact={handleReact} onComment={handleComment} />
          ))
        )}
      </div>

      {!user && ready && (
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Sign in to react, comment, and share your own wins.
        </p>
      )}
    </section>
  )
}

export default Community
