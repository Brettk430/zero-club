import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useZero } from '../context/ZeroContext.jsx'
import { fetchFeed, toggleReaction, addComment, timeAgo } from '../lib/feed.js'
import { myClubs, clubMemberIds } from '../lib/clubs.js'
import { money } from '../lib/zero.js'
import Logo from '../components/Logo.jsx'

// Every payment deserves a crowd. Positive-only by design: reactions are
// applause, comments are encouragement, and nothing here ranks anyone.

const PostBody = ({ post }) => {
  if (post.type === 'milestone') {
    return (
      <>reached <span className="font-bold text-slate-900 dark:text-white">{post.payload.emoji} {post.payload.label}</span></>
    )
  }
  if (post.payload?.hidden) {
    return (
      <>eliminated more debt — now{' '}
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{Number(post.payload.progressPct || 0).toFixed(1)}% to zero</span>
      </>
    )
  }
  return (
    <>
      eliminated <span className="font-bold text-emerald-600 dark:text-emerald-400">{money(post.payload.amount)}</span>
      {post.payload.remaining !== undefined && (
        <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {money(post.payload.remaining)} → $0
        </span>
      )}
    </>
  )
}

const ReactionButton = ({ active, emoji, count, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-150 active:scale-90 disabled:opacity-40 ${
      active
        ? 'scale-105 bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900'
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

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
          {(post.username?.[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">{post.username}</span>{' '}
            <PostBody post={post} />
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ReactionButton emoji="👏" count={post.likes} active={post.myReactions.has('like')} disabled={!user} onClick={() => onReact(post, 'like')} />
        <ReactionButton emoji="🎉" count={post.celebrates} active={post.myReactions.has('celebrate')} disabled={!user} onClick={() => onReact(post, 'celebrate')} />
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="ml-auto text-xs font-semibold text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
        >
          {post.comments.length > 0 ? `${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}` : 'Comment'}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          {post.comments.map((c) => (
            <div key={c.id} className="mb-2 flex items-baseline gap-2 text-sm">
              <span className="font-bold text-slate-800 dark:text-slate-200">{c.username}</span>
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
              <button type="submit" disabled={sending || !draft.trim()} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900">
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

// Collective momentum, deliberately not a leaderboard. Upward comparison is
// poison in a debt app — someone paying $50 against $40k does not need to see
// who paid $3,000 this week. A shared total makes the room feel busy without
// ranking anyone in it.
const WeekCard = ({ posts, myHandle, signedIn }) => {
  const stats = useMemo(() => {
    const since = Date.now() - 7 * 86400000
    const recent = posts.filter((p) => new Date(p.created_at).getTime() >= since)
    return {
      total: recent.filter((p) => p.type === 'payment').reduce((s, p) => s + (Number(p.payload?.amount) || 0), 0),
      people: new Set(recent.map((p) => p.username)).size,
      milestones: recent.filter((p) => p.type === 'milestone').length,
      iPosted: recent.some((p) => p.username === myHandle),
      cheersGiven: recent.filter((p) => p.myReactions?.size > 0).length,
    }
  }, [posts, myHandle])

  return (
    <div className="rounded-[28px] bg-slate-950 p-5 text-white sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">This week, together</p>
      <p className="mt-1.5 text-3xl font-black tracking-tighter text-emerald-400">{money(stats.total)}</p>
      <p className="mt-1 text-sm text-slate-400">
        eliminated by {stats.people} {stats.people === 1 ? 'member' : 'members'}
        {stats.milestones > 0 && <> · {stats.milestones} milestone{stats.milestones === 1 ? '' : 's'}</>}
      </p>
      {signedIn && (
        <p className="mt-4 border-t border-white/10 pt-3 text-sm text-slate-300">
          {!stats.iPosted
            ? <>Your payment isn't in this number yet. <span className="font-bold text-white">Log one and it lands here.</span></>
            : stats.cheersGiven === 0
              ? <>You're in it 💪 — <span className="font-bold text-white">now go cheer someone.</span></>
              : <>You're in it 💪 and you've cheered {stats.cheersGiven} {stats.cheersGiven === 1 ? 'person' : 'people'} this week.</>}
        </p>
      )}
    </div>
  )
}

const Feed = () => {
  const { user } = useAuth()
  const { handle } = useZero()
  const [clubs, setClubs] = useState([])
  const [scope, setScope] = useState('all') // 'all' | club id
  const [posts, setPosts] = useState([])
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    myClubs(user.id).then((r) => setClubs(r.clubs))
  }, [user])

  const refresh = useCallback(async () => {
    setLoading(true)
    const memberIds = scope === 'all' ? null : await clubMemberIds(scope)
    const result = await fetchFeed({ memberIds, currentUserId: user?.id ?? null })
    setPosts(result.posts)
    setReady(result.ready)
    setLoading(false)
  }, [scope, user?.id])

  useEffect(() => { refresh() }, [refresh])

  const handleReact = async (post, kind) => {
    if (!user) return
    setPosts((prev) => prev.map((p) => {
      if (p.id !== post.id) return p
      const mine = new Set(p.myReactions)
      const had = mine.has(kind)
      if (had) mine.delete(kind); else mine.add(kind)
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
    if (comment) setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comments: [...p.comments, comment] } : p)))
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Feed</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Every payment deserves a crowd. You post as <span className="font-bold text-slate-700 dark:text-slate-300">{handle}</span>.
      </p>

      {clubs.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', name: 'Everyone' }, ...clubs].map((c) => (
            <button
              key={c.id}
              onClick={() => setScope(c.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                scope === c.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {ready && posts.length > 0 && (
        <div className="mt-4">
          <WeekCard posts={posts} myHandle={handle} signedIn={Boolean(user)} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
          </div>
        ) : !ready ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">The feed is warming up.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Posts are almost ready — check back shortly.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <Logo variant="plain" size={56} className="mx-auto opacity-70" />
            <p className="mt-3 text-lg font-black text-slate-900 dark:text-slate-100">Quiet in here — for now.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {scope === 'all'
                ? 'Log a payment and it shows up here automatically. Someone has to be first.'
                : <>Nobody in this club has logged one yet. <Link to="/clubs" className="underline underline-offset-4">Invite more people</Link>.</>}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} user={user} onReact={handleReact} onComment={handleComment} />
          ))
        )}
      </div>

      {!user && ready && (
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Sign in to react, comment, and share your own wins.
        </p>
      )}
    </section>
  )
}

export default Feed
