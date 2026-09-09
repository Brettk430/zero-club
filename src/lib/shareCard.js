// Renders the achievement card people actually post. Canvas rather than an
// image service: it works offline, costs nothing, and never leaks a balance to
// a third party.

const W = 1080
const H = 1920

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export const renderShareCard = ({ amount, remaining, starting, progressPct }) => {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#020617'
  ctx.fillRect(0, 0, W, H)

  // The brand asset, sitting behind everything
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 1100px system-ui, -apple-system, "Helvetica Neue", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('0', W / 2, H / 2)
  ctx.restore()

  ctx.textAlign = 'center'

  ctx.fillStyle = '#64748b'
  ctx.font = '700 34px system-ui, -apple-system, sans-serif'
  ctx.letterSpacing = '10px'
  ctx.fillText('JUST ELIMINATED', W / 2, 620)

  ctx.letterSpacing = '0px'
  ctx.fillStyle = '#34d399'
  ctx.font = '900 190px system-ui, -apple-system, sans-serif'
  ctx.fillText(money(amount), W / 2, 790)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 62px system-ui, -apple-system, sans-serif'
  ctx.fillText(`${money(remaining)}  →  $0`, W / 2, 910)

  // Progress toward zero
  const barW = 720
  const barX = (W - barW) / 2
  const barY = 1010
  ctx.fillStyle = '#1e293b'
  roundRect(ctx, barX, barY, barW, 22, 11)
  ctx.fill()
  const filled = Math.max(progressPct > 0 ? 2 : 0, Math.min(100, progressPct)) / 100
  ctx.fillStyle = '#34d399'
  roundRect(ctx, barX, barY, barW * filled, 22, 11)
  ctx.fill()

  ctx.fillStyle = '#94a3b8'
  ctx.font = '700 40px system-ui, -apple-system, sans-serif'
  ctx.fillText(`${progressPct.toFixed(1)}% closer to ZERO`, W / 2, 1110)

  if (starting > 0) {
    ctx.fillStyle = '#475569'
    ctx.font = '600 30px system-ui, -apple-system, sans-serif'
    ctx.fillText(`Started at ${money(starting)}`, W / 2, 1168)
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 44px system-ui, -apple-system, sans-serif'
  ctx.letterSpacing = '14px'
  ctx.fillText('ZERO CLUB', W / 2, 1540)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = '#475569'
  ctx.font = '600 28px system-ui, -apple-system, sans-serif'
  ctx.fillText('Get to $0. Together.', W / 2, 1596)

  return canvas
}

export const shareText = ({ amount, remaining, progressPct }) =>
  `I just eliminated ${money(amount)} of debt.\n\n${money(remaining)} → $0\n${progressPct.toFixed(1)}% closer to ZERO.\n\n#ZeroClub`

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))

// Native share sheet where it exists (that's the path to Instagram and
// iMessage); a download is the honest fallback everywhere else.
export const shareProgress = async (stats) => {
  const text = shareText(stats)
  const canvas = renderShareCard(stats)
  const blob = await toBlob(canvas)
  const file = blob && new File([blob], 'zero-club.png', { type: 'image/png' })

  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zero-club.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
    return 'downloaded'
  }
  return 'failed'
}
