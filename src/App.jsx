import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Onboarding from './components/Onboarding.jsx'
import Home from './pages/Home.jsx'
import Calculator from './pages/Calculator.jsx'
import Plan from './pages/Plan.jsx'
import { DebtProvider, useDebt } from './context/DebtContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { recordVisit } from './lib/payments.js'

// Split secondary pages out of the initial bundle (Stripe only ships with Profile)
const Coach = lazy(() => import('./pages/Coach.jsx'))
const Community = lazy(() => import('./pages/Community.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Progress = lazy(() => import('./pages/Progress.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))

const PageSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
  </div>
)

const hasExistingDebts = () => {
  try {
    const stored = localStorage.getItem('zero-club-debts')
    if (!stored) return false
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

function AppContent() {
  const { user } = useAuth()
  const { debts } = useDebt()
  const [onboarded, setOnboarded] = useState(
    () => Boolean(localStorage.getItem('zc_onboarded')) || hasExistingDebts()
  )

  // A signed-in member whose plan has arrived from the cloud has already done
  // this — on a new device (or an iOS home-screen PWA, which starts with empty
  // storage) the overlay would otherwise cover the app they already set up.
  // Onboarding itself is unaffected: sign-in happens at its final step.
  const showOnboarding = !onboarded && !(user && debts.length > 0)

  const completeOnboarding = () => {
    localStorage.setItem('zc_onboarded', '1')
    setOnboarded(true)
  }

  // Days-active streak counts calendar days the app was opened
  useEffect(() => {
    recordVisit()
    // Remember who invited them; attributed to the account at sign-up
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && !localStorage.getItem('zc_ref')) {
      localStorage.setItem('zc_ref', ref.slice(0, 12).toUpperCase())
    }
  }, [])

  return (
    <BrowserRouter>
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="plan" element={<Plan />} />
            <Route path="progress" element={<Progress />} />
            <Route path="coach" element={<Coach />} />
            <Route path="community" element={<Community />} />
            <Route path="profile" element={<Profile />} />
            <Route path="privacy" element={<Privacy />} />
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
        <DebtProvider>
          <AppContent />
        </DebtProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
