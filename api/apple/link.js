import { createClient } from '@supabase/supabase-js'
import { appleConfigured, exchangeCode } from '../_lib/apple.js'

// Called by the app right after a native Sign in with Apple. Trades the one-time
// authorization code for a refresh token and keeps it server-side, because
// Apple requires that token be revoked if the member deletes their account.
// The token never goes back to the device.

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!appleConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Sign in with Apple is not configured on the server' })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Session expired' })

  // Only an account that actually signed in with Apple has a token to hold.
  const viaApple = (user.identities || []).some((i) => i.provider === 'apple')
  if (!viaApple) return res.status(400).json({ error: 'Not an Apple account' })

  const code = typeof req.body?.code === 'string' ? req.body.code : ''
  if (!code) return res.status(400).json({ error: 'Missing authorization code' })

  const result = await exchangeCode(code)
  const refreshToken = result.body?.refresh_token
  if (!result.ok || !refreshToken) {
    console.error('Apple code exchange failed:', result.status, result.body)
    return res.status(502).json({ error: 'Apple did not accept the code' })
  }

  const { error } = await admin.from('apple_credentials')
    .upsert({ user_id: user.id, refresh_token: refreshToken, updated_at: new Date().toISOString() })
  if (error) {
    console.error('Storing Apple credential failed:', error.message)
    return res.status(500).json({ error: 'Could not store the credential' })
  }
  return res.status(200).json({ linked: true })
}
