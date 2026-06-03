// Fading ring: 8 arc segments clockwise from 12 o'clock, each lighter than the last.
// The "zero" point is at the top where the solid meets the transparent — debt gone.
const arcs = [
  { d: 'M16 4A12 12 0 0 1 24.49 7.51', o: 1 },
  { d: 'M24.49 7.51A12 12 0 0 1 28 16', o: 0.82 },
  { d: 'M28 16A12 12 0 0 1 24.49 24.49', o: 0.65 },
  { d: 'M24.49 24.49A12 12 0 0 1 16 28', o: 0.48 },
  { d: 'M16 28A12 12 0 0 1 7.51 24.49', o: 0.33 },
  { d: 'M7.51 24.49A12 12 0 0 1 4 16', o: 0.2 },
  { d: 'M4 16A12 12 0 0 1 7.51 7.51', o: 0.1 },
  { d: 'M7.51 7.51A12 12 0 0 1 16 4', o: 0.03 },
]

const Logo = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {arcs.map(({ d, o }, i) => (
      <path key={i} d={d} stroke="#2563EB" strokeWidth="3.2" strokeLinecap="round" opacity={o} />
    ))}
    <path
      d="M11 13H21L11 19H21"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default Logo
