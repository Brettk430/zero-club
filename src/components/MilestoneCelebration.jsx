import { useEffect, useState } from 'react'
import { money } from '../lib/zero.js'
import { shareProgress } from '../lib/shareCard.js'
import { celebrate } from '../lib/native.js'

// Crossing a milestone is the emotional peak of the whole product, and it is
// also the only moment someone reliably wants to tell people. So the
// celebration and the share live in the same breath.

const CONFETTI = ['#34d399', '#ffffff', '#fbbf24', '#60a5fa', '#f472b6']

const Confetti = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {Array.from({ length: 40 }).map((_, i) => {
      const left = (i * 37) % 100
      const delay = (i % 10) * 0.12
      const size = 6 + (i % 4) * 3
      return (
        <span
          key={i}
          className="absolute top-0 animate-[zc-fall_2.6s_linear_forwards] rounded-[2px]"
          style={{
            left: `${left}%`,
            width: size,
            height: size * 1.6,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${delay}s`,
            transform: `rotate(${(i * 47) % 360}deg)`,
          }}
        />
      )
    })}
  </div>
)

const MilestoneCelebration = ({ milestone, stats, onClose }) => {
  const [sharing, setSharing] = useState(false)
  const [note, setNote] = useState('')

  // The animation is decorative; anyone who has asked for less motion gets the
  // card without the falling pieces.
  const [motionOk] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => { celebrate() }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const share = async () => {
    setSharing(true)
    const outcome = await shareProgress({ ...stats, milestoneLabel: milestone.label })
    setSharing(false)
    if (outcome === 'downloaded') setNote('Saved to your device, caption copied.')
    else if (outcome === 'failed') setNote("Couldn't build the card — try again.")
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm">
      {motionOk && <Confetti />}
      <div className="relative w-full max-w-sm rounded-[28px] bg-slate-950 p-8 text-center text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-6xl">{milestone.emoji}</p>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Milestone</p>
        <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight">{milestone.label}</h2>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          {money(stats.starting - stats.remaining)} eliminated. {money(stats.remaining)} to go.
        </p>

        <button
          onClick={share}
          disabled={sharing}
          className="mt-8 w-full rounded-full bg-emerald-500 py-4 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {sharing ? 'Building your card…' : 'Share it'}
        </button>
        {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
        <button onClick={onClose} className="mt-3 w-full py-2.5 text-sm font-semibold text-slate-400 transition hover:text-white">
          Keep going
        </button>
      </div>
    </div>
  )
}

export default MilestoneCelebration
