import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { fetchBlocks, blockUser, unblockUser } from '../lib/moderation.js'

// Who the signed-in member has blocked. The feed, comments and club chat read
// this to hide anything those people post; the block list in Edit profile
// reads it to offer an unblock.
const ModerationContext = createContext({
  blocks: [], isBlocked: () => false, block: async () => ({}), unblock: async () => ({}),
})

export const ModerationProvider = ({ children }) => {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState([])

  useEffect(() => {
    if (!user) { setBlocks([]); return }
    let live = true
    fetchBlocks(user.id).then((rows) => { if (live) setBlocks(rows) })
    return () => { live = false }
  }, [user?.id])

  const block = useCallback(async (id, handle) => {
    const { error } = await blockUser(user?.id, id, handle)
    if (!error) setBlocks((b) => (b.some((x) => x.blocked_id === id) ? b : [{ blocked_id: id, blocked_handle: handle, created_at: new Date().toISOString() }, ...b]))
    return { error }
  }, [user?.id])

  const unblock = useCallback(async (id) => {
    const { error } = await unblockUser(user?.id, id)
    if (!error) setBlocks((b) => b.filter((x) => x.blocked_id !== id))
    return { error }
  }, [user?.id])

  const value = useMemo(() => {
    const ids = new Set(blocks.map((b) => b.blocked_id))
    return { blocks, isBlocked: (id) => ids.has(id), block, unblock }
  }, [blocks, block, unblock])

  return <ModerationContext.Provider value={value}>{children}</ModerationContext.Provider>
}

export const useModeration = () => useContext(ModerationContext)
