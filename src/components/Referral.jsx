import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { track } from '../lib/analytics.js'

// Referrals, framed the way this product should grow: you don't "invite friends
// to an app", you ask someone who's struggling to walk it with you. Debt is
// isolating — that's the actual pitch.

// Stable short code derived from the user id, so it needs no storage.
const referralCode = (user) => {
  if (!user?.id) return ''
  return user.id.replace(/-/g, '').slice(0, 6).toUpperCase()
}

const Referral = () => {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const code = referralCode(user)
  const link = `${window.location.origin}/?ref=${code}`
  const message = `I'm paying off my debt with Zero Club — it tracks every payment and the community actually cheers you on. Want to do it with me? ${link}`

  const share = async () => {
    track('referral_shared')
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Zero Club', text: message, url: link })
        return
      } catch { /* user dismissed the sheet — fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm dark:bg-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Bring someone with you</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">
        Debt is isolating — that's most of what makes it hard. If someone in your life is carrying it quietly,
        this is easier together.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 dark:bg-slate-900">
        <span className="text-[11px] uppercase tracking-widest text-slate-500">Your code</span>
        <span className="font-mono text-sm font-bold tracking-widest text-emerald-400">{code}</span>
      </div>
      <button
        onClick={share}
        className="mt-3 w-full rounded-full bg-white py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
      >
        {copied ? 'Copied — go send it ✓' : 'Share your invite'}
      </button>
    </div>
  )
}

export default Referral
