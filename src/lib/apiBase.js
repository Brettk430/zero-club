// In native Capacitor builds, relative /api/* paths don't resolve.
// Set VITE_API_BASE_URL to your deployed Vercel URL (no trailing slash)
// e.g. https://zero-club.vercel.app
export const apiBase = import.meta.env.VITE_API_BASE_URL || ''
