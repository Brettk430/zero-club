import { useEffect, useState } from 'react'

// The first thing someone sees on opening the app. It starts on the exact frame
// the native launch screen and the pre-React boot mark end on — the mark,
// centred, 88px, on the ground — so the three read as one continuous motion
// rather than three screens. Once per launch: moving around inside the app
// never replays it.
const SEEN = 'zc_entered'

const calm = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}
const seen = () => {
  try { return sessionStorage.getItem(SEEN) === '1' } catch { return true }
}

const Entrance = () => {
  const [show, setShow] = useState(() => !seen())
  const [still] = useState(calm)

  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem(SEEN, '1') } catch { /* ignore */ }
    const t = setTimeout(() => setShow(false), still ? 450 : 1650)
    return () => clearTimeout(t)
  }, [show, still])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[90] bg-[#071615]"
      style={{ animation: `zc-out 380ms ease-in ${still ? 80 : 1270}ms forwards` }}
    >
      {/* Centred on its own so the words appearing below never nudge it off
          the spot the boot mark occupied. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <img
          src="/brand/mark.png"
          alt=""
          width="88"
          height="88"
          className="h-[88px] w-[88px]"
          style={still ? undefined : { animation: 'zc-mark-in 900ms cubic-bezier(.2,.7,.2,1) both' }}
        />
      </div>
      <div className="absolute inset-x-0 top-1/2 mt-[68px] text-center">
        <p
          className="text-xl font-black uppercase tracking-[0.28em] text-[#F5F5EF]"
          style={{ fontFamily: 'Sora, sans-serif', animation: still ? undefined : 'zc-rise 520ms ease-out 380ms both' }}
        >
          Zero Club
        </p>
        <p
          className="mt-2 text-sm font-semibold text-[#C6FF3D]"
          style={{ animation: still ? undefined : 'zc-rise 520ms ease-out 560ms both' }}
        >
          Get to $0. Together.
        </p>
      </div>
    </div>
  )
}

export default Entrance
