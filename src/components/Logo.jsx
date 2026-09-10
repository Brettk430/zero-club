// The mark ships as SVG masters in /public/brand and is rendered from those
// files directly — never redrawn in CSS or approximated with a text "0", per
// the brand package's implementation notes.
//
// variant:
//   tile  — the mark on its own deep rounded square. Self-contained, so it
//           holds up on any background; this is the app-icon reading.
//   plain — lime on transparent, for surfaces that are already deep.
//   light — charcoal on an off-white square, for lime-heavy surfaces.
const SOURCES = {
  tile: '/brand/zero-club-mark-on-deep.svg',
  plain: '/brand/zero-club-mark.svg',
  light: '/brand/zero-club-mark-dark.svg',
}

const Logo = ({ size = 32, variant = 'tile', className = '' }) => (
  <img
    src={SOURCES[variant] ?? SOURCES.tile}
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={`shrink-0 ${className}`}
    style={{ width: size, height: size }}
  />
)

// Mark plus "ZERO CLUB" lockup, for places with room to breathe.
export const Wordmark = ({ height = 40, onDark = false, className = '' }) => (
  <img
    src={onDark ? '/brand/zero-club-wordmark-white.svg' : '/brand/zero-club-wordmark.svg'}
    alt="Zero Club"
    height={height}
    className={className}
    style={{ height, width: 'auto' }}
  />
)

export default Logo
