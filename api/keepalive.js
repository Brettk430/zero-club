// Hit daily by Vercel cron (see vercel.json) to keep the free-tier Supabase
// project from auto-pausing after ~1 week of inactivity. Any authenticated
// query counts as activity; auth health alone does not touch the database.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    const ping = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    return res.status(ping.ok ? 200 : 502).json({ ok: ping.ok, status: ping.status })
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message })
  }
}
