import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './lib/analytics.js' // init PostHog on load
import { prepareShell, preventFocusZoom } from './lib/native.js'

preventFocusZoom()
prepareShell()

// A page open across a deploy still asks for the bundles it was built with, and
// each deploy removes them. Vite reports that as a failed preload; the fix is
// the new page, so reload once. The timestamp stops a genuine outage from
// turning into a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem('zc_update_reload') || 0)
  if (Date.now() - last < 15000) return
  event.preventDefault()
  sessionStorage.setItem('zc_update_reload', String(Date.now()))
  window.location.reload()
})

// Register service worker for PWA/offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silently fail if service worker registration fails
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
