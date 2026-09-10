import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { fetchUnread, markClubRead } from '../lib/unread.js'

const UnreadContext = createContext({ byClub: {}, total: 0, refresh: () => {}, markRead: () => {} })

// Shared so the nav badge and the club list read the same numbers from one
// poll, rather than each fetching on its own schedule and disagreeing.
export const UnreadProvider = ({ children }) => {
  const { user } = useAuth()
  const [state, setState] = useState({ byClub: {}, total: 0, ready: true })

  const refresh = useCallback(async () => {
    if (!user) { setState({ byClub: {}, total: 0, ready: true }); return }
    setState(await fetchUnread())
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Polled, and paused while the tab is hidden so a phone in a pocket is not
  // doing this all day.
  useEffect(() => {
    if (!user) return
    const tick = () => { if (!document.hidden) refresh() }
    const id = setInterval(tick, 30000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [user, refresh])

  const markRead = useCallback(async (clubId) => {
    // Clear it locally first: the badge should go the moment you open the room,
    // not a round trip later.
    setState((s) => {
      const byClub = { ...s.byClub, [clubId]: 0 }
      return { ...s, byClub, total: Object.values(byClub).reduce((a, b) => a + b, 0) }
    })
    await markClubRead(clubId)
  }, [])

  return (
    <UnreadContext.Provider value={{ ...state, refresh, markRead }}>
      {children}
    </UnreadContext.Provider>
  )
}

export const useUnread = () => useContext(UnreadContext)
