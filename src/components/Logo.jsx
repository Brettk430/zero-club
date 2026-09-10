// The mark is the artwork Brett supplied, keyed off its background and
// re-rasterised at each size — not a trace of it. Two earlier attempts to
// redraw the shape missed that it has a counter, so it is used verbatim.
//
//   plain — lime on transparent, for surfaces that are already dark
//   tile  — on its own rounded ground; self-contained, the app-icon reading
//   light — the mark cut in charcoal on off-white, for light surfaces
const SOURCES = {
  plain: '/brand/mark.png',
  tile: '/brand/icons/zero-club-icon-512.png',
  light: '/brand/mark-on-light.png',
  dark: '/brand/mark-dark.png',
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

export default Logo
