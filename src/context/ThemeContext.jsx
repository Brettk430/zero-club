import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('zero-club-theme') || 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('zero-club-theme', theme)

    // With the page running up behind the status bar, Safari's tint and the
    // native bar's text both have to match whichever ground is showing.
    const ground = theme === 'dark' ? '#071615' : '#EFF1E8'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground)
    import('../lib/native.js').then(({ setStatusBarTheme }) => setStatusBarTheme(theme)).catch(() => {})
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
