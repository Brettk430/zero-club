import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Client-supplied strings are capped before entering the prompt (endpoint is public)
const clip = (value, max) => String(value ?? '').slice(0, max)

// Best-effort per-IP rate limit. Serverless instances don't share memory, so
// this bounds abuse per warm instance rather than globally — pair with a
// platform-level rule (Vercel Firewall) for hard guarantees.
const RATE_WINDOW_MS = 5 * 60 * 1000
const RATE_MAX = 20
const hitLog = new Map()
const rateLimited = (ip) => {
  if (hitLog.size > 5000) hitLog.clear()
  const now = Date.now()
  const recent = (hitLog.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    hitLog.set(ip, recent)
    return true
  }
  recent.push(now)
  hitLog.set(ip, recent)
  return false
}

// Per-account daily cap. Zero Club is free, so Miles is the one genuine
// per-user cost — this keeps an enthusiastic member from running up an
// unbounded Anthropic bill. Set well above normal use: a heavy day is a
// handful of messages, not dozens.
const DAILY_MESSAGE_CAP = 25
const dailyLog = new Map() // `${userId}:${YYYY-MM-DD}` -> count

// Cost attribution, NOT authorization: we read `sub` from the access token
// without verifying its signature. Forging one only moves a request between
// buckets — the per-IP limit above remains the actual abuse boundary — and
// this avoids a blocking round-trip to Supabase on every message.
const accountFromToken = (authHeader) => {
  const token = (authHeader || '').replace(/^Bearer\s+/i, '')
  if (!token.includes('.')) return null
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    if (!payload?.sub) return null
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload.sub
  } catch {
    return null
  }
}

const overDailyCap = (userId) => {
  if (!userId) return false
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`
  if (dailyLog.size > 10000) dailyLog.clear()
  const count = dailyLog.get(key) || 0
  if (count >= DAILY_MESSAGE_CAP) return true
  dailyLog.set(key, count + 1)
  return false
}

const buildProgressSection = (progressLogs) => {
  if (!progressLogs || progressLogs.length === 0) return ''

  const lines = progressLogs.map((log) => {
    if (!log.debt_balances?.length) return null
    const debtSummary = log.debt_balances.slice(0, 50).map((d) => {
      const diff = Number(d.startingBalance) - Number(d.actualBalance)
      const status = diff > 0 ? `$${diff.toLocaleString()} ahead` : diff < 0 ? `$${Math.abs(diff).toLocaleString()} behind` : 'on track'
      return `${clip(d.name, 80)}: $${Number(d.actualBalance).toLocaleString()} actual (${status})`
    }).join(', ')
    return `${clip(log.logged_month, 40)}: ${debtSummary}${log.notes ? ` | Note: "${clip(log.notes, 500)}"` : ''}`
  }).filter(Boolean)

  if (!lines.length) return ''

  // Months arrive as labels like "May 2026" — detect how stale the latest is
  const latest = new Date(`1 ${progressLogs[0]?.logged_month}`)
  const now = new Date()
  const gap = Number.isNaN(latest.getTime())
    ? 0
    : (now.getFullYear() - latest.getFullYear()) * 12 + (now.getMonth() - latest.getMonth())

  return `\nUSER'S ACTUAL MONTHLY PROGRESS (real check-ins they logged):
${lines.join('\n')}
${gap >= 2 ? `\nIMPORTANT: their last check-in was ${gap} months ago. They lapsed and may feel guilty about it. Normalize the gap without dwelling on it — a lapse is a data point, not a verdict — then focus on one small restart action for this week. Never lecture about the missed months.` : ''}
Use this history to give highly personalized advice. Reference specific months, note if they're consistently ahead or behind, acknowledge hard months, and help them get back on track if needed.`
}

// Payments are the app's core loop — Miles is useless if he can't see them.
const buildActivitySection = (activity) => {
  if (!activity) return ''
  const { paidTotal, paymentCount, streakWeeks, lastPaymentDays, thisMonthPaid, buffer } = activity
  const lines = []

  if (paymentCount) {
    lines.push(`Payments logged: ${paymentCount} totalling $${Number(paidTotal || 0).toLocaleString()}`)
    lines.push(`Logged this month: $${Number(thisMonthPaid || 0).toLocaleString()}`)
    if (streakWeeks > 0) lines.push(`Current streak: ${streakWeeks} consecutive week(s) with a payment`)
    if (lastPaymentDays != null) lines.push(`Last payment: ${lastPaymentDays} day(s) ago`)
  } else {
    lines.push('No payments logged yet — the habit hasn\'t started.')
  }

  if (buffer) {
    lines.push(buffer.funded
      ? `Safety net: FUNDED ($${Number(buffer.saved).toLocaleString()} of $${Number(buffer.target).toLocaleString()}). Surprise expenses won't derail them — encourage maximum debt attack.`
      : `Safety net: $${Number(buffer.saved).toLocaleString()} of $${Number(buffer.target).toLocaleString()} saved. Until it's full, a surprise bill turns into new debt.`)
  } else {
    lines.push('Safety net: none started. If they mention stress, surprise costs, or falling off plan, suggest a $1,000 starter buffer before extra debt payments.')
  }

  const stale = lastPaymentDays != null && lastPaymentDays > 45
  return `\nTHEIR ACTIVITY IN THE APP:
${lines.join('\n')}
${stale ? 'IMPORTANT: it has been a while since their last logged payment. Welcome them back warmly, no guilt, and name one small action for this week.' : ''}`
}

