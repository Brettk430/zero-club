import { supabase } from './supabaseClient.js'

const MAX_EDGE = 256
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

// Phone cameras produce multi-megabyte images and a 40px circle needs none of
// it. Downscaling in the browser keeps the upload quick on a phone connection
// and the bucket small, and it strips EXIF — including, on most phones, the
// GPS coordinates the photo was taken at.
const downscale = (file) => new Promise((resolve, reject) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    URL.revokeObjectURL(url)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image'))), 'image/jpeg', 0.85)
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image')) }
  img.src = url
})

export const uploadAvatar = async (userId, file) => {
  if (!supabase || !userId || !file) return { error: 'Not signed in' }
  if (!file.type.startsWith('image/')) return { error: 'Pick an image file.' }
  if (file.size > MAX_SOURCE_BYTES) return { error: 'That image is too large — try one under 12MB.' }

  let blob
  try {
    blob = await downscale(file)
  } catch (err) {
    return { error: err.message }
  }

  // Foldered by owner, which is what the storage policy checks. The timestamp
  // busts any cached copy of the previous one.
  const path = `${userId}/avatar-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) {
    return {
      error: /bucket|not found/i.test(error.message)
        ? 'Photos need a database update that has not been applied yet.'
        : error.message,
    }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: data.publicUrl }
}

// Tidy up whatever the member had before, so the bucket doesn't accumulate
// every photo they've ever tried. Failure here is not worth surfacing.
export const removeOldAvatars = async (userId, keepUrl) => {
  if (!supabase || !userId) return
  const { data } = await supabase.storage.from('avatars').list(userId)
  const stale = (data || [])
    .map((f) => `${userId}/${f.name}`)
    .filter((p) => !keepUrl?.includes(p))
  if (stale.length) await supabase.storage.from('avatars').remove(stale)
}
