import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

// Opens the app on the screen a link names: com.zeroclub.app://feed lands on
// the Feed, com.zeroclub.app://?log=1 opens the payment sheet. It is what a
// tapped reminder or a shared link needs. Sign-in callbacks use the same scheme
// and are completed in AuthContext, so they are left alone here.
//
// https links are parsed as they come, so universal links for joinzeroclub.com
// route the same way once the app is associated with the domain.
const DeepLinks = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => {
        if (!url || url.includes('auth-callback')) return
        const parsed = /^https?:/.test(url)
          ? new URL(url)
          : new URL(url.replace(/^com\.zeroclub\.app:\/\//, 'https://x/'))
        navigate(`${parsed.pathname}${parsed.search}`)
      }).then((h) => { remove = () => h.remove() })
    })
    return () => { if (remove) remove() }
  }, [navigate])

  return null
}

export default DeepLinks
