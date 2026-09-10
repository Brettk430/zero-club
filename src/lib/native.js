import { Capacitor } from '@capacitor/core'

// One place that knows whether we're in the native shell. Every helper below
// works on the web too — the native path is an upgrade, never a requirement —
// so the same code runs in a browser tab and in the App Store build.
export const isNative = () => Capacitor.isNativePlatform()

// ── Haptics ────────────────────────────────────────────────────────────────
// Silent no-ops on the web. A phone that buzzes when the number drops is most
// of what separates "app" from "website" in the hand.
export const tap = async (style = 'medium') => {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle[style === 'light' ? 'Light' : style === 'heavy' ? 'Heavy' : 'Medium'] })
  } catch { /* haptics are a nicety */ }
}

export const celebrate = async () => {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch { /* ignore */ }
}

// ── Share ──────────────────────────────────────────────────────────────────
// The native sheet reaches Messages and Instagram directly. Returns false when
// it isn't available so callers can fall back to the web path.
export const shareNative = async ({ text, title, url }) => {
  if (!isNative()) return false
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({ text, title, url, dialogTitle: 'Share your progress' })
    return true
  } catch {
    return false
  }
}

// ── Camera ─────────────────────────────────────────────────────────────────
// A real camera, not a file picker. Returns a File so the existing upload path
// is unchanged.
export const takePhoto = async ({ fromLibrary = false } = {}) => {
  if (!isNative()) return null
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const photo = await Camera.getPhoto({
    quality: 88,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: fromLibrary ? CameraSource.Photos : CameraSource.Camera,
    width: 1024,
  })
  if (!photo?.webPath) return null
  const blob = await (await fetch(photo.webPath)).blob()
  return new File([blob], `avatar.${photo.format || 'jpg'}`, { type: blob.type || 'image/jpeg' })
}

export const canUseCamera = () => isNative()

// ── Reminders ──────────────────────────────────────────────────────────────
// Scheduled on the device, so no server, no push certificates, and they work
// with the phone offline. For a habit that repeats monthly this is the whole
// return path.
const REMINDER_ID = 4201

export const remindersPermission = async () => {
  if (!isNative()) return 'unsupported'
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'granted') return 'granted'
    const asked = await LocalNotifications.requestPermissions()
    return asked.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}

// Same day each month, at a civil hour. `on` is the day of the month.
export const scheduleMonthlyReminder = async ({ on = 1, hour = 18 } = {}) => {
  if (!isNative()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
    await LocalNotifications.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: 'Log this month’s payment',
        body: 'Two taps, and the number drops. Keep the streak alive.',
        schedule: { on: { day: on, hour, minute: 0 }, allowWhileIdle: true },
      }],
    })
    return true
  } catch {
    return false
  }
}

export const cancelReminders = async () => {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
  } catch { /* ignore */ }
}

// ── Shell ──────────────────────────────────────────────────────────────────
// Called once at startup: the status bar has to be told the app is dark, and
// the splash has to be dismissed once React has something to show.
// Style.Dark means light text — for a dark page. The content runs up behind the
// status bar now, so its clock and signal have to follow the theme or they
// disappear against the page.
export const setStatusBarTheme = async (theme) => {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark })
  } catch { /* ignore */ }
}

export const prepareShell = async () => {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setOverlaysWebView({ overlay: true })   // edge to edge on Android too
    await StatusBar.setStyle({ style: document.documentElement.classList.contains('dark') ? Style.Dark : Style.Light })
  } catch { /* android/web differences */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch { /* ignore */ }
}
