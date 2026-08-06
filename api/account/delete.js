import { createClient } from '@supabase/supabase-js'

// Permanent account deletion. Apple guideline 5.1.1 requires any app that
// offers account creation to offer in-app deletion, and it's the right thing
// to do regardless — this is someone's financial history.
//
// Deleting the auth user cascades to profiles, progress_logs, posts,
// post_reactions and post_comments via ON DELETE CASCADE, so a single delete
// removes everything we hold.

const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured for account deletion' })
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })

  // Verify the token against Supabase rather than trusting its contents —
  // this deletes data permanently, so the caller must genuinely be that user.
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Session expired — sign in again to delete your account' })
  }

  try {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
    return res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('Account deletion failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
