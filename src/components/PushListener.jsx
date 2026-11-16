import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { startPush, registerToken } from '../lib/push.js'

// Listens for push registration and taps, the way <DeepLinks> listens for
// links: a tapped chat notification opens that club's chat, a milestone opens
// the feed. Renders nothing.
const PushListener = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    let stop = () => {}
    let live = true
    startPush({ onOpen: (path) => navigate(path) }).then((s) => { if (live) stop = s; else s() })
    return () => { live = false; stop() }
  }, [navigate])

  // A token can arrive before sign-in finishes, or the member can change on
  // this phone; either way the token follows whoever is signed in now.
  useEffect(() => {
    if (user?.id) registerToken()
  }, [user?.id])

  return null
}

export default PushListener
