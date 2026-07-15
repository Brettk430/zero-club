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

  return `\nUSER'S ACTUAL MONTHLY PROGRESS (real check-ins they logged):
${lines.join('\n')}

Use this history to give highly personalized advice. Reference specific months, note if they're consistently ahead or behind, acknowledge hard months, and help them get back on track if needed.`
}

const buildSystemPrompt = (debts, monthlyIncome, progressLogs) => {
  if (!debts || debts.length === 0) {
    return `Your name is Miles. You are a behavior coach for Zero, a debt accountability platform. The user hasn't entered their debts yet. Encourage them to add their debts in the Calculator so you can give them personalized, specific guidance. Keep it warm, brief, and actionable.`
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0)
  const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0)
  const sorted = [...debts].sort((a, b) => Number(b.rate) - Number(a.rate))
  const highestRate = sorted[0]

  const debtList = sorted
    .map((d) => `- ${clip(d.name, 80)}: $${Number(d.balance).toLocaleString()} balance, ${Number(d.rate) || 0}% APR, $${Number(d.minPayment) || 0}/mo minimum`)
    .join('\n')

  return `Your name is Miles. You are a behavior coach for Zero, a debt accountability platform. Your job is NOT to answer generic financial questions — your job is to help users stay consistent with their debt payoff plan over months and years.

USER'S DEBT DATA:
Monthly income: $${Number(monthlyIncome || 0).toLocaleString()}
Total debt: $${totalBalance.toLocaleString()}
Total minimum payments: $${totalMinPayments.toLocaleString()}/mo
Priority debt (attack first): ${clip(highestRate.name, 80)} at ${Number(highestRate.rate) || 0}%

All debts:
${debtList}
${buildProgressSection(progressLogs)}
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
      system: buildSystemPrompt(debts, monthlyIncome, progressLogs),
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
