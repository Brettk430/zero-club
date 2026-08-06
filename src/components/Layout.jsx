import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import AuthModal from './AuthModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

const navItems = [
  {
    name: 'Home',
    path: '/',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>),
  },
  {
    name: 'Progress',
    path: '/progress',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>),
  },
  {
    // The record button, Strava-style: the app's primary action lives in the
    // centre of the nav. /?log=1 tells the dashboard to open the payment sheet.
    name: 'Log',
    path: '/?log=1',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>),
  },
  {
    name: 'Coach',
    path: '/coach',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>),
  },
  {
    name: 'Community',
    path: '/community',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>),
  },
]

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
)

const UserMenu = () => {
  const { user, isPro, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const initials = user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-2 pr-3 py-1.5 text-sm shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-slate-700 sm:inline dark:text-slate-200">{user.email}</span>
        {isPro && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            Pro
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => { navigate('/profile'); setOpen(false) }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-slate-400">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 00-11.215 0c-.22.578.255 1.139.872 1.139h9.47z" />
              </svg>
              My Profile
            </button>
            <div className="border-t border-slate-100 dark:border-slate-700" />
            <button
              onClick={() => { signOut(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-slate-400">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h5.5a.75.75 0 010 1.5h-5.5A.75.75 0 012 4.75zm0 6.5a.75.75 0 01.75-.75h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 01-.75-.75zm10.22-5.03a.75.75 0 011.06 0l2 2a.75.75 0 010 1.06l-2 2a.75.75 0 11-1.06-1.06l.72-.72H8.5a.75.75 0 010-1.5h4.44l-.72-.72a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const BottomNav = () => {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg md:hidden dark:border-slate-800 dark:bg-slate-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : item.path.startsWith('/?') ? false : location.pathname.startsWith(item.path)
          const isFeatured = item.path.startsWith('/?log')

          if (isFeatured) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {item.name}
                </span>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 transition-colors"
            >
              <span className={isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.name}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

const Layout = () => {
  const { user, loading } = useAuth()
  const { theme, toggle } = useTheme()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <header
        className="border-b border-slate-200 bg-white/95 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <p className="text-sm font-bold uppercase leading-none tracking-[0.12em] text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Zero Club</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block dark:text-slate-300">Debt Payoff · Community · Freedom</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                item.path.startsWith('/?log')
                  ? (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      + Log payment
                    </NavLink>
                  )
                  : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `rounded-full px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      {item.name}
                    </NavLink>
                  )
              ))}
            </nav>

            <button
              onClick={toggle}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {!loading && (
              user
                ? <UserMenu />
                : (
                  <button
                    data-auth-trigger
                    onClick={() => setShowAuth(true)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Sign in
                  </button>
                )
            )}
          </div>
        </div>
      </header>

      {/* pb accounts for the fixed bottom nav on mobile */}
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-8 md:pb-8">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>© {new Date().getFullYear()} Zero Club</span>
          <Link to="/privacy" className="underline decoration-slate-300 underline-offset-4 transition hover:text-slate-700 dark:decoration-slate-600 dark:hover:text-slate-200">
            Privacy
          </Link>
          <span className="hidden sm:inline">Not financial advice — your plan, your call.</span>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}

export default Layout
