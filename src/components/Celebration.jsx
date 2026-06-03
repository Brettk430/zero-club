import { useEffect, useState } from 'react'

const Burst = ({ style }) => (
  <div className="pointer-events-none absolute" style={style}>
    <div className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />
  </div>
)

const Celebration = ({ milestone, onDone }) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 4000)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-6">
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Burst dots */}
        {[...Array(8)].map((_, i) => (
          <Burst key={i} style={{
            top: `${10 + Math.sin(i * Math.PI / 4) * 30}%`,
            left: `${50 + Math.cos(i * Math.PI / 4) * 40}%`,
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}

        <div className="relative p-8 text-center">
          {/* Trophy ring */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-white">
              <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.798 49.798 0 00-6.093-.377 49.78 49.78 0 00-6.093.377.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
            </svg>
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Achievement Unlocked
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {milestone.label}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {milestone.description}
          </p>

          <button
            onClick={() => { setVisible(false); onDone?.() }}
            className="mt-7 w-full rounded-full bg-yellow-400 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  )
}

export default Celebration
