import { createClient } from '@supabase/supabase-js'

// Monthly check-in reminders — the part of accountability the app can't do
// by waiting. Invoked daily by Vercel cron (vercel.json); only actually sends
// on the 1st (check-in day) and the 8th (nudge for anyone still missing).
//
// Requires RESEND_API_KEY (resend.com — free tier is plenty). Without it the
// endpoint runs as a dry run and just reports who WOULD be emailed.

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const monthLabel = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)

const buildEmail = (firstName, isNudge, appUrl) => ({
  subject: isNudge
    ? 'Your check-in is still open'
    : `It's check-in day${firstName ? `, ${firstName}` : ''}`,
  html: `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
      <p style="font-size:13px;font-weight:700;letter-spacing:2px;color:#2563eb">ZERO CLUB</p>
      <h1 style="font-size:22px;margin:16px 0 8px">${isNudge ? "Still time to log this month." : 'New month. Same mission.'}</h1>
      <p style="font-size:15px;line-height:1.6;color:#475569">
        ${isNudge
          ? "You haven't checked in yet this month. Two minutes: log your balances, keep the streak honest, and get back to your life."
          : 'Log last month’s balances and see the line drop. Two minutes, once a month — that’s the whole habit.'}
      </p>
      <a href="${appUrl}/plan" style="display:inline-block;margin-top:16px;background:#facc15;color:#0f172a;font-weight:600;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none">
        Check in now →
      </a>
      <p style="margin-top:28px;font-size:12px;color:#94a3b8">
        You're getting this because you track your debt payoff on Zero Club.
        Turn reminders off any time in your <a href="${appUrl}/profile" style="color:#64748b">Profile</a>.
      </p>
    </div>`,
})

export default async function handler(req, res) {
  // Vercel cron sends Authorization: Bearer CRON_SECRET when the env var is set
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const today = new Date()
  const day = today.getUTCDate()
  const isCheckinDay = day === 1
  const isNudgeDay = day === 8
  // Manual dry-run for testing, any day (?dry=1). req.query exists on Vercel;
  // fall back to parsing the URL under the local dev proxy.
  const force = (req.query?.dry ?? new URL(req.url, 'http://localhost').searchParams.get('dry')) === '1'

  if (!isCheckinDay && !isNudgeDay && !force) {
    return res.status(200).json({ skipped: true, reason: `day ${day} — reminders go out on the 1st and 8th` })
  }

  try {
    // Everyone who has logged a check-in for the current month
    const currentMonth = monthLabel(today)
    const { data: logs } = await supabaseAdmin
      .from('progress_logs')
      .select('user_id')
      .eq('logged_month', currentMonth)
    const checkedIn = new Set((logs || []).map((l) => l.user_id))

    // All users; skip already-checked-in, opted-out, and those with no plan yet
    const { data: userData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersErr) throw usersErr

    const recipients = (userData?.users || []).filter((u) => {
      if (!u.email || checkedIn.has(u.id)) return false
      const meta = u.user_metadata || {}
      if (meta.reminders === false) return false
      return Array.isArray(meta.zc_data?.debts) && meta.zc_data.debts.length > 0
    })

    if (!process.env.RESEND_API_KEY || force) {
      return res.status(200).json({ dryRun: true, wouldEmail: recipients.length, day })
    }

    const appUrl = process.env.APP_URL || 'https://zero-club.vercel.app'
    const from = process.env.EMAIL_FROM || 'Zero Club <onboarding@resend.dev>'
    let sent = 0

    for (const u of recipients) {
      const firstName = (u.user_metadata?.full_name || '').split(' ')[0]
      const { subject, html } = buildEmail(firstName, isNudgeDay, appUrl)
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: u.email, subject, html }),
      })
      if (resp.ok) sent += 1
      else console.error('Reminder failed for', u.id, await resp.text())
    }

    return res.status(200).json({ sent, eligible: recipients.length, day })
  } catch (err) {
    console.error('Reminders error:', err)
    return res.status(500).json({ error: err.message })
  }
}
