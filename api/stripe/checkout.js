import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, userEmail, origin } = req.body || {}

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  try {
    const appUrl = origin || process.env.APP_URL || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      customer_email: userEmail || undefined,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      discounts: [{ coupon: 'FOUNDER' }],
      metadata: { supabase_user_id: userId },
      return_url: `${appUrl}/profile?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
    })

    res.json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