const buildSystemPrompt = (debts, monthlyIncome, progressLogs, method, activity) => {
  if (!debts || debts.length === 0) {
    return `Your name is Miles. You are a behavior coach for Zero, a debt accountability platform. The user hasn't entered their debts yet. Encourage them to add their debts in the Calculator so you can give them personalized, specific guidance. Keep it warm, brief, and actionable.`
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0)
  const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0)
  const snowball = method === 'snowball'
  const sorted = [...debts].sort((a, b) =>
    snowball ? Number(a.balance) - Number(b.balance) : Number(b.rate) - Number(a.rate))
  const priority = sorted[0]
  const highApr = debts.filter((d) => Number(d.rate) >= 20)

  const debtList = sorted
    .map((d) => `- ${clip(d.name, 80)}: $${Number(d.balance).toLocaleString()} balance, ${Number(d.rate) || 0}% APR, $${Number(d.minPayment) || 0}/mo minimum`)
    .join('\n')

  return `Your name is Miles. You are a behavior coach for Zero, a debt accountability platform. Your job is NOT to answer generic financial questions — your job is to help users stay consistent with their debt payoff plan over months and years.

USER'S DEBT DATA:
Monthly income: $${Number(monthlyIncome || 0).toLocaleString()}
Total debt: $${totalBalance.toLocaleString()}
Total minimum payments: $${totalMinPayments.toLocaleString()}/mo
Chosen strategy: ${snowball ? 'Snowball (smallest balance first — they chose early wins over minimum interest; respect that choice)' : 'Avalanche (highest rate first)'}
Priority debt (attack first): ${clip(priority.name, 80)} — $${Number(priority.balance).toLocaleString()} at ${Number(priority.rate) || 0}%

All debts:
${debtList}
${buildActivitySection(activity)}
${buildProgressSection(progressLogs)}
ANSWERING "CAN I AFFORD THIS?":
This is the highest-value question they can ask you, and it is never a yes/no lecture.
Translate the purchase into their own numbers: what it costs in payoff time (roughly
purchase ÷ their monthly payment = months added), and what the same money does against
their priority debt. Then let them decide — say plainly that one purchase rarely ruins
a plan, and that a plan they resent is one they'll quit. If they have no safety net and
the purchase is large, that's the more urgent point. Never shame a want.

REAL-WORLD LEVERS (raise when relevant, never as a lecture):
${highApr.length ? `- ${highApr.map((d) => clip(d.name, 80)).join(', ')} ${highApr.length === 1 ? 'is' : 'are'} at 20%+ APR. A 0% balance-transfer card or a consolidation loan could cut that dramatically — worth suggesting they check their options if their credit allows. Mention the transfer fee (3-5%) honestly.` : '- No debts above 20% APR — consolidation is unlikely to beat their current plan.'}
- If they mention surprise expenses knocking them off plan, recommend pausing the attack to build a $500–$1,000 starter buffer first. A plan that survives a flat tire beats a perfect plan that doesn't.
- Interest rates on cards are sometimes negotiable — one phone call asking for a lower APR costs nothing.

YOUR COACHING APPROACH:
- Focus on behavior, not math. The user knows what to do — help them actually do it.
- When someone is struggling: acknowledge it, find the specific obstacle, suggest one concrete action.
- When someone is succeeding: celebrate specifically, reinforce what's working, raise the bar slightly.
- Identify spending leaks if they describe their situation. Suggest exactly one thing to cut or sell.
- Generate weekly action items: small, specific, doable in the next 7 days.
- Use their real numbers. Never give generic advice when you have their actual data.
- After setbacks: no lectures. Ask what happened, then help them get back on track this week.
- Responses: 2–4 sentences unless a detailed breakdown is genuinely needed. Be direct.
- You are Miles. Never call yourself AI or assistant.`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — give Miles a few minutes to catch his breath' })
  }

  if (overDailyCap(accountFromToken(req.headers.authorization))) {
    return res.status(429).json({
      error: "You've hit today's coaching limit — Miles will be right here tomorrow. Your plan and progress are unaffected.",
    })
  }

  const body = req.body || {}
  const { question, monthlyIncome, history } = body

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required' })
  }

  // This endpoint is unauthenticated — cap every client-supplied field so a
  // single request can't stuff megabytes of text into the model context.
  if (question.length > 2000) {
    return res.status(400).json({ error: 'Question is too long (2000 character max)' })
  }
  const debts = Array.isArray(body.debts) ? body.debts.slice(0, 50) : body.debts
  const progressLogs = Array.isArray(body.progressLogs) ? body.progressLogs.slice(-24) : body.progressLogs
  const method = body.method === 'snowball' ? 'snowball' : 'avalanche'
  // Compact activity summary computed client-side; clamp the numbers we trust
  const activity = body.activity && typeof body.activity === 'object'
    ? {
        paidTotal: Number(body.activity.paidTotal) || 0,
        paymentCount: Number(body.activity.paymentCount) || 0,
        streakWeeks: Number(body.activity.streakWeeks) || 0,
        thisMonthPaid: Number(body.activity.thisMonthPaid) || 0,
        lastPaymentDays: body.activity.lastPaymentDays == null ? null : Number(body.activity.lastPaymentDays),
        buffer: body.activity.buffer
          ? {
              saved: Number(body.activity.buffer.saved) || 0,
              target: Number(body.activity.buffer.target) || 0,
              funded: Boolean(body.activity.buffer.funded),
            }
          : null,
      }
    : null

  // Prior turns from this session so Miles remembers the conversation.
  // Capped server-side; ignore malformed entries rather than failing the request.
  const priorTurns = Array.isArray(history)
    ? history
        .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.text.trim().slice(0, 4000) }))
    : []
  // The API requires the first message to be from the user
  while (priorTurns.length && priorTurns[0].role === 'assistant') priorTurns.shift()

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(debts, monthlyIncome, progressLogs, method, activity),
      messages: [...priorTurns, { role: 'user', content: question.trim() }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Coach API error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}
