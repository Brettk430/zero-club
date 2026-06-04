import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Onboarding from './components/Onboarding.jsx'
import Home from './pages/Home.jsx'
import Calculator from './pages/Calculator.jsx'
import Plan from './pages/Plan.jsx'
import Coach from './pages/Coach.jsx'
import Community from './pages/Community.jsx'
import Profile from './pages/Profile.jsx'
import { DebtProvider } from './context/DebtContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

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
  const [onboarded, setOnboarded] = useState(
    () => Boolean(localStorage.getItem('zc_onboarded')) || hasExistingDebts()
  )

  const completeOnboarding = () => {
    localStorage.setItem('zc_onboarded', '1')
    setOnboarded(true)
  }

  return (
    <BrowserRouter>
      {!onboarded && <Onboarding onComplete={completeOnboarding} />}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="plan" element={<Plan />} />
          <Route path="coach" element={<Coach />} />
          <Route path="community" element={<Community />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
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
