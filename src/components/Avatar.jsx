// Initials are the default and always the fallback: avatars are opt-in, and a
// broken image URL should never leave a hole where a person is.
const Avatar = ({ url, name, size = 40, className = '' }) => {
  const initial = (name?.[0] || '?').toUpperCase()
  const px = `${size}px`

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
        className={`shrink-0 rounded-full bg-slate-200 object-cover dark:bg-slate-800 ${className}`}
        style={{ width: px, height: px }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-black text-white dark:bg-white dark:text-slate-900 ${className}`}
      style={{ width: px, height: px, fontSize: `${Math.round(size * 0.4)}px` }}
    >
      {initial}
    </span>
  )
}

export default Avatar
