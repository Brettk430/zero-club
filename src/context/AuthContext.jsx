import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Capacitor } from '@capacitor/core'
import { identify, reset, track } from '../lib/analytics.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  const fetchProfile = async (userId) => {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        identify(session.user.id, { email: session.user.email })
        if (event === 'SIGNED_IN') track('signed_in')
        // Arriving from a reset link: the session is real, but the member still
        // has to choose a password before it means anything.
        if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      } else {
        setProfile(null)
        reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Completes an OAuth round trip in the native app: the provider hands control
  // back through com.zeroclub.app://auth-callback carrying the code to exchange.
  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) return
    let remove
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url?.includes('auth-callback')) return
        const code = new URL(url.replace('com.zeroclub.app://', 'https://x/')).searchParams.get('code')
        if (code) await supabase.auth.exchangeCodeForSession(code)
      }).then((h) => { remove = () => h.remove() })
    })
    return () => { if (remove) remove() }
  }, [])

  const signIn = async (email) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
  }

  const signInWithPassword = async (email, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUpWithPassword = async (email, password) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    // Attribute the invite that brought them here, if any
    const referredBy = localStorage.getItem('zc_ref') || undefined
    const result = await supabase.auth.signUp({
      email,
      password,
      options: referredBy ? { data: { referred_by: referredBy } } : undefined,
    })
    if (!result.error) track('signed_up', referredBy ? { referred_by: referredBy } : undefined)
    return result
  }

  // The link lands back on the app with a recovery session, which is what
  // PASSWORD_RECOVERY below listens for.
  const sendPasswordReset = async (email) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?recovery=1`,
    })
  }

  const setNewPassword = async (password) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.updateUser({ password })
  }

  // In the native shell the browser cannot redirect back to a web origin, so
  // OAuth returns through the app's own URL scheme and is completed by the
  // deep-link listener below. On the web this stays an ordinary redirect.
  const oauthRedirect = () =>
    Capacitor.isNativePlatform() ? 'com.zeroclub.app://auth-callback' : window.location.origin

  const signInWithProvider = async (provider) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: oauthRedirect(),
        skipBrowserRedirect: Capacitor.isNativePlatform(),
      },
    })
  }

  const signInWithGoogle = () => signInWithProvider('google')
  const signInWithApple = () => signInWithProvider('apple')

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }

  const isPro = profile?.is_pro ?? false

  return (
    <AuthContext.Provider value={{ user, profile, isPro, loading, signIn, signInWithPassword, signUpWithPassword, signInWithGoogle, signInWithApple, signOut, sendPasswordReset, setNewPassword, recovering, endRecovery: () => setRecovering(false) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
