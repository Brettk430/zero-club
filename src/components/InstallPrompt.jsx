import { useEffect, useState } from 'react'
import { useZero } from '../context/ZeroContext.jsx'

const DISMISS_KEY = 'zc_install_dismissed'

const isStandalone = () =>
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

// Only Safari can install to the iOS home screen — Chrome and Firefox on iOS
// have no such menu item, so telling their users to look for one is a dead end.
const iosSafari = () => {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
}

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="inline h-4 w-4 align-text-bottom">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
  </svg>
)

// Asking someone to install before they have anything in the app converts badly
// and reads as pushy. This waits until there is a plan worth coming back to.
const InstallPrompt = () => {
  const { hasZero } = useZero()
  const [dismissed, setDismissed] = useState(() => {
    try { return Boolean(localStorage.getItem(DISMISS_KEY)) } catch { return true }
  })
  const [installEvent, setInstallEvent] = useState(null)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (iosSafari()) setShowIosHint(true)

    const onPrompt = (e) => {
      e.preventDefault() // keep it for our own button
      setInstallEvent(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const close = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  const install = async () => {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
    close()
  }

  if (dismissed || !hasZero || (!installEvent && !showIosHint)) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(86px+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3.5 shadow-lg dark:bg-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Keep Zero Club on your home screen</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-300">
            {installEvent
              ? 'Opens full screen, launches instantly, works offline.'
              : <>Tap <ShareIcon /> below, then <span className="font-semibold text-white">Add to Home Screen</span>.</>}
          </p>
          {installEvent && (
            <button
              onClick={install}
              className="mt-2.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Install
            </button>
          )}
        </div>
        <button onClick={close} aria-label="Dismiss" className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-slate-400 transition hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  )
}

export default InstallPrompt
