import { connect } from 'node:http2'
import { createPrivateKey, sign } from 'node:crypto'
import { APPLE_CLIENT_ID } from './apple.js'

// Sending to Apple Push Notification service. APNs only speaks HTTP/2, which
// fetch() does not, so this talks to it with node:http2 directly.
//
// Needs an APNs key from the developer account (Keys → +, tick Apple Push
// Notifications service): APNS_KEY_ID and APNS_PRIVATE_KEY, plus the
// APPLE_TEAM_ID already set for Sign in with Apple.

export const apnsConfigured = () =>
  Boolean(process.env.APPLE_TEAM_ID && process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY)

const HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

// Apple wants the provider token reused rather than minted per push — it
// rejects tokens refreshed more often than every twenty minutes — and expires
// it after an hour. Fifty minutes sits safely between the two. Kept in module
// scope, so a warm function reuses it across requests.
let cached = { token: null, at: 0 }
const providerToken = () => {
  const now = Math.floor(Date.now() / 1000)
  if (cached.token && now - cached.at < 50 * 60) return cached.token
  const header = { alg: 'ES256', kid: process.env.APNS_KEY_ID }
  const payload = { iss: process.env.APPLE_TEAM_ID, iat: now }
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const key = createPrivateKey(process.env.APNS_PRIVATE_KEY.replace(/\\n/g, '\n'))
  const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' })
  cached = { token: `${input}.${b64url(signature)}`, at: now }
  return cached.token
}

const sendOne = (session, token, body, { collapseId, threadId } = {}) => new Promise((resolve) => {
  const headers = {
    ':method': 'POST',
    ':path': `/3/device/${token}`,
    authorization: `bearer ${providerToken()}`,
    'apns-topic': APPLE_CLIENT_ID,
    'apns-push-type': 'alert',
    'apns-priority': '10',
  }
  if (collapseId) headers['apns-collapse-id'] = collapseId
  const req = session.request(headers)
  let status = 0
  let text = ''
  req.setEncoding('utf8')
  req.on('response', (h) => { status = h[':status'] })
  req.on('data', (chunk) => { text += chunk })
  req.on('end', () => {
    let reason = null
    try { reason = text ? JSON.parse(text).reason : null } catch { /* empty */ }
    resolve({ token, status, reason })
  })
  req.on('error', (err) => resolve({ token, status: 0, reason: err.message }))
  req.end(JSON.stringify({
    aps: {
      alert: { title: body.title, body: body.body },
      sound: 'default',
      ...(threadId ? { 'thread-id': threadId } : {}),
    },
    ...body.data,
  }))
})

const sendAll = (environment, tokens, body, options) => new Promise((resolve) => {
  const session = connect(HOSTS[environment])
  session.on('error', () => resolve(tokens.map((token) => ({ token, status: 0, reason: 'connection' }))))
  Promise.all(tokens.map((t) => sendOne(session, t, body, options)))
    .then((results) => { session.close(); resolve(results) })
})

// A token is dead when Apple says so: 410 Unregistered (the app was deleted),
// or BadDeviceToken from both environments.
const dead = (r) => r.status === 410 || r.reason === 'Unregistered' || r.reason === 'BadDeviceToken'

// Sends one notification to many devices. Builds run from Xcode get sandbox
// tokens and TestFlight or App Store builds get production ones, and a token
// doesn't say which it is — so production goes first, and anything it calls a
// bad token is tried once on sandbox before being written off.
//
// Returns the tokens Apple has said will never work again, for the caller to
// delete.
export const sendPush = async (tokens, body, options = {}) => {
  if (!tokens.length) return { sent: 0, deadTokens: [] }
  const first = await sendAll('production', tokens, body, options)
  const retry = first.filter((r) => r.reason === 'BadDeviceToken').map((r) => r.token)
  const second = retry.length ? await sendAll('sandbox', retry, body, options) : []
  const settled = [...first.filter((r) => r.reason !== 'BadDeviceToken'), ...second]
  for (const r of settled) {
    if (r.status !== 200 && !dead(r)) console.error('APNs send failed:', r.status, r.reason)
  }
  return {
    sent: settled.filter((r) => r.status === 200).length,
    deadTokens: settled.filter(dead).map((r) => r.token),
  }
}
