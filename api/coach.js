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
    return `Your name is Miles. You are a behavior coach for Zero, a debt accountability platform. The user hasn't entered their debts yet. Encourage them to add their debts in the Calculator so you can give them personalized, specific guidance. Keep it warm, brief, and actionable.`
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0)
  const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0)
  const sorted = [...debts].sort((a, b) => Number(b.rate) - Number(a.rate))
  const highestRate = sorted[0]

  const debtList = sorted
    .map((d) => `- ${d.name}: $${Number(d.balance).toLocaleString()} balance, ${d.rate}% APR, $${d.minPayment}/mo minimum`)
    .join('\n')

  return `Your name is Miles. You are a behavior coach for Zero, a debt accountability platform. Your job is NOT to answer generic financial questions — your job is to help users stay consistent with their debt payoff plan over months and years.

USER'S DEBT DATA:
Monthly income: $${Number(monthlyIncome || 0).toLocaleString()}
Total debt: $${totalBalance.toLocaleString()}
Total minimum payments: $${totalMinPayments.toLocaleString()}/mo
Priority debt (attack first): ${highestRate.name} at ${highestRate.rate}%

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
