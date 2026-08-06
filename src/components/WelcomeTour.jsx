import { useState } from 'react'
import { markTourSeen } from '../lib/localData.js'

// Shown once, right after onboarding. Four cards, skippable at any point —
// a tour that outstays its welcome is worse than none. The goal is only to
// teach the loop: log a payment, watch it move, don't do it alone.

const Ring = () => (
  <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
    <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-700" />
    <circle
      cx="60" cy="60" r="50" fill="none" strokeWidth="10" strokeLinecap="round"
      className="stroke-emerald-600 dark:stroke-emerald-500"
      strokeDasharray="314" strokeDashoffset="204"
    />
  </svg>
)

const PlusButton = () => (
  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 shadow-lg dark:bg-white">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-7 w-7 text-white dark:text-slate-900">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  </span>
)

const Bars = () => (
  <svg viewBox="0 0 120 70" className="h-24 w-28">
    {[24, 38, 30, 52, 62].map((h, i) => (
      <rect key={i} x={i * 24 + 4} y={70 - h} width="16" height={h} rx="4"
        className={i >= 3 ? 'fill-emerald-500' : 'fill-emerald-200 dark:fill-emerald-900'} />
    ))}
  </svg>
)

const Cheers = () => (
  <div className="flex items-end gap-1.5">
    <span className="text-4xl">👏</span>
    <span className="text-3xl">🎉</span>
    <span className="text-2xl">💬</span>
  </div>
)

const slides = [
  {
    art: <Ring />,
    title: 'This is your progress',
    body: 'The ring fills as your balance falls. Every number on the dashboard answers one question — are you closer to zero than yesterday?',
  },
  {
    art: <PlusButton />,
    title: 'Log every payment',
    body: 'Tap the + whenever you pay. It takes two taps, your balance drops on the spot, and that payment is what everything else is built on.',
  },
  {
    art: <Bars />,
    title: 'Watch it add up',
    body: 'Payments become streaks, charts and milestones. Progress shows you the months you showed up — and confetti when you cross a big one.',
  },
  {
    art: <Cheers />,
    title: 'Not on your own',
    body: 'Your payments post to the community feed under a handle — never your real name — and people cheer. Miles is there too, whenever you want a second opinion.',
  },
]

const WelcomeTour = ({ onClose }) => {
  const [i, setI] = useState(0)
  const last = i === slides.length - 1
  const slide = slides[i]

  const finish = () => {
    markTourSeen()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4 dark:bg-slate-950/70">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl sm:p-8 dark:bg-slate-900">
        <div className="flex justify-end">
          <button onClick={finish} className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Skip
          </button>
        </div>

        <div className="flex min-h-[7rem] items-center justify-center py-2">{slide.art}</div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{slide.title}</h2>
        <p className="mt-3 text-center text-sm leading-6 text-slate-600 dark:text-slate-300">{slide.body}</p>

        <div className="mt-6 flex justify-center gap-1.5">
          {slides.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-slate-900 dark:bg-white' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>

        <button
          onClick={() => (last ? finish() : setI((n) => n + 1))}
          className="mt-5 w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {last ? "Let's go →" : 'Next'}
        </button>
        {i > 0 && (
          <button onClick={() => setI((n) => n - 1)} className="mt-2 w-full py-2 text-sm text-slate-500 dark:text-slate-400">
            Back
          </button>
        )}
      </div>
    </div>
  )
}

export default WelcomeTour
