import { Component } from 'react'

// A screen that fails to load because a deploy replaced its code is not really
// an error — the new version is one reload away. Every browser words it
// differently, hence the list.
const STALE_BUNDLE = /dynamically imported module|Importing a module script failed|error loading dynamically imported|MIME type|Failed to fetch/i

// Reload once for a stale bundle; the timestamp stops a real outage from
// becoming a loop. Shared with the handler in main.jsx.
const reloadOnceForUpdate = () => {
  const last = Number(sessionStorage.getItem('zc_update_reload') || 0)
  if (Date.now() - last < 15000) return false
  sessionStorage.setItem('zc_update_reload', String(Date.now()))
  window.location.reload()
  return true
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (STALE_BUNDLE.test(error?.message || '') && reloadOnceForUpdate()) return
    console.error('Zero Club error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 text-center dark:bg-slate-950">
          <div className="max-w-sm">
            <img src="/brand/mark.png" alt="" width="56" height="56" className="mx-auto h-14 w-14 opacity-80" />
            <h1 className="mt-6 text-xl font-black text-slate-900 dark:text-white">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Your number and your payments are saved. Reloading usually sorts it out.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 rounded-full bg-lime px-8 py-3 text-sm font-black text-deep transition hover:bg-[#D9FF7A]"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
