import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ZeroOnboarding from './components/ZeroOnboarding.jsx'
import Home from './pages/Home.jsx'
import Clubs from './pages/Clubs.jsx'
const ClubDetail = lazy(() => import('./pages/ClubDetail.jsx'))
const Member = lazy(() => import('./pages/Member.jsx'))
import { ZeroProvider, useZero } from './context/ZeroContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { recordVisit } from './lib/payments.js'

const Feed = lazy(() => import('./pages/Feed.jsx'))
const Milestones = lazy(() => import('./pages/Milestones.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))

const PageSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
  </div>
)

function AppContent() {
  const { user, loading } = useAuth()
  const { onboardingOpen, closeOnboarding, syncing } = useZero()

  // Held back while auth or the first sync is still resolving, so a returning
  // member is never asked for their total again just because their profile
  // hasn't landed yet.
  const showOnboarding = onboardingOpen && !loading && !(user && syncing)

  useEffect(() => {
    recordVisit()
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && !localStorage.getItem('zc_ref')) {
      localStorage.setItem('zc_ref', ref.slice(0, 12).toUpperCase())
    }
  }, [])

  return (
    <BrowserRouter>
      {showOnboarding && <ZeroOnboarding onComplete={closeOnboarding} />}
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="clubs" element={<Clubs />} />
            <Route path="clubs/:clubId" element={<ClubDetail />} />
            <Route path="feed" element={<Feed />} />
            <Route path="milestones" element={<Milestones />} />
            <Route path="u/:handle" element={<Member />} />
            <Route path="profile" element={<Profile />} />
            <Route path="privacy" element={<Privacy />} />
            {/* Routes the rebuild retired */}
            <Route path="community" element={<Navigate to="/feed" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ZeroProvider>
          <AppContent />
        </ZeroProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
