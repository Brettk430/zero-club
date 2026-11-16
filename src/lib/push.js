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

// The moment to ask is right after someone has said something to their club:
// "tell me when they answer" is obvious then, where at launch it is a stranger
// asking for something. Asked once; Settings is the way back after that.
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

// Tells the server a chat message or milestone post was just written, so it
// can tell the club. Fire and forget: a notification that doesn't go out must
// never get in the way of the message itself.
export const notifyClub = async (kind, id) => {
  if (!supabase || !id) return
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    await fetch(`${apiBase}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, id }),
    })
  } catch { /* best effort */ }
}

// ── Choices ────────────────────────────────────────────────────────────────
// No row means both are on.
export const fetchNotificationPrefs = async (userId) => {
  const fallback = { chat: true, milestones: true }
  if (!supabase || !userId) return fallback
  const { data, error } = await supabase.from('notification_prefs')
    .select('chat, milestones').eq('user_id', userId).maybeSingle()
  if (error || !data) return fallback
  return data
}

export const saveNotificationPrefs = async (userId, prefs) => {
  if (!supabase || !userId) return { error: 'Not signed in' }
  const { error } = await supabase.from('notification_prefs').upsert({
    user_id: userId,
    chat: prefs.chat,
    milestones: prefs.milestones,
    updated_at: new Date().toISOString(),
  })
  return { error: error ? 'Could not save that — try again.' : null }
}
