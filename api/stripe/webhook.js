import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Service-role client bypasses RLS — only used server-side here
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export const config = { api: { bodyParser: false } }

const getRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const session = event.data.object

  try {
    if (event.type === 'checkout.session.completed') {
      const userId = session.metadata?.supabase_user_id
      if (userId) {
        await supabaseAdmin.from('profiles').update({ is_pro: true }).eq('id', userId)
        console.log(`Pro activated for user ${userId}`)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      // Resolve user by customer ID — stored in the session when checkout completed
      const customerId = session.customer
      if (customerId) {
        // Look up the Stripe customer to find the email, then match Supabase user
        const customer = await stripe.customers.retrieve(customerId)
        if (customer.email) {
          // Find Supabase user by email and revoke Pro
          const { data } = await supabaseAdmin.auth.admin.listUsers()
          const match = data?.users?.find((u) => u.email === customer.email)
          if (match) {
            await supabaseAdmin.from('profiles').update({ is_pro: false }).eq('id', match.id)
            console.log(`Pro revoked for user ${match.id}`)
          }
        }
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }

  res.json({ received: true })
}
