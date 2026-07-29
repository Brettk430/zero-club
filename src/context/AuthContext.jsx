import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { identify, reset, track } from '../lib/analytics.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
      } else {
        setProfile(null)
        reset()
      }
    })

    return () => subscription.unsubscribe()
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
    const result = await supabase.auth.signUp({ email, password })
    if (!result.error) track('signed_up')
    return result
  }

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }

  const isPro = profile?.is_pro ?? false

  return (
    <AuthContext.Provider value={{ user, profile, isPro, loading, signIn, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
