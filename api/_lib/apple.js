import { createPrivateKey, sign } from 'node:crypto'

// Talking to Apple's Sign in with Apple REST API from the server. Used to trade
// a sign-in's one-time authorization code for a refresh token, and to revoke
// that token when the member deletes their account — which Apple requires of
// every app offering Sign in with Apple.
//
// Files under an underscore-prefixed folder are not deployed as endpoints.

export const APPLE_CLIENT_ID = process.env.APPLE_BUNDLE_ID || 'com.zeroclub.app'

export const appleConfigured = () =>
  Boolean(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY)

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

// Apple authenticates the app with a JWT signed by the .p8 key from the
// developer account. Minted per request and valid for five minutes, so unlike
// the long-lived secret Supabase's web flow needs, there is nothing to renew.
export const clientSecret = () => {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'ES256', kid: process.env.APPLE_KEY_ID }
  const payload = {
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  }
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  // Environment variables often carry the key's newlines as literal "\n".
  const key = createPrivateKey(process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'))
  // ES256 as JWT expects it: the raw r||s signature, not DER.
  const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' })
  return `${input}.${b64url(signature)}`
}

const post = async (path, params) => {
  const res = await fetch(`https://appleid.apple.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { ok: res.ok, status: res.status, body }
}

export const exchangeCode = (code) =>
  post('/auth/token', { client_id: APPLE_CLIENT_ID, client_secret: clientSecret(), code, grant_type: 'authorization_code' })

export const revokeToken = (token) =>
  post('/auth/revoke', { client_id: APPLE_CLIENT_ID, client_secret: clientSecret(), token, token_type_hint: 'refresh_token' })
