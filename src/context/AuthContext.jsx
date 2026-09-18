import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Capacitor } from '@capacitor/core'
import { identify, reset, track } from '../lib/analytics.js'

const AuthContext = createContext(null)

// Where every emailed link and OAuth provider hands control back to the native
// app. Must be in Supabase's redirect allow-list, or Supabase silently swaps in
// the Site URL and the member lands in Safari instead.
const NATIVE_CALLBACK = 'com.zeroclub.app://auth-callback'
const isNative = () => Capacitor.isNativePlatform()

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
        // Account id only: analytics has no need for the address, and keeping it
        // out means the privacy policy can promise as much.
        identify(session.user.id)
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

  // Completes a sign-in round trip in the native app. OAuth, magic links and
  // password resets all hand control back through NATIVE_CALLBACK.
  //
  // This client uses the implicit flow, so tokens arrive in the URL fragment
  // (#access_token=…). Reading only a ?code= query — the PKCE shape — is what
  // made every native sign-in return to the app and silently do nothing. Both
  // shapes are handled so a later switch to PKCE can't reintroduce that.
  useEffect(() => {
    if (!supabase || !isNative()) return
    let remove
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url?.includes('auth-callback')) return
        const parsed = new URL(url.replace('com.zeroclub.app://', 'https://x/'))
        const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
        const code = parsed.searchParams.get('code')
        const accessToken = fragment.get('access_token')
        const refreshToken = fragment.get('refresh_token')

        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          // setSession reports SIGNED_IN, not PASSWORD_RECOVERY, so a reset link
          // has to be recognised here or the member skips choosing a password.
          if (fragment.get('type') === 'recovery') setRecovering(true)
        }

        // The sign-in sheet has done its job either way.
        import('@capacitor/browser').then(({ Browser }) => Browser.close()).catch(() => {})
      }).then((h) => { remove = () => h.remove() })
    })
    return () => { if (remove) remove() }
  }, [])

  const signIn = async (email) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: isNative() ? NATIVE_CALLBACK : window.location.origin },
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
      redirectTo: isNative() ? NATIVE_CALLBACK : `${window.location.origin}/?recovery=1`,
    })
  }

  const setNewPassword = async (password) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return supabase.auth.updateUser({ password })
  }

  // In the native shell the browser cannot redirect back to a web origin, so
  // OAuth returns through the app's own URL scheme and is completed by the
  // deep-link listener below. On the web this stays an ordinary redirect.
  const oauthRedirect = () => (isNative() ? NATIVE_CALLBACK : window.location.origin)

  const signInWithProvider = async (provider) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const result = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: oauthRedirect(),
        skipBrowserRedirect: isNative(),
      },
    })
    // skipBrowserRedirect hands back the provider URL instead of navigating, and
    // nothing used to open it — so on iOS the button did nothing at all. It opens
    // in Safari's in-app sheet: Google refuses sign-in inside an embedded web view.
    if (isNative() && !result.error && result.data?.url) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: result.data.url, presentationStyle: 'popover' })
    }
    return result
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
