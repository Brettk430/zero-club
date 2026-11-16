import { Capacitor } from '@capacitor/core'
import { supabase } from './supabaseClient.js'
import { apiBase } from './apiBase.js'

// Push notifications from the server: club chat and clubmates' milestones.
// iOS only for now — Android needs a Firebase project before the plugin can
// register, and calling it without one crashes the app. The monthly payment
// reminder is separate: a local notification, scheduled in native.js.

export const pushSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

const plugin = async () => (await import('@capacitor/push-notifications')).PushNotifications

// The token this phone was last given, so sign-out can hand it back.
let currentToken = null
const ASKED_KEY = 'zc_push_asked'

// 'granted' | 'denied' | 'prompt' | 'unsupported'
export const pushPermission = async () => {
  if (!pushSupported()) return 'unsupported'
  try {
    const { receive } = await (await plugin()).checkPermissions()
    return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unsupported'
  }
}

// Shows iOS's own prompt if it hasn't been answered, and registers if allowed.
// iOS only ever shows that prompt once; after a "Don't Allow" the answer lives
// in the phone's Settings and this returns 'denied'.
export const enablePush = async () => {
  if (!pushSupported()) return 'unsupported'
  try {
    try { localStorage.setItem(ASKED_KEY, '1') } catch { /* ignore */ }
    const push = await plugin()
    const { receive } = await push.requestPermissions()
    if (receive !== 'granted') return 'denied'
    await push.register()
    return 'granted'
  } catch {
    return 'unsupported'
  }
}

// The moment to ask is right after someone has reached out — a club message,
// a friend request, an accepted request: "tell me when they answer" is obvious
// then, where at launch it is a stranger asking for something. Asked once; Settings is the way back after that.
export const offerPush = async () => {
  if (!pushSupported()) return
  try { if (localStorage.getItem(ASKED_KEY)) return } catch { return }
  if ((await pushPermission()) !== 'prompt') return
  await enablePush()
}

// Wired once at startup by <PushListener>. Tokens can change between launches,
// so a member who has already allowed notifications re-registers every time.
export const startPush = async ({ onOpen }) => {
  if (!pushSupported()) return () => {}
  const push = await plugin()
  const handles = await Promise.all([
    push.addListener('registration', ({ value }) => {
      currentToken = value
      registerToken()
    }),
    push.addListener('registrationError', (err) => console.warn('Push registration failed:', err?.error)),
    push.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const path = notification?.data?.path
      if (typeof path === 'string' && path.startsWith('/')) onOpen(path)
    }),
  ])
  if ((await pushPermission()) === 'granted') push.register().catch(() => {})
  return () => handles.forEach((h) => h.remove())
}

// Ties this phone's token to whoever is signed in. Called on registration and
// again whenever the signed-in member changes.
export const registerToken = async () => {
  if (!supabase || !currentToken) return
  const { data } = await supabase.auth.getSession()
  if (!data.session) return
  await supabase.rpc('register_push_token', { push_token: currentToken, push_platform: 'ios' })
}

// Must run before the session ends: the function only removes a token that
// belongs to the caller.
export const releaseToken = async () => {
  if (!supabase || !currentToken) return
  try { await supabase.rpc('unregister_push_token', { push_token: currentToken }) } catch { /* signing out regardless */ }
}

// Tells the server the member just did something worth hearing about — a chat
// message, a post, a comment, a like, a friend request — naming the row, so it
// can tell the people concerned. Fire and forget: a notification that doesn't
// go out must never get in the way of the thing itself.
export const notifyPush = async (kind, fields) => {
  if (!supabase || !(fields?.id || fields?.other)) return
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    await fetch(`${apiBase}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, ...fields }),
    })
  } catch { /* best effort */ }
}

// ── Choices ────────────────────────────────────────────────────────────────
// One switch per kind; no row means all of them are on.
export const NOTIFICATION_KINDS = [
  ['chat', 'Club chat', 'When someone posts in one of your clubs. At most one every few minutes per club.'],
  ['friend_requests', 'Friend requests', 'When someone asks to be friends, or says yes to your request.'],
  ['comments', 'Comments', 'On your posts, and replies in threads you’ve joined.'],
  ['reactions', 'Likes and cheers', 'When someone likes or celebrates your post.'],
  ['friend_payments', 'Friends’ payments', 'When a friend logs a payment. At most twice a day per friend.'],
  ['milestones', 'Milestones', 'When a friend or clubmate crosses a milestone.'],
]
const ALL_ON = Object.fromEntries(NOTIFICATION_KINDS.map(([key]) => [key, true]))

export const fetchNotificationPrefs = async (userId) => {
  if (!supabase || !userId) return ALL_ON
  const { data, error } = await supabase.from('notification_prefs')
    .select(NOTIFICATION_KINDS.map(([key]) => key).join(', ')).eq('user_id', userId).maybeSingle()
  if (error || !data) return ALL_ON
  return { ...ALL_ON, ...data }
}

export const saveNotificationPrefs = async (userId, prefs) => {
  if (!supabase || !userId) return { error: 'Not signed in' }
  const { error } = await supabase.from('notification_prefs').upsert({
    user_id: userId,
    ...Object.fromEntries(NOTIFICATION_KINDS.map(([key]) => [key, prefs[key] !== false])),
    updated_at: new Date().toISOString(),
  })
  return { error: error ? 'Could not save that — try again.' : null }
}
