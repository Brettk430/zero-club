import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const buildProgressSection = (progressLogs) => {
  if (!progressLogs || progressLogs.length === 0) return ''

  const lines = progressLogs.map((log) => {
    if (!log.debt_balances?.length) return null
    const debtSummary = log.debt_balances.map((d) => {
      const diff = Number(d.startingBalance) - Number(d.actualBalance)
      const status = diff > 0 ? `$${diff.toLocaleString()} ahead` : diff < 0 ? `$${Math.abs(diff).toLocaleString()} behind` : 'on track'
      return `${d.name}: $${Number(d.actualBalance).toLocaleString()} actual (${status})`
    }).join(', ')
    return `${log.logged_month}: ${debtSummary}${log.notes ? ` | Note: "${log.notes}"` : ''}`
  }).filter(Boolean)

  if (!lines.length) return ''

  return `\nUSER'S ACTUAL MONTHLY PROGRESS (real check-ins they logged):
${lines.join('\n')}

Use this history to give highly personalized advice. Reference specific months, note if they're consistently ahead or behind, acknowledge hard months, and help them get back on track if needed.`
}

const buildSystemPrompt = (debts, monthlyIncome, progressLogs) => {
  if (!debts || debts.length === 0) {
    return `Your name is Miles. You are a friendly, expert debt payoff coach for Zero Club, a debt freedom app. The user has not yet entered any debt data. Encourage them to add their debts in the Calculator tab so you can give personalized advice. Keep responses concise and actionable. Sign off naturally as Miles.`
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0)
  const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0)
  const sorted = [...debts].sort((a, b) => Number(b.rate) - Number(a.rate))
  const highestRate = sorted[0]

  const debtList = sorted
    .map((d) => `- ${d.name}: $${Number(d.balance).toLocaleString()} balance, ${d.rate}% APR, $${d.minPayment}/mo minimum`)
    .join('\n')

  return `Your name is Miles. You are an expert, friendly debt payoff coach for Zero Club. You help users pay off debt using the avalanche method (highest interest rate first).

USER'S DEBT DATA:
Monthly income: $${Number(monthlyIncome || 0).toLocaleString()}
Total debt: $${totalBalance.toLocaleString()}
Total minimum payments: $${totalMinPayments.toLocaleString()}/mo
Highest-rate debt: ${highestRate.name} at ${highestRate.rate}%

All debts (sorted by rate, highest first):
${debtList}
${buildProgressSection(progressLogs)}
COACHING STYLE:
- Be direct and specific — use their real numbers, not generic advice
- Answer what-if questions with concrete estimates ("about X months faster", "saves ~$Y in interest")
- For extra payment questions, always focus extra dollars on ${highestRate.name} first (avalanche method)
- When progress logs exist, reference them naturally — acknowledge wins, help recover from setbacks
- Keep responses concise: 2–4 sentences for simple questions, a short paragraph for complex ones
- Never be preachy about debt — be like a knowledgeable friend helping them win
- If asked about refinancing or balance transfers, mention it's worth exploring but focus on the plan they have
- You are Miles — refer to yourself by name if it feels natural, never call yourself "AI" or "assistant"`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, debts, monthlyIncome, progressLogs } = req.body || {}

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required' })
  }

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
      messages: [{ role: 'user', content: question.trim() }],
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
